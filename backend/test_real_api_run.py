"""
Whisper Court - Real Groq API Live Game & Forensic Measurement Script (Prompt 11).

Executes controlled live games using the actual Groq API (no mocks):
Scenario A: 5 seats (1 human + 4 AI), 1 discussion round -> EXACTLY 16 logical calls
Scenario B: 5 seats (1 human + 4 AI), 2 discussion rounds -> EXACTLY 32 logical calls
Scenario C: 6 seats (1 human + 5 AI), 1 discussion round -> EXACTLY 25 logical calls

Measures:
- logical LLM calls
- network attempts
- model used
- concurrency observed
- successful calls
- retries
- 429 count
- failures
- average latency
- total wall-clock runtime
- input tokens
- output tokens
- whether rate-limit headers were observed
"""

import asyncio
import json
import sys
import time
from models import Agent, GameState
from game_engine import GameEngine
from llm_telemetry import telemetry


def print_metrics(name: str, game_id: str, telem: dict, wall_clock_ms: float, expected_calls: int, expected_speeches: int, expected_trust: int):
    records = telem.get("recent_calls", [])
    models_used = list(set(r.get("model") for r in records if r.get("model")))
    total_network_attempts = len(records)
    headers_seen = telem.get("rate_limit_headers", {})
    has_headers = bool(headers_seen and len(headers_seen) > 0)

    print("\n" + "=" * 65)
    print(f"--- {name} FORENSIC METRICS ---")
    print(f"Game ID:                 {game_id}")
    print(f"Logical LLM calls:       {telem['total_calls']} (expected {expected_calls})")
    print(f"Network attempts:        {total_network_attempts}")
    print(f"Speech calls:            {telem['speech_calls']} (expected {expected_speeches})")
    print(f"Trust calls:             {telem['trust_calls']} (expected {expected_trust})")
    print(f"Vote calls:              {telem['vote_calls']} (expected 0)")
    print(f"Model(s) used:           {models_used}")
    print(f"Max concurrency cap:     4")
    print(f"Successful calls:        {telem.get('successful_calls', telem['total_calls'] - telem['failed_calls'])}")
    print(f"Retry calls:             {telem['retries']}")
    print(f"429 count:               {telem.get('rate_limit_429_calls', 0)}")
    print(f"Failures:                {telem['failed_calls']}")
    print(f"Average latency:         {telem['avg_duration_ms']:.2f} ms")
    print(f"Total wall clock:        {wall_clock_ms:.2f} ms ({wall_clock_ms/1000.0:.2f} s)")
    print(f"Total input tokens:      {telem.get('total_input_tokens', 0)}")
    print(f"Total output tokens:     {telem.get('total_output_tokens', 0)}")
    print(f"Rate limit headers seen: {has_headers}")
    if has_headers:
        print(f"Sample RL headers:       {json.dumps(headers_seen, indent=2)}")
    print("=" * 65 + "\n")


async def run_scenario_a():
    print("\n" + "=" * 65)
    print("SCENARIO A: 1 HUMAN + 4 AI, 1 DISCUSSION ROUND (5 SEATS, REAL GROQ)")
    print("=" * 65)

    engine = GameEngine()
    gs = engine.create_game(num_agents=5, num_humans=1)
    game_id = gs.game_id
    print(f"Created game: {game_id} with seats: {[a.name for a in gs.agents]}")

    t_start = time.perf_counter()
    gs = await GameEngine.run_discussion_round_async(gs)
    wall_clock_ms = (time.perf_counter() - t_start) * 1000.0

    telem = telemetry.get_game_telemetry(game_id)

    # Deterministic voting
    gs.phase = "voting"
    gs.votes[gs.agents[0].id] = gs.agents[1].id
    gs = engine.run_voting_round(gs)
    _ = engine.resolve_votes(gs)

    telem_after = telemetry.get_game_telemetry(game_id)
    assert telem_after["vote_calls"] == 0, "Voting must produce 0 LLM calls"

    print_metrics("SCENARIO A", game_id, telem, wall_clock_ms, 16, 4, 12)
    assert telem["total_calls"] == 16, f"Expected 16 calls for 1 round (4 AI), got {telem['total_calls']}"
    return telem


async def run_scenario_b():
    print("\n" + "=" * 65)
    print("SCENARIO B: 1 HUMAN + 4 AI, 2 DISCUSSION ROUNDS (5 SEATS, REAL GROQ)")
    print("=" * 65)

    engine = GameEngine()
    gs = engine.create_game(num_agents=5, num_humans=1)
    game_id = gs.game_id
    print(f"Created game: {game_id} with seats: {[a.name for a in gs.agents]}")

    t_start = time.perf_counter()

    print("[Round 1 starting]")
    gs = await GameEngine.run_discussion_round_async(gs)

    print("[Round 2 starting]")
    gs.round_number = 2
    gs = await GameEngine.run_discussion_round_async(gs)

    wall_clock_ms = (time.perf_counter() - t_start) * 1000.0
    telem = telemetry.get_game_telemetry(game_id)

    # Deterministic voting
    gs.phase = "voting"
    gs.votes[gs.agents[0].id] = gs.agents[1].id
    gs = engine.run_voting_round(gs)
    _ = engine.resolve_votes(gs)

    telem_after = telemetry.get_game_telemetry(game_id)
    assert telem_after["vote_calls"] == 0, "Voting must produce 0 LLM calls"

    print_metrics("SCENARIO B", game_id, telem, wall_clock_ms, 32, 8, 24)
    assert telem["total_calls"] == 32, f"Expected 32 calls for 2 rounds (4 AI), got {telem['total_calls']}"
    return telem


async def run_scenario_c():
    print("\n" + "=" * 65)
    print("SCENARIO C: 1 HUMAN + 5 AI, 1 DISCUSSION ROUND (6 SEATS, REAL GROQ)")
    print("=" * 65)

    engine = GameEngine()
    gs = engine.create_game(num_agents=6, num_humans=1)
    game_id = gs.game_id
    print(f"Created game: {game_id} with seats: {[a.name for a in gs.agents]}")

    t_start = time.perf_counter()
    gs = await GameEngine.run_discussion_round_async(gs)
    wall_clock_ms = (time.perf_counter() - t_start) * 1000.0

    telem = telemetry.get_game_telemetry(game_id)

    # Deterministic voting
    gs.phase = "voting"
    gs.votes[gs.agents[0].id] = gs.agents[1].id
    gs = engine.run_voting_round(gs)
    _ = engine.resolve_votes(gs)

    telem_after = telemetry.get_game_telemetry(game_id)
    assert telem_after["vote_calls"] == 0, "Voting must produce 0 LLM calls"

    print_metrics("SCENARIO C", game_id, telem, wall_clock_ms, 25, 5, 20)
    assert telem["total_calls"] == 25, f"Expected 25 calls for 1 round (5 AI), got {telem['total_calls']}"
    return telem


async def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target in ("a", "A", "all"):
        await run_scenario_a()
        if target == "all":
            print("Pacing 8 seconds before Scenario B to respect Groq token bucket...")
            await asyncio.sleep(8.0)

    if target in ("b", "B", "all"):
        await run_scenario_b()
        if target == "all":
            print("Pacing 8 seconds before Scenario C to respect Groq token bucket...")
            await asyncio.sleep(8.0)

    if target in ("c", "C", "all"):
        await run_scenario_c()


if __name__ == "__main__":
    asyncio.run(main())
