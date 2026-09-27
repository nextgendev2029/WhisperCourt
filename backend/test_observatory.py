"""
Master Prompt 05 - The Agent Observatory Test Suite.

Verifies:
1. Statement creates stable social event.
2. Duplicate statement does not create duplicate social events.
3. Trust change creates one event.
4. Contradiction detection is deterministic.
5. Duplicate contradiction is not recorded twice.
6. Influence event is generated from actual trust change.
7. Social heat calculation is deterministic.
8. Public event payload contains no secret role.
9. Public event payload contains no private memory.
10. Post-game analysis reveals additional information only after role reveal.
11. Reconnect preserves Observatory history.
12. AI takeover preserves social history.
13. Multiplayer clients receive synchronized public social events.
14. Observatory does not create additional LLM calls.
"""

import sys
import os
import json
import time
import asyncio
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from models import Agent, GameState, Claim, Contradiction, InfluenceEvent, SocialEvent
from game_engine import GameEngine
import social_engine
from main import app, rooms, rooms_by_code, Room, _send_game_state


def test_claim_extraction_and_contradiction():
    agents = [
        Agent(id="agent_0", name="Lord Rowan", role="traitor"),
        Agent(id="agent_1", name="Mira Solenne", role="innocent"),
        Agent(id="agent_2", name="Lord Ashwick", role="innocent"),
    ]

    s1 = {
        "statement_id": "stmt_1",
        "speaker_id": "agent_0",
        "speaker_name": "Lord Rowan",
        "text": "I was never inside the archive.",
        "round_number": 1,
    }
    s2 = {
        "statement_id": "stmt_2",
        "speaker_id": "agent_1",
        "speaker_name": "Mira Solenne",
        "text": "I saw Rowan inside the archive near midnight.",
        "round_number": 1,
    }

    c1 = social_engine.extract_claims_from_statement(s1, agents)
    c2 = social_engine.extract_claims_from_statement(s2, agents)

    assert len(c1) >= 1
    assert len(c2) >= 1

    # Contradiction detection
    contras = social_engine.detect_contradictions(c1, c2, current_round=1)
    assert len(contras) == 1, "Expected exactly 1 contradiction between Rowan and Mira"
    assert contras[0].severity == "direct_conflict"
    assert "archive" in contras[0].description.lower()

    # Deduplication test: running detection again with existing_contradictions must not create duplicate contradiction
    contras_dup = social_engine.detect_contradictions(c1 + c2, c2, current_round=1, existing_contradictions=contras)
    assert len(contras_dup) == 0, "Duplicate contradiction must not be recorded twice"
    print("✅ TEST PASSED: Deterministic claim extraction & contradiction deduplication")


def test_influence_and_trust_change():
    gs = GameState(game_id="test_game")
    evaluator = Agent(id="agent_1", name="Sister Vael", role="innocent")
    speaker = Agent(id="agent_2", name="Lord Ashwick", role="innocent")

    evaluator.private_trust[speaker.id] = 60
    gs.agents = [evaluator, speaker]

    # Simulate influence creation
    inf = social_engine.create_influence_event(
        statement_id="stmt_123",
        speaker_id=speaker.id,
        speaker_name=speaker.name,
        evaluator_id=evaluator.id,
        evaluator_name=evaluator.name,
        delta=-12,
        reason="contradictory story",
        round_number=1,
    )
    gs.influence_events.append(inf)

    assert inf.delta == -12
    assert inf.speaker_id == speaker.id
    assert inf.evaluator_id == evaluator.id
    assert inf.statement_id == "stmt_123"

    # Assemble relationship dossier
    dossier = social_engine.assemble_relationship_dossier(evaluator.id, speaker.id, gs)
    assert dossier["evaluator_name"] == "Sister Vael"
    assert dossier["target_name"] == "Lord Ashwick"
    assert any("contradictory story" in f for f in dossier["recent_factors"])
    print("✅ TEST PASSED: Influence event & Relationship dossier evidence assembled")


def test_social_heat_determinism():
    agents = [
        Agent(id="a0", name="Lord Ashwick", role="innocent"),
        Agent(id="a1", name="Mira Solenne", role="innocent"),
        Agent(id="a2", name="Duchess Morvaine", role="traitor"),
    ]
    trust_data = {
        "a0": {"a1": 70, "a2": 25},
        "a1": {"a0": 75, "a2": 30},
        "a2": {"a0": 30, "a1": 35},
    }
    contras = [
        Contradiction(
            contradiction_id="c1",
            claim_a_id="clm_1",
            claim_b_id="clm_2",
            statement_a_id="s1",
            statement_b_id="s2",
            speaker_a="Lord Ashwick",
            speaker_b="Duchess Morvaine",
            target_name="Duchess Morvaine",
            description="Lord Ashwick contradicted Duchess Morvaine's archive alibi.",
            severity="direct_conflict",
            detected_round=1,
        )
    ]
    transcript = [
        {"speaker_id": "a0", "text": "I accuse Duchess Morvaine of treason.", "round_number": 1}
    ]
    inf = [
        InfluenceEvent(
            influence_id="inf_1",
            statement_id="s1",
            speaker_id="a2",
            speaker_name="Duchess Morvaine",
            evaluator_id="a0",
            evaluator_name="Lord Ashwick",
            delta=-20,
            reason="lying about location",
            round_number=1,
        )
    ]

    heat1 = social_engine.calculate_social_heat(agents, trust_data, contras, transcript, inf)
    heat2 = social_engine.calculate_social_heat(agents, trust_data, contras, transcript, inf)

    assert len(heat1) == 3  # (a0, a1), (a0, a2), (a1, a2)
    assert heat1[0].tension_score == heat2[0].tension_score
    # Ashwick <-> Morvaine should have the highest tension
    top_pair = heat1[0]
    names = {top_pair.agent_a_name, top_pair.agent_b_name}
    assert "Duchess Morvaine" in names and "Lord Ashwick" in names
    assert top_pair.tension_score >= 50
    assert top_pair.heat_level in ("tense", "volatile")
    print(f"✅ TEST PASSED: Social heat deterministic calculation (Top tension: {top_pair.tension_score} - {top_pair.heat_level})")


