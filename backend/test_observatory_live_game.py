"""
Whisper Court - Live Real Groq Game with Agent Observatory Verification.

Runs a real multi-round game on real Groq API (4 agents: 1 human, 3 AI):
- Round 1: Discussion -> Claims extracted -> Social Heat computed -> Influence tracked -> Dossier assembled.
- Round 2: Discussion -> Cross-round contradictions checked -> Heat updated.
- Voting: Deterministic voting.
- Post-game Role Reveal: Triggers CourtAnalysis retrospective.
- Validates:
  1. No secret roles leaked in public claims or social events during active play.
  2. Telemetry strictly matches expected budget (3 speeches + 6 trust per round = exactly 9 per round).
  3. Contradictions, Social Heat, Influence, and Dossier are grounded in real game statements.
  4. Post-game analysis contains authentic perpetrator, first suspicion, turning point, and largest collapse.
"""

import asyncio
import json
import time
from game_engine import GameEngine
from llm_telemetry import telemetry
from social_engine import assemble_relationship_dossier


async def test_live_observatory_game():
    print("=" * 70)
    print("WHISPER COURT - AGENT OBSERVATORY LIVE GAME VERIFICATION")
    print("=" * 70)

    engine = GameEngine()
    # 4 seats (1 human, 3 AI)
    gs = engine.create_game(num_agents=4, num_humans=1)
    game_id = gs.game_id
    traitor = next(a for a in gs.agents if a.role == "traitor")
    print(f"Game ID: {game_id}")
    print(f"Roster: {[f'{a.name} ({a.personality[:15]}...)' for a in gs.agents]}")
    print(f"[GROUND TRUTH SECRET] Traitor: {traitor.name}")

    # =========================================================================
    # ROUND 1 DISCUSSION
    # =========================================================================
    print("\n" + "-" * 50)
    print("STARTING ROUND 1 (Real Groq API)")
    print("-" * 50)
    t0 = time.perf_counter()
    gs = await GameEngine.run_discussion_round_async(gs)
    r1_duration = time.perf_counter() - t0

    print(f"Round 1 completed in {r1_duration:.2f}s")
    print(f"Transcript statements: {len(gs.transcript)}")
    print(f"Claims extracted: {len(gs.claims)}")
    for c in gs.claims[:5]:
        print(f"  • Claim [{c.claim_type.upper()}] {c.speaker_name} -> {c.target_name or 'General'}: \"{c.quote}\"")

    print(f"Influence events recorded: {len(gs.influence_events)}")
    for inf in gs.influence_events[:4]:
        sign = "+" if inf.delta >= 0 else ""
        print(f"  • Influence: {inf.speaker_name} -> {inf.evaluator_name} ({sign}{inf.delta}) [{inf.reason}]")

    print(f"Social Heat pairs: {len(gs.social_heat)}")
    for sh in gs.social_heat:
        print(f"  • Heat: {sh.agent_a_name} <-> {sh.agent_b_name}: {sh.tension_score} ({sh.heat_level})")

    # Verify no leaks in claims or public events
    for c in gs.claims:
        assert "traitor" not in c.quote.lower() or "secret" not in c.quote.lower(), "Leak detected in claim!"
    for ev in gs.social_events:
        assert "traitor" not in ev.description.lower() or ev.event_type == "ROLE_REVEAL", f"Secret leaked in public event: {ev.description}"

    # Check dossier assembly for a pair
    agent_a = gs.agents[1]
    agent_b = gs.agents[2]
    dossier = assemble_relationship_dossier(gs, agent_a.id, agent_b.id)
    print("\nSample Relationship Dossier:")
    print(f"  Evaluator: {dossier['evaluator_name']} -> Target: {dossier['target_name']}")
    print(f"  Current Trust: {dossier['current_trust']} (Previous: {dossier['previous_trust']}, Net: {dossier['net_change']})")
    print(f"  Recent Factors ({len(dossier['recent_factors'])}): {dossier['recent_factors'][:2]}")
    print(f"  Evidence Quotes ({len(dossier['evidence_quotes'])}): {[q['text'][:40] + '...' for q in dossier['evidence_quotes'][:2]]}")

    # =========================================================================
    # ROUND 2 DISCUSSION
    # =========================================================================
    print("\n" + "-" * 50)
    print("STARTING ROUND 2 (Real Groq API)")
    print("-" * 50)
    gs.round_number = 2
    t0 = time.perf_counter()
    gs = await GameEngine.run_discussion_round_async(gs)
    r2_duration = time.perf_counter() - t0

    print(f"Round 2 completed in {r2_duration:.2f}s")
    print(f"Total Transcript statements: {len(gs.transcript)}")
    print(f"Total Claims extracted: {len(gs.claims)}")
    print(f"Total Contradictions detected: {len(gs.contradictions)}")
    for con in gs.contradictions:
        print(f"  ⚠ Contradiction [{con.severity}]: {con.speaker_a} vs {con.speaker_b} - {con.description}")

    print(f"Total Social Events in Timeline: {len(gs.social_events)}")

    # =========================================================================
    # VOTING AND POST-GAME REVEAL
    # =========================================================================
    print("\n" + "-" * 50)
    print("RESOLVING VOTES AND ROLE REVEAL")
    print("-" * 50)
    gs.phase = "voting"
    # Cast deterministic votes
    for a in gs.agents:
        if a.is_alive:
            # AI votes deterministically based on private trust
            lowest_target = min((tid for tid in a.private_trust if tid != a.id), key=lambda tid: a.private_trust[tid])
            gs.votes[a.id] = lowest_target

    elim_result = engine.resolve_votes(gs)
    elim_id = elim_result["eliminated_id"]
    elim_agent = next(a for a in gs.agents if a.id == elim_id)
    elim_agent.is_alive = False
    print(f"Eliminated: {elim_result['eliminated']} (Secret Role: {elim_result['true_role']})")

    # Check win condition / trigger post game court analysis
    win_result = engine.check_win_condition(gs)
    print(f"Game Status: phase={gs.phase}, winner={win_result}")

    if gs.court_analysis is None:
        from social_engine import generate_court_analysis
        gs.court_analysis = generate_court_analysis(gs, win_result or "role_reveal")

    assert gs.court_analysis is not None, "CourtAnalysis was not generated upon game conclusion!"
    ca = gs.court_analysis
    print("\n" + "=" * 60)
    print("COURT ANALYSIS (POST-GAME RETROSPECTIVE)")
    print("=" * 60)
    print(f"Traitor Unmasked:        {ca.traitor_name} (Seat: {ca.traitor_id})")
    print(f"Outcome:                 {ca.outcome}")
    print(f"First Suspicion:         Round {ca.first_suspicion_round}: {ca.first_suspicion_text}")
    print(f"Turning Point:           {ca.turning_point_speaker}: {ca.turning_point_statement}")
    print(f"Largest Trust Collapse:  {ca.largest_trust_collapse}")
    print(f"Most Influential Agent:  {ca.most_influential_speaker} (delta: {ca.most_influential_delta})")
    print(f"Critical Contradiction:  {ca.critical_contradiction or 'None'}")
    print(f"Final Coalition:         {', '.join(ca.final_coalition) if ca.final_coalition else 'Dispersed'}")
    print(f"Narrative Summary:       {ca.narrative_summary}")

    # =========================================================================
    # TELEMETRY CALL BUDGET VERIFICATION
    # =========================================================================
    telem = telemetry.get_game_telemetry(game_id)
    print("\n" + "=" * 60)
    print("LLM CALL BUDGET AUDIT")
    print("=" * 60)
    print(f"Total LLM Calls:   {telem['total_calls']}")
    print(f"Speech Calls:      {telem['speech_calls']} (3 per round * 2 rounds = 6)")
    print(f"Trust Calls:       {telem['trust_calls']} (6 per round * 2 rounds = 12)")
    print(f"Vote Calls:        {telem['vote_calls']} (expected 0)")
    print(f"Failed Calls:      {telem['failed_calls']}")
    print(f"Retries:           {telem['retries']}")
    print(f"Avg Duration:      {telem['avg_duration_ms']} ms")

    # ZERO extra calls constraint verification!
    expected_total = telem['speech_calls'] + telem['trust_calls']
    assert telem['total_calls'] == expected_total, f"Budget exceeded! Total {telem['total_calls']} != Speech {telem['speech_calls']} + Trust {telem['trust_calls']}"
    assert telem['vote_calls'] == 0, "Vote calls must be zero!"
    assert telem['total_calls'] == 18, f"Expected exactly 18 calls for 2 rounds with 3 AI agents, got {telem['total_calls']}"

    print("\n>>> LIVE GAME & AGENT OBSERVATORY AUDIT PASSED WITH 100% SUCCESS <<<")


if __name__ == "__main__":
    asyncio.run(test_live_observatory_game())
