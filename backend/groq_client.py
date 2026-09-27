"""
Whisper Court - Instrumented Groq API Client Wrapper.

Features:
- Centralized instrumentation via llm_telemetry.py
- Bounded concurrency via Semaphore (MAX_CONCURRENT_LLM_CALLS = 4)
- Request-level timeouts (REQUEST_TIMEOUT_SECONDS = 18.0)
- Bounded retries (MAX_RETRIES = 2) with backoff
- 429 rate limit & timeout resilience with safe fallbacks
- Mock mode support for zero-cost automated testing
"""

import os
import time
import uuid
import asyncio
import random
import re
from typing import Optional, Callable
from dotenv import load_dotenv
from groq import Groq

from llm_telemetry import telemetry, LLMCallRecord, CallType

# ---------------------------------------------------------------------------
# Configuration & Limits
# ---------------------------------------------------------------------------
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

_api_key = os.getenv("GROQ_API_KEY")
_client: Optional[Groq] = Groq(api_key=_api_key) if _api_key else None

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

DEFAULT_TEMPERATURE = 0.9
FALLBACK_RESPONSE = "[Agent hesitates and says nothing.]"
MAX_CONCURRENT_LLM_CALLS = 4
MAX_CONCURRENT_REQUESTS = MAX_CONCURRENT_LLM_CALLS
REQUEST_TIMEOUT_SECONDS = 18.0
MAX_RETRIES = 2

# Global Concurrency Limiter
_semaphore = asyncio.Semaphore(MAX_CONCURRENT_LLM_CALLS)

# Optional mock hook for automated tests
_mock_handler: Optional[Callable] = None


def set_llm_mock(handler: Optional[Callable]):
    """Set a mock handler for testing without calling the real Groq API.
    Handler signature: handler(messages: list[dict], model: str) -> str
    """
    global _mock_handler
    _mock_handler = handler


set_mock_handler = set_llm_mock


def _estimate_tokens(text: str) -> int:
    return max(1, int(len(text.split()) * 1.33))


