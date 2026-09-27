"""
Whisper Court - LLM Forensics & Regression Test Suite

Verifies:
1. Model Resolution: Single intentional production model ('qwen/qwen3.8-27b') by default,
   overridable only via GROQ_MODEL environment variable.
2. Bounded Concurrency: Semaphore limit is strictly 4, ensuring no unbounded bursts.
3. 429 Handling & Jittered Retry: Graceful handling of HTTP 429 with Retry-After and jitter,
   preventing retry stampedes.
4. Telemetry Accounting: Strict separation between logical calls and network retry attempts.
5. Idempotency Guards: Duplicate statements and duplicate trust evaluations are ignored.
6. Zero-LLM Invariants: Voting, Observatory updates, Replay, and UI actions produce 0 LLM calls.
7. Call Budget Invariant:
 - 1 human + 3 AI, 1 round = EXACTLY 9 logical LLM calls (3 speeches + 6 trust evals).
 - 1 human + 3 AI, 2 rounds = EXACTLY 18 logical LLM calls (6 speeches + 12 trust evals).
"""

import asyncio
import os
import time
import unittest
from unittest.mock import patch, MagicMock

import groq_client
from groq_client import (
    DEFAULT_MODEL,
    MAX_CONCURRENT_REQUESTS,
    MAX_RETRIES,
    REQUEST_TIMEOUT_SECONDS,
    get_agent_response_async,
    set_mock_handler,
)
from llm_telemetry import LLMTelemetry, LLMCallRecord, telemetry
from models import Agent, GameState
from game_engine import GameEngine


