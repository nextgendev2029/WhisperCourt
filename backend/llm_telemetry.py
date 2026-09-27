"""
Whisper Court - Centralized LLM Call Telemetry & Accounting Layer.

Tracks every LLM call with precise latency, tokens, caller attribution,
retry count, and error state. Provides per-game and per-room audit metrics.
"""

import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Optional, Literal

CallType = Literal["speech", "trust_evaluation", "vote_reasoning", "human_question_response", "other"]

@dataclass
class LLMCallRecord:
    request_id: str
    game_id: str
    room_id: str
    round_number: int
    phase: str
    agent_id: str
    agent_name: str
    call_type: CallType
    trigger: str
    timestamp: float
    duration_ms: float
    success: bool
    model: str = "qwen/qwen3.8-27b"
    logical_call_id: Optional[str] = None
    http_status: Optional[int] = None
    error: Optional[str] = None
    retry_number: int = 0
    estimated_input_tokens: int = 0
    estimated_output_tokens: int = 0
    rate_limit_remaining_tokens: Optional[str] = None
    rate_limit_remaining_requests: Optional[str] = None


@dataclass
class GameTelemetry:
    game_id: str
    room_id: str = ""
    total_llm_calls: int = 0
    speech_calls: int = 0
    trust_calls: int = 0
    vote_calls: int = 0
    question_calls: int = 0
    retry_calls: int = 0
    failed_calls: int = 0
    rate_limit_429_calls: int = 0
    successful_calls: int = 0
    active_requests: int = 0
    total_duration_ms: float = 0.0
    min_duration_ms: float = float("inf")
    max_duration_ms: float = 0.0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    last_rate_limit_headers: dict = field(default_factory=dict)
    records: list[LLMCallRecord] = field(default_factory=list)

    def to_dict(self) -> dict:
        avg_ms = (self.total_duration_ms / self.total_llm_calls) if self.total_llm_calls > 0 else 0.0
        active_model = self.records[-1].model if self.records else "qwen/qwen3.8-27b"
        return {
            "game_id": self.game_id,
            "room_id": self.room_id,
            "model": active_model,
            "total_calls": self.total_llm_calls,
            "total_llm_calls": self.total_llm_calls,
            "network_attempts": len(self.records),
            "speech_calls": self.speech_calls,
            "trust_calls": self.trust_calls,
            "vote_calls": self.vote_calls,
            "question_calls": self.question_calls,
            "retries": self.retry_calls,
            "retry_calls": self.retry_calls,
            "failures": self.failed_calls,
            "failed_calls": self.failed_calls,
            "rate_limit_429_calls": self.rate_limit_429_calls,
            "successful_calls": self.successful_calls,
            "active_requests": self.active_requests,
            "active_llm_requests": self.active_requests,
            "expected_calls": self.speech_calls + self.trust_calls + self.question_calls,
            "avg_duration_ms": round(avg_ms, 2),
            "min_duration_ms": round(self.min_duration_ms, 2) if self.min_duration_ms != float("inf") else 0.0,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "rate_limit_headers": self.last_rate_limit_headers,
            "recent_calls_count": len(self.records),
            "recent_calls": [asdict(r) for r in self.records[-25:]],
        }


    def calculate_expected_calls(self, num_living_ai: int, num_rounds: int, human_questions: int = 0) -> int:
        """
        Derive exact expected LLM calls from court rules:
 - Each living AI speaks once per round: num_living_ai * num_rounds
 - For each statement, every other living AI evaluates trust:
          num_living_ai * (num_living_ai - 1) * num_rounds
 - Each direct human question produces 1 response: human_questions
 - Voting uses deterministic lowest trust: 0 LLM calls
        """
        speeches = num_living_ai * num_rounds
        trust_evals = num_living_ai * max(0, num_living_ai - 1) * num_rounds
        return speeches + trust_evals + human_questions


class TelemetryManager:
    """Singleton centralized accounting manager for LLM invocations."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._games: dict[str, GameTelemetry] = {}
            cls._instance._room_to_game: dict[str, str] = {}
            cls._instance._global_active: int = 0
        return cls._instance

    def get_or_create(self, game_id: str, room_id: str = "") -> GameTelemetry:
        if game_id not in self._games:
            self._games[game_id] = GameTelemetry(game_id=game_id, room_id=room_id)
        if room_id:
            self._room_to_game[room_id] = game_id
            self._games[game_id].room_id = room_id
        return self._games[game_id]

    def increment_active(self, game_id: str, room_id: str = ""):
        self._global_active += 1
        telem = self.get_or_create(game_id, room_id)
        telem.active_requests += 1

    def decrement_active(self, game_id: str, room_id: str = ""):
        self._global_active = max(0, self._global_active - 1)
        telem = self.get_or_create(game_id, room_id)
        telem.active_requests = max(0, telem.active_requests - 1)

    def record_call(self, record: LLMCallRecord):
        telem = self.get_or_create(record.game_id, record.room_id)
        telem.records.append(record)

        if record.retry_number > 0:
            telem.retry_calls += 1
        else:
            telem.total_llm_calls += 1
            if record.call_type == "speech":
                telem.speech_calls += 1
            elif record.call_type == "trust_evaluation":
                telem.trust_calls += 1
            elif record.call_type == "vote_reasoning":
                telem.vote_calls += 1
            elif record.call_type == "human_question_response":
                telem.question_calls += 1

        if record.success:
            telem.successful_calls += 1
        else:
            telem.failed_calls += 1
            if record.http_status == 429:
                telem.rate_limit_429_calls += 1

        if record.duration_ms > 0:
            telem.total_duration_ms += record.duration_ms
            telem.min_duration_ms = min(telem.min_duration_ms, record.duration_ms)
            telem.max_duration_ms = max(telem.max_duration_ms, record.duration_ms)

        telem.total_input_tokens += record.estimated_input_tokens
        telem.total_output_tokens += record.estimated_output_tokens
        if record.rate_limit_remaining_tokens or record.rate_limit_remaining_requests:
            telem.last_rate_limit_headers = {
                "remaining_tokens": record.rate_limit_remaining_tokens,
                "remaining_requests": record.rate_limit_remaining_requests,
            }

        # Structured Console Log
        status_str = f"SUCCESS (HTTP {record.http_status or 200})" if record.success else f"FAILED (HTTP {record.http_status or 'ERR'}): {record.error}"
        print(
            f"[LLM] game={record.game_id[:8]} "
            f"round={record.round_number} "
            f"agent={record.agent_name} "
            f"model={record.model} "
            f"type={record.call_type} "
            f"attempt={record.retry_number + 1} "
            f"duration={record.duration_ms:.0f}ms "
            f"tokens=~{record.estimated_input_tokens}+{record.estimated_output_tokens} "
            f"status={status_str}"
        )

    def get_game_telemetry(self, game_id: str) -> Optional[dict]:
        telem = self._games.get(game_id)
        return telem.to_dict() if telem else None

    def get_room_telemetry(self, room_id: str) -> Optional[dict]:
        game_id = self._room_to_game.get(room_id, room_id)
        return self.get_game_telemetry(game_id)

    def reset(self):
        self._games.clear()
        self._room_to_game.clear()
        self._global_active = 0


# Global singleton export
LLMTelemetry = TelemetryManager
telemetry = TelemetryManager()