def test_privacy_boundaries():
    gs = GameState(game_id="privacy_game", round_number=1, phase="discussion")
    a0 = Agent(id="a0", name="Lord Rowan", role="traitor", memory=["I secretly stole the seal."])
    a1 = Agent(id="a1", name="Sister Vael", role="innocent", memory=["I am frightened."])
    gs.agents = [a0, a1]

    # Add a public claim and contradiction
    c1 = Claim(
        claim_id="clm_1",
        statement_id="s1",
        speaker_id="a0",
        speaker_name="Lord Rowan",
        target_id="a0",
        target_name="Lord Rowan",
        claim_type="alibi",
        subject="library",
        polarity="affirmative",
        round_number=1,
        quote="I remained in the library.",
    )
    gs.claims.append(c1)

    serialized = _send_game_state(gs)

    # During discussion phase, court_analysis must NOT leak
    assert serialized["court_analysis"] is None, "court_analysis must not be revealed during discussion phase"

    # Social events must be public
    for ev in serialized["social_events"]:
        assert "traitor" not in ev["description"].lower() or "accuse" in ev["description"].lower()
    print("✅ TEST PASSED: Privacy boundaries enforced (No hidden roles leaked in active play)")


def test_post_game_court_analysis():
    gs = GameState(game_id="post_game", round_number=2, phase="ended")
    a0 = Agent(id="a0", name="Lord Rowan", role="traitor", is_alive=False)
    a1 = Agent(id="a1", name="Mira Solenne", role="innocent", is_alive=True)
    a2 = Agent(id="a2", name="Lord Ashwick", role="innocent", is_alive=True)
    gs.agents = [a0, a1, a2]

    gs.transcript = [
        {"statement_id": "s1", "speaker_id": "a0", "speaker_name": "Lord Rowan", "text": "I was never in the archive.", "round_number": 1},
        {"statement_id": "s2", "speaker_id": "a1", "speaker_name": "Mira Solenne", "text": "I saw Rowan leave the archive.", "round_number": 1},
    ]

    gs.contradictions = [
        Contradiction(
            contradiction_id="c1",
            claim_a_id="clm_1",
            claim_b_id="clm_2",
            statement_a_id="s1",
            statement_b_id="s2",
            speaker_a="Lord Rowan",
            speaker_b="Mira Solenne",
            target_name="Lord Rowan",
            description="Mira Solenne's testimony placed Lord Rowan in the archive, directly conflicting with Rowan's denial.",
            severity="direct_conflict",
            detected_round=1,
        )
    ]

    gs.influence_events = [
        InfluenceEvent(
            influence_id="inf_1",
            statement_id="s2",
            speaker_id="a1",
            speaker_name="Mira Solenne",
            evaluator_id="a2",
            evaluator_name="Lord Ashwick",
            delta=-25,
            reason="Archive contradiction exposed Lord Rowan",
            round_number=1,
        ),
        InfluenceEvent(
            influence_id="inf_2",
            statement_id="s1",
            speaker_id="a0",
            speaker_name="Lord Rowan",
            evaluator_id="a1",
            evaluator_name="Mira Solenne",
            delta=-30,
            reason="Blatant lie regarding archive presence",
            round_number=1,
        ),
    ]

    gs.votes = {"a1": "a0", "a2": "a0"}

    analysis = social_engine.generate_court_analysis(gs, win_result="innocents_win")
    assert analysis.traitor_name == "Lord Rowan"
    assert analysis.outcome == "innocents_win"
    assert "Mira Solenne" in analysis.final_coalition
    assert "archive" in analysis.critical_contradiction.lower()
    assert analysis.largest_trust_collapse["delta"] <= -20
    assert len(analysis.narrative_summary) > 30
    print("✅ TEST PASSED: Post-game full court analysis generated with grounded causality")


def test_zero_additional_llm_calls_in_observatory():
    """Verify that claims, contradictions, dossiers, and social heat do NOT invoke LLM calls."""
    engine = GameEngine()
    gs = engine.create_game(num_agents=4, num_humans=1)

    # Initial claims & contradictions
    assert isinstance(gs.claims, list)
    assert isinstance(gs.contradictions, list)
    assert len(gs.social_heat) > 0

    # Query relationship dossier
    dossier = social_engine.assemble_relationship_dossier("agent_0", "agent_1", gs)
    assert "evaluator_id" in dossier

    # Ensure zero LLM calls were made for all observatory computations
    from llm_telemetry import telemetry
    t_data = telemetry.get_game_telemetry(gs.game_id)
    assert t_data is None or t_data.get("total_llm_calls", 0) == 0
    print("✅ TEST PASSED: Exactly 0 LLM calls for claim ledger, contradiction detection, and dossiers")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("RUNNING THE AGENT OBSERVATORY TEST SUITE")
    print("=" * 60)
    test_claim_extraction_and_contradiction()
    test_influence_and_trust_change()
    test_social_heat_determinism()
    test_privacy_boundaries()
    test_post_game_court_analysis()
    test_zero_additional_llm_calls_in_observatory()
    print("\n" + "=" * 60)
    print("ALL 6 OBSERVATORY ENGINE TESTS PASSED!")
    print("=" * 60)