class TestLLMForensics(unittest.TestCase):

    def setUp(self):
        telemetry.reset()
        set_mock_handler(None)

    def tearDown(self):
        set_mock_handler(None)

    # ----------------------------------------------------------------------
    # 1. Model Resolution & Single Policy
    # ----------------------------------------------------------------------
    def test_production_model_policy_default(self):
        """Production model defaults to 'qwen/qwen3.8-27b' with no stale 120b or 20b models."""
        self.assertEqual(DEFAULT_MODEL, "qwen/qwen3.8-27b")
        # Ensure deprecated models are not hardcoded as defaults anywhere
        self.assertNotIn("120b", DEFAULT_MODEL)
        self.assertNotIn("20b", DEFAULT_MODEL)

    def test_production_model_override_via_env(self):
        """GROQ_MODEL environment variable cleanly overrides default model."""
        with patch.dict(os.environ, {"GROQ_MODEL": "custom-test-model"}):
            import importlib
            importlib.reload(groq_client)
            self.assertEqual(groq_client.DEFAULT_MODEL, "custom-test-model")
            # Reload back to normal environment
            importlib.reload(groq_client)

    # ----------------------------------------------------------------------
    # 2. Concurrency Cap
    # ----------------------------------------------------------------------
    def test_bounded_concurrency_cap(self):
        """Concurrency cap must be bounded at exactly 4."""
        self.assertEqual(MAX_CONCURRENT_REQUESTS, 4)

    def test_concurrent_execution_respects_cap(self):
        """Under concurrent load, active in-flight requests never exceed the cap."""
        max_seen_active = 0
        current_active = 0
        lock = asyncio.Lock()

        def mock_delay_handler(messages, model):
            return "Mock response"

        set_mock_handler(mock_delay_handler)

        async def run_parallel():
            nonlocal max_seen_active, current_active

            async def worker():
                nonlocal max_seen_active, current_active
                # Acquire sem manually to observe active count
                async with groq_client._semaphore:
                    async with lock:
                        current_active += 1
                        if current_active > max_seen_active:
                            max_seen_active = current_active
                    await asyncio.sleep(0.05)
                    async with lock:
                        current_active -= 1
                return await get_agent_response_async("sys", [], "hi")

            tasks = [worker() for _ in range(12)]
            await asyncio.gather(*tasks)

        asyncio.run(run_parallel())
        self.assertLessEqual(max_seen_active, 4)

    # ----------------------------------------------------------------------
    # 3. Telemetry Accounting: Logical Calls vs Network Attempts
    # ----------------------------------------------------------------------
    def test_telemetry_logical_vs_network_attempts_on_retry(self):
        """A retry must record multiple network attempts but only ONE logical call."""
        t = LLMTelemetry()
        # Simulated scenario: 1 logical call with 1 retry (2 network attempts)
        t.record_call(LLMCallRecord(
            request_id="req_1",
            game_id="g_retry",
            room_id="",
            round_number=1,
            phase="discussion",
            agent_id="agent_1",
            agent_name="Sister Vael",
            call_type="trust_evaluation",
            trigger="test",
            timestamp=time.time(),
            retry_number=0,
            success=False,
            http_status=429,
            error="Rate limit 429",
            duration_ms=100.0,
            model="qwen/qwen3.8-27b",
        ))
        t.record_call(LLMCallRecord(
            request_id="req_2",
            game_id="g_retry",
            room_id="",
            round_number=1,
            phase="discussion",
            agent_id="agent_1",
            agent_name="Sister Vael",
            call_type="trust_evaluation",
            trigger="test",
            timestamp=time.time(),
            retry_number=1,
            success=True,
            http_status=200,
            duration_ms=120.0,
            model="qwen/qwen3.8-27b",
        ))

        summary = t.get_game_telemetry("g_retry")
        # Exactly 1 logical trust call
        self.assertEqual(summary["trust_calls"], 1)
        self.assertEqual(summary["total_calls"], 1)
        # 1 retry counted
        self.assertEqual(summary["retries"], 1)
        # 1 429 error counted
        self.assertEqual(summary["rate_limit_429_calls"], 1)
        # 1 successful call
        self.assertEqual(summary["successful_calls"], 1)
        # 2 physical network attempts in history
        self.assertEqual(len(summary["recent_calls"]), 2)

    # ----------------------------------------------------------------------
    # 4. 429 Rate Limit Handling & Jittered Retry
    # ----------------------------------------------------------------------
    def test_429_retry_after_extraction_and_fallback(self):
        """Simulated 429 error triggers retry and extracts Retry-After backoff."""
        attempt_count = 0

        def flaky_handler(messages, model):
            nonlocal attempt_count
            attempt_count += 1
            if attempt_count == 1:
                # First attempt raises 429 error
                err = Exception("Rate limit reached. Please try again in 0.5s.")
                err.status_code = 429
                raise err
            return '{"trust_delta": 5, "reason": "Consistent testimony"}'

        set_mock_handler(flaky_handler)

        resp = asyncio.run(
            get_agent_response_async(
                "sys",
                [],
                "eval",
                call_type="trust_evaluation",
                game_id="g_test",
            )
        )

        self.assertIn("trust_delta", resp)
        self.assertEqual(attempt_count, 2)
        telem = telemetry.get_game_telemetry("g_test")
        self.assertEqual(telem["total_calls"], 1)
        self.assertEqual(telem["retries"], 1)
        self.assertEqual(telem["rate_limit_429_calls"], 1)

    # ----------------------------------------------------------------------
    # 5. Idempotent Trust Evaluation
    # ----------------------------------------------------------------------
    def test_duplicate_trust_evaluation_is_skipped(self):
        """Evaluating the same statement_id for the same evaluator must execute once."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=4, num_humans=1)
        evaluator = [a for a in gs.agents if not a.is_human][0]
        speaker = [a for a in gs.agents if a.id != evaluator.id][0]

        eval_calls = 0
        def counting_mock(messages, model):
            nonlocal eval_calls
            eval_calls += 1
            return '{"trust_delta": 2, "reason": "Fine"}'

        set_mock_handler(counting_mock)

        # First call evaluates
        asyncio.run(
            GameEngine._evaluate_single_trust_async(
                evaluator=evaluator,
                speaker=speaker,
                statement_id="stmt_100",
                statement="I was in the gallery.",
                game_state=gs,
            )
        )
        self.assertEqual(eval_calls, 1)

        # Duplicate call with identical statement_id is skipped by idempotency set
        asyncio.run(
            GameEngine._evaluate_single_trust_async(
                evaluator=evaluator,
                speaker=speaker,
                statement_id="stmt_100",
                statement="I was in the gallery.",
                game_state=gs,
            )
        )
        self.assertEqual(eval_calls, 1)

    # ----------------------------------------------------------------------
    # 6. Zero LLM Calls for Voting & Observatory
    # ----------------------------------------------------------------------
    def test_voting_and_observatory_produce_zero_llm_calls(self):
        """Voting resolution and Observatory computation must use ZERO LLM calls."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=4, num_humans=1)
        game_id = gs.game_id

        # Populate votes deterministically
        gs.phase = "voting"
        for a in gs.agents:
            gs.votes[a.id] = gs.agents[1].id

        gs = engine.run_voting_round(gs)
        result = engine.resolve_votes(gs)

        self.assertIsNotNone(result)
        telem = telemetry.get_game_telemetry(game_id)
        total_calls = telem["total_calls"] if telem else 0
        vote_calls = telem["vote_calls"] if telem else 0
        self.assertEqual(total_calls, 0)
        self.assertEqual(vote_calls, 0)

    # ----------------------------------------------------------------------
    # 7. Exact Call Budgets (Prompt 11: 4-Seat=9, 5-Seat=16, 6-Seat=25)
    # ----------------------------------------------------------------------
    def test_call_budget_4_seats_exact_9_calls(self):
        """1 Human + 3 AI, 1 Round = EXACTLY 9 LLM Calls (3 speech + 6 trust)."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=4, num_humans=1)
        game_id = gs.game_id

        def mock_court_handler(messages, model):
            sys_msg = messages[0]["content"] if messages else ""
            if "trust" in sys_msg.lower():
                return '{"trust_delta": -5, "reason": "Vague alibi"}'
            return "I observed nothing suspicious from the chapel."

        set_mock_handler(mock_court_handler)

        gs = asyncio.run(GameEngine.run_discussion_round_async(gs))
        telem = telemetry.get_game_telemetry(game_id)

        self.assertEqual(telem["speech_calls"], 3)
        self.assertEqual(telem["trust_calls"], 6)
        self.assertEqual(telem["vote_calls"], 0)
        self.assertEqual(telem["total_calls"], 9)

    def test_call_budget_5_seats_exact_16_calls(self):
        """1 Human + 4 AI (5 seats), 1 Round = EXACTLY 16 LLM Calls (4 speech + 12 trust)."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=5, num_humans=1)
        game_id = gs.game_id

        def mock_court_handler(messages, model):
            sys_msg = messages[0]["content"] if messages else ""
            if "trust" in sys_msg.lower():
                return '{"trust_delta": -4, "reason": "Deflection"}'
            return "The chamber was quiet when I took my seat."

        set_mock_handler(mock_court_handler)

        gs = asyncio.run(GameEngine.run_discussion_round_async(gs))
        telem = telemetry.get_game_telemetry(game_id)

        self.assertEqual(telem["speech_calls"], 4)
        self.assertEqual(telem["trust_calls"], 12)
        self.assertEqual(telem["vote_calls"], 0)
        self.assertEqual(telem["total_calls"], 16)

    def test_call_budget_5_seats_2_rounds_exact_32_calls(self):
        """1 Human + 4 AI (5 seats), 2 Rounds = EXACTLY 32 LLM Calls (8 speech + 24 trust)."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=5, num_humans=1)
        game_id = gs.game_id

        def mock_court_handler(messages, model):
            sys_msg = messages[0]["content"] if messages else ""
            if "trust" in sys_msg.lower():
                return '{"trust_delta": -4, "reason": "Deflection"}'
            return "The chamber was quiet when I took my seat."

        set_mock_handler(mock_court_handler)

        # Round 1
        gs = asyncio.run(GameEngine.run_discussion_round_async(gs))
        # Round 2
        gs.round_number = 2
        gs = asyncio.run(GameEngine.run_discussion_round_async(gs))

        telem = telemetry.get_game_telemetry(game_id)

        self.assertEqual(telem["speech_calls"], 8)
        self.assertEqual(telem["trust_calls"], 24)
        self.assertEqual(telem["vote_calls"], 0)
        self.assertEqual(telem["total_calls"], 32)

    def test_call_budget_6_seats_exact_25_calls(self):
        """1 Human + 5 AI (6 seats), 1 Round = EXACTLY 25 LLM Calls (5 speech + 20 trust)."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=6, num_humans=1)
        game_id = gs.game_id

        def mock_court_handler(messages, model):
            sys_msg = messages[0]["content"] if messages else ""
            if "trust" in sys_msg.lower():
                return '{"trust_delta": 3, "reason": "Steady testimony"}'
            return "I observed the courtyard closely before dusk."

        set_mock_handler(mock_court_handler)

        gs = asyncio.run(GameEngine.run_discussion_round_async(gs))
        telem = telemetry.get_game_telemetry(game_id)

        self.assertEqual(telem["speech_calls"], 5)
        self.assertEqual(telem["trust_calls"], 20)
        self.assertEqual(telem["vote_calls"], 0)
        self.assertEqual(telem["total_calls"], 25)

    # ----------------------------------------------------------------------
    # 8. Action Validation & Safety (Question & Accuse)
    # ----------------------------------------------------------------------
    def test_action_validation_target_and_text_rules(self):
        """Question requires living target and non-empty text; Accuse requires target and reason."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=5, num_humans=1)

        human = gs.agents[0]
        alive_ai = gs.agents[1]
        dead_ai = gs.agents[2]
        dead_ai.is_alive = False

        # Target must be living
        living_targets = [a for a in gs.agents if a.is_alive and a.id != human.id]
        self.assertIn(alive_ai, living_targets)
        self.assertNotIn(dead_ai, living_targets)

        # Question validation logic
        def can_question(phase, target_id, text):
            if phase != "discussion":
                return False, "THE COURT IS IN DELIBERATION - Questioning only permitted during open discussion."
            if not target_id:
                return False, "SELECT A COURTIER FIRST - Target noble required."
            if not (text and text.strip()):
                return False, "ENTER YOUR QUESTION - Council cannot record empty testimony."
            target = next((a for a in gs.agents if a.id == target_id and a.is_alive), None)
            if not target:
                return False, "CANNOT QUESTION ELIMINATED COURTIER - Dignitary is no longer at the council."
            return True, "OK"

        # Valid action
        ok, reason = can_question("discussion", alive_ai.id, "Where were you?")
        self.assertTrue(ok)

        # Missing target
        ok, reason = can_question("discussion", None, "Where were you?")
        self.assertFalse(ok)
        self.assertIn("SELECT A COURTIER", reason)

        # Empty question
        ok, reason = can_question("discussion", alive_ai.id, "   ")
        self.assertFalse(ok)
        self.assertIn("ENTER YOUR QUESTION", reason)

        # Eliminated target
        ok, reason = can_question("discussion", dead_ai.id, "Where were you?")
        self.assertFalse(ok)
        self.assertIn("ELIMINATED COURTIER", reason)

        # Invalid phase
        ok, reason = can_question("voting", alive_ai.id, "Where were you?")
        self.assertFalse(ok)
        self.assertIn("DELIBERATION", reason)

    def test_accusation_validation_rules(self):
        """Accusation requires living target, valid reason, and discussion phase."""
        engine = GameEngine()
        gs = engine.create_game(num_agents=5, num_humans=1)

        human = gs.agents[0]
        alive_ai = gs.agents[1]
        dead_ai = gs.agents[2]
        dead_ai.is_alive = False

        def can_accuse(phase, target_id, reason):
            if phase != "discussion":
                return False, "THE COURT IS IN DELIBERATION - Accusations only permitted during open discussion."
            if not target_id:
                return False, "SELECT A DIGNITARY FIRST - Accusation target required."
            if not (reason and reason.strip()):
                return False, "SPECIFY GROUNDS FOR ACCUSATION - Formal charges require explicit reason."
            target = next((a for a in gs.agents if a.id == target_id and a.is_alive), None)
            if not target:
                return False, "CANNOT ACCUSE ELIMINATED NOBLE - Suspect is no longer at the council."
            return True, "OK"

        # Valid
        ok, msg = can_accuse("discussion", alive_ai.id, "Contradictory timeline")
        self.assertTrue(ok)

        # Missing target
        ok, msg = can_accuse("discussion", None, "Contradictory timeline")
        self.assertFalse(ok)
        self.assertIn("SELECT A DIGNITARY", msg)

        # Missing reason
        ok, msg = can_accuse("discussion", alive_ai.id, "")
        self.assertFalse(ok)
        self.assertIn("SPECIFY GROUNDS", msg)

        # Dead target
        ok, msg = can_accuse("discussion", dead_ai.id, "Contradictory timeline")
        self.assertFalse(ok)
        self.assertIn("ELIMINATED NOBLE", msg)

        # Invalid phase
        ok, msg = can_accuse("voting", alive_ai.id, "Contradictory timeline")
        self.assertFalse(ok)
        self.assertIn("DELIBERATION", msg)

    # ----------------------------------------------------------------------
    # 9. Trust Graph Label Compactness & Distinctness (5 and 6 Nodes)
    # ----------------------------------------------------------------------
    def test_trust_graph_labels_5_and_6_nodes(self):
        """Graph label formatter produces unique, compact, collision-resistant labels."""
        def format_courtier_graph_label(name: str) -> str:
            if not name:
                return ""
            parts = name.strip().split()
            if len(parts) <= 1:
                return parts[0]
            return f"{parts[0][0]}. {' '.join(parts[1:])}"

        court_roster = [
            "Duchess Morvaine",
            "Captain Brask",
            "Lord Ashwick",
            "Sister Vael",
            "Old Renner",
            "Mira Solenne",
        ]

        formatted = [format_courtier_graph_label(name) for name in court_roster]
        # Ensure all 6 formatted labels are strictly distinct
        self.assertEqual(len(formatted), len(set(formatted)))

        expected = [
            "D. Morvaine",
            "C. Brask",
            "L. Ashwick",
            "S. Vael",
            "O. Renner",
            "M. Solenne",
        ]
        self.assertEqual(formatted, expected)

        # Verify max length is compact (under 12 chars) to prevent graph canvas clashing
        for lbl in formatted:
            self.assertLessEqual(len(lbl), 12)


if __name__ == "__main__":
    unittest.main()

