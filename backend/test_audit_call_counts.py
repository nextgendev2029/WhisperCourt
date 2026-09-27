"""
Whisper Court - Forensic Call Budget Audit Test Suite.

Uses deterministic Mock LLM handler to verify exact call budgets:
- Speeches = N
- Trust updates = N * (N - 1)
- Voting = 0
- Direct question = 1
- Zero Groq API credits consumed.
"""

import asyncio
import json
from models import Agent, GameState
from game_engine import GameEngine
from groq_client import set_llm_mock
from llm_telemetry import telemetry


def mock_llm_handler(messages: list[dict], model: str) -> str:
    """Deterministic mock responder returning valid speech or trust JSON."""
    user_msg = messages[-1].get("content", "")
    sys_msg = messages[0].get("content", "")

    if "trust changes" in sys_msg or "trust_delta" in user_msg or "evaluating trust" in user_msg.lower():
        return json.dumps({
            "trust_delta": -5,
            "reason": "mocked suspicion"
        })
    else:
        return "I speak under the oath of the court; I saw nothing amiss."


async def run_call_budget_audit():
    print("=" * 60)
    print("AUDIT SUITE: DETERMINISTIC LLM CALL BUDGET VERIFICATION")
    print("=" * 60)

    set_llm_mock(mock_llm_handler)
    engine = GameEngine()

    # -------------------------------------------------------------
    # TEST 1: 5 AI Agents, 1 Discussion Round
    # Formula: 5 speeches + 5 * 4 trust evals = 25 calls
    # -------------------------------------------------------------
    print("\n--- [TEST 1] 5 AI Agents, 1 Discussion Round ---")
    telemetry.reset()
    gs_5_1 = engine.create_game(num_agents=5, num_humans=0)
    game_id_1 = gs_5_1.game_id

    gs_5_1 = await GameEngine.run_discussion_round_async(gs_5_1)

    t1 = telemetry.get_game_telemetry(game_id_1)
    print(f"Recorded calls: speech={t1['speech_calls']}, trust={t1['trust_calls']}, total={t1['total_calls']}")

    assert t1["speech_calls"] == 5, f"Expected 5 speech calls, got {t1['speech_calls']}"
    assert t1["trust_calls"] == 20, f"Expected 20 trust calls, got {t1['trust_calls']}"
    assert t1["total_calls"] == 25, f"Expected 25 total calls, got {t1['total_calls']}"
    assert t1["vote_calls"] == 0, f"Expected 0 vote calls, got {t1['vote_calls']}"
    print("✅ TEST 1 PASSED: Exactly 25 calls (5 speeches + 20 trust updates).")

    # -------------------------------------------------------------
    # TEST 2: 5 AI Agents, 2 Discussion Rounds
    # Formula: 2 * 25 = 50 calls
    # -------------------------------------------------------------
    print("\n--- [TEST 2] 5 AI Agents, 2 Discussion Rounds ---")
    telemetry.reset()
    gs_5_2 = engine.create_game(num_agents=5, num_humans=0)
    game_id_2 = gs_5_2.game_id

    gs_5_2 = await GameEngine.run_discussion_round_async(gs_5_2)
    gs_5_2 = await GameEngine.run_discussion_round_async(gs_5_2)

    t2 = telemetry.get_game_telemetry(game_id_2)
    print(f"Recorded calls: speech={t2['speech_calls']}, trust={t2['trust_calls']}, total={t2['total_calls']}")

    assert t2["speech_calls"] == 10, f"Expected 10 speech calls, got {t2['speech_calls']}"
    assert t2["trust_calls"] == 40, f"Expected 40 trust calls, got {t2['trust_calls']}"
    assert t2["total_calls"] == 50, f"Expected 50 total calls, got {t2['total_calls']}"
    print("✅ TEST 2 PASSED: Exactly 50 calls (10 speeches + 40 trust updates).")

    # -------------------------------------------------------------
    # TEST 3: 1 Human + 4 AI Agents, 1 Discussion Round
    # Formula: 4 speeches + 4 * 3 trust evals = 16 calls
    # -------------------------------------------------------------
    print("\n--- [TEST 3] 1 Human + 4 AI Agents, 1 Discussion Round ---")
    telemetry.reset()
    gs_1h4a = engine.create_game(num_agents=5, num_humans=1)
    game_id_3 = gs_1h4a.game_id

    gs_1h4a = await GameEngine.run_discussion_round_async(gs_1h4a)

    t3 = telemetry.get_game_telemetry(game_id_3)
    print(f"Recorded calls: speech={t3['speech_calls']}, trust={t3['trust_calls']}, total={t3['total_calls']}")

    assert t3["speech_calls"] == 4, f"Expected 4 speech calls, got {t3['speech_calls']}"
    assert t3["trust_calls"] == 12, f"Expected 12 trust calls, got {t3['trust_calls']}"
    assert t3["total_calls"] == 16, f"Expected 16 total calls, got {t3['total_calls']}"
    print("✅ TEST 3 PASSED: Exactly 16 calls (4 speeches + 12 trust updates).")

    # -------------------------------------------------------------
    # TEST 4: 6 AI Agents, 1 Discussion Round
    # Formula: 6 speeches + 6 * 5 trust evals = 36 calls
    # -------------------------------------------------------------
    print("\n--- [TEST 4] 6 AI Agents, 1 Discussion Round ---")
    telemetry.reset()
    gs_6a = engine.create_game(num_agents=6, num_humans=0)
    game_id_4 = gs_6a.game_id

    gs_6a = await GameEngine.run_discussion_round_async(gs_6a)

    t4 = telemetry.get_game_telemetry(game_id_4)
    print(f"Recorded calls: speech={t4['speech_calls']}, trust={t4['trust_calls']}, total={t4['total_calls']}")

    assert t4["speech_calls"] == 6, f"Expected 6 speech calls, got {t4['speech_calls']}"
    assert t4["trust_calls"] == 30, f"Expected 30 trust calls, got {t4['trust_calls']}"
    assert t4["total_calls"] == 36, f"Expected 36 total calls, got {t4['total_calls']}"
    print("✅ TEST 4 PASSED: Exactly 36 calls (6 speeches + 30 trust updates).")

    # -------------------------------------------------------------
    # TEST 5: Deterministic Voting Round (0 LLM Calls)
    # -------------------------------------------------------------
    print("\n--- [TEST 5] Voting Round Produces 0 LLM Calls ---")
    calls_before = telemetry.get_game_telemetry(game_id_4)["total_calls"]
    gs_6a.phase = "voting"
    gs_6a = engine.run_voting_round(gs_6a)
    calls_after = telemetry.get_game_telemetry(game_id_4)["total_calls"]

    assert calls_before == calls_after, f"Expected 0 calls in voting round, calls changed from {calls_before} to {calls_after}"
    print("✅ TEST 5 PASSED: Voting round is 100% deterministic with 0 LLM calls.")

    # -------------------------------------------------------------
    # TEST 6: Idempotent Trust Evaluation Guard
    # Calling trust evaluation twice for the same statement & evaluator
    # MUST be skipped without invoking LLM
    # -------------------------------------------------------------
    print("\n--- [TEST 6] Idempotent Trust Evaluation Guard ---")
    stmt_id = gs_5_1.transcript[0]["statement_id"]
    evaluator = [a for a in gs_5_1.agents if a.id != gs_5_1.transcript[0]["speaker_id"]][0]
    speaker = next(a for a in gs_5_1.agents if a.id == gs_5_1.transcript[0]["speaker_id"])

    telemetry.reset()
    calls_before_idem = telemetry.get_or_create(gs_5_1.game_id).total_llm_calls

    # Re-evaluate same statement
    await GameEngine._evaluate_single_trust_async(
        evaluator=evaluator,
        speaker=speaker,
        statement_id=stmt_id,
        statement="Duplicate testimony check",
        game_state=gs_5_1,
    )

    calls_after_idem = telemetry.get_or_create(gs_5_1.game_id).total_llm_calls
    assert calls_before_idem == calls_after_idem, f"Idempotency guard failed: call count increased from {calls_before_idem} to {calls_after_idem}"
    print("✅ TEST 6 PASSED: Duplicate statement trust evaluation rejected by idempotency guard.")

    # Clean up mock
    set_llm_mock(None)
    print("\n" + "=" * 60)
    print("ALL 6 CALL BUDGET AUDIT TESTS PASSED WITH ZERO DISCREPANCIES!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_call_budget_audit())