async def get_agent_response_async(
    system_prompt: str,
    conversation_history: list[dict],
    user_message: str,
    *,
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = 256,
    game_id: str = "global",
    room_id: str = "",
    round_number: int = 1,
    phase: str = "discussion",
    agent_id: str = "unknown",
    agent_name: str = "unknown",
    call_type: CallType = "other",
    trigger: str = "",
) -> str:
    """Async chat completion with bounded concurrency, retry, timeout, and telemetry."""

    messages = [
        {"role": "system", "content": system_prompt},
        *conversation_history,
        {"role": "user", "content": user_message},
    ]

    total_input_chars = sum(len(m.get("content", "")) for m in messages)
    est_input_tokens = _estimate_tokens(str(total_input_chars))

    logical_id = f"log_{uuid.uuid4().hex[:8]}"
    last_error: Optional[Exception] = None

    for attempt in range(MAX_RETRIES + 1):
        req_id = f"req_{uuid.uuid4().hex[:8]}"
        t_start = time.perf_counter()

        telemetry.increment_active(game_id, room_id)

        try:
            rate_limit_rem_tokens = None
            rate_limit_rem_reqs = None

            async with _semaphore:
                if _mock_handler is not None:
                    # Deterministic mock response for testing
                    reply_text = _mock_handler(messages, model)
                    est_output_tokens = _estimate_tokens(reply_text)
                else:
                    if _client is None:
                        raise RuntimeError("GROQ_API_KEY is not configured in backend/.env")

                    # Run sync Groq client call in thread with strict timeout
                    def _call_groq():
                        if hasattr(_client.chat.completions, "with_raw_response"):
                            raw = _client.chat.completions.with_raw_response.create(
                                model=model,
                                messages=messages,
                                temperature=temperature,
                                max_tokens=max_tokens,
                            )
                            return raw.parse(), dict(raw.headers)
                        else:
                            return _client.chat.completions.create(
                                model=model,
                                messages=messages,
                                temperature=temperature,
                                max_tokens=max_tokens,
                            ), {}

                    completion, resp_headers = await asyncio.wait_for(
                        asyncio.to_thread(_call_groq),
                        timeout=REQUEST_TIMEOUT_SECONDS,
                    )

                    reply_text = completion.choices[0].message.content or FALLBACK_RESPONSE

                    # Extract actual token usage if provided by API
                    if getattr(completion, "usage", None):
                        est_input_tokens = getattr(completion.usage, "prompt_tokens", est_input_tokens)
                        est_output_tokens = getattr(completion.usage, "completion_tokens", _estimate_tokens(reply_text))
                    else:
                        est_output_tokens = _estimate_tokens(reply_text)

                    rate_limit_rem_tokens = resp_headers.get("x-ratelimit-remaining-tokens")
                    rate_limit_rem_reqs = resp_headers.get("x-ratelimit-remaining-requests")

            duration_ms = (time.perf_counter() - t_start) * 1000.0

            telemetry.record_call(
                LLMCallRecord(
                    request_id=req_id,
                    logical_call_id=logical_id,
                    game_id=game_id,
                    room_id=room_id,
                    round_number=round_number,
                    phase=phase,
                    agent_id=agent_id,
                    agent_name=agent_name,
                    call_type=call_type,
                    trigger=trigger,
                    timestamp=time.time(),
                    duration_ms=duration_ms,
                    success=True,
                    model=model,
                    http_status=200,
                    error=None,
                    retry_number=attempt,
                    estimated_input_tokens=est_input_tokens,
                    estimated_output_tokens=est_output_tokens,
                    rate_limit_remaining_tokens=rate_limit_rem_tokens,
                    rate_limit_remaining_requests=rate_limit_rem_reqs,
                )
            )

            return reply_text

        except Exception as exc:
            duration_ms = (time.perf_counter() - t_start) * 1000.0
            last_error = exc

            # Identify HTTP status code
            http_status = getattr(exc, "status_code", None)
            err_rem_tokens = None
            err_rem_reqs = None
            if hasattr(exc, "response") and hasattr(exc.response, "headers"):
                err_rem_tokens = exc.response.headers.get("x-ratelimit-remaining-tokens")
                err_rem_reqs = exc.response.headers.get("x-ratelimit-remaining-requests")

            if http_status is None:
                if hasattr(exc, "response") and hasattr(exc.response, "status_code"):
                    http_status = exc.response.status_code
                elif "429" in str(exc) or "rate limit" in str(exc).lower():
                    http_status = 429
                elif isinstance(exc, asyncio.TimeoutError):
                    http_status = 408
                else:
                    http_status = 500

            telemetry.record_call(
                LLMCallRecord(
                    request_id=req_id,
                    logical_call_id=logical_id,
                    game_id=game_id,
                    room_id=room_id,
                    round_number=round_number,
                    phase=phase,
                    agent_id=agent_id,
                    agent_name=agent_name,
                    call_type=call_type,
                    trigger=trigger,
                    timestamp=time.time(),
                    duration_ms=duration_ms,
                    success=False,
                    model=model,
                    http_status=http_status,
                    error=str(exc),
                    retry_number=attempt,
                    estimated_input_tokens=est_input_tokens,
                    estimated_output_tokens=0,
                    rate_limit_remaining_tokens=err_rem_tokens,
                    rate_limit_remaining_requests=err_rem_reqs,
                )
            )

            if attempt < MAX_RETRIES:
                retry_after = None
                if hasattr(exc, "response") and hasattr(exc.response, "headers"):
                    ra = exc.response.headers.get("retry-after")
                    if ra:
                        try:
                            retry_after = float(ra)
                        except (ValueError, TypeError):
                            pass
                if retry_after is None:
                    m = re.search(r"try again in ([0-9]+(?:\.[0-9]+)?)s", str(exc), re.IGNORECASE)
                    if m:
                        try:
                            retry_after = float(m.group(1))
                        except (ValueError, TypeError):
                            pass

                if retry_after is not None:
                    backoff_delay = retry_after + random.uniform(0.1, 0.4)
                elif http_status == 429:
                    backoff_delay = (2.0 * (2 ** attempt)) + random.uniform(0.1, 0.4)
                else:
                    backoff_delay = (1.0 * (2 ** attempt)) + random.uniform(0.05, 0.2)

                print(f"[groq_client] Attempt {attempt + 1}/{MAX_RETRIES + 1} failed (HTTP {http_status}: {exc}). Retrying in {backoff_delay:.2f}s...")
                await asyncio.sleep(backoff_delay)

        finally:
            telemetry.decrement_active(game_id, room_id)

    print(f"[groq_client] All {MAX_RETRIES + 1} attempts failed. Last error: {last_error}")
    return FALLBACK_RESPONSE


def get_agent_response(
    system_prompt: str,
    conversation_history: list[dict],
    user_message: str,
    *,
    model: str = DEFAULT_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = 1024,
    game_id: str = "global",
    room_id: str = "",
    round_number: int = 1,
    phase: str = "discussion",
    agent_id: str = "unknown",
    agent_name: str = "unknown",
    call_type: CallType = "other",
    trigger: str = "",
) -> str:
    """Synchronous wrapper for legacy callers."""
    try:
        loop = asyncio.get_running_loop()
        # If already in an event loop, run in a separate thread to prevent blocking
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            return pool.submit(
                asyncio.run,
                get_agent_response_async(
                    system_prompt,
                    conversation_history,
                    user_message,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    game_id=game_id,
                    room_id=room_id,
                    round_number=round_number,
                    phase=phase,
                    agent_id=agent_id,
                    agent_name=agent_name,
                    call_type=call_type,
                    trigger=trigger,
                ),
            ).result()
    except RuntimeError:
        # No running loop in current thread
        return asyncio.run(
            get_agent_response_async(
                system_prompt,
                conversation_history,
                user_message,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                game_id=game_id,
                room_id=room_id,
                round_number=round_number,
                phase=phase,
                agent_id=agent_id,
                agent_name=agent_name,
                call_type=call_type,
                trigger=trigger,
            )
        )


if __name__ == "__main__":
    print("Testing instrumented Groq client …\n")
    reply = get_agent_response(
        system_prompt="You are an inquisitor in a royal courtroom. Speak in one short dramatic line.",
        conversation_history=[],
        user_message="State your name and allegiance.",
        game_id="smoke_test",
        call_type="speech",
    )
    print(f"Reply: {reply}")
    print("\nTelemetry recorded:", telemetry.get_game_telemetry("smoke_test"))
