"""
Whisper Court - The Agent Observatory: Social Reasoning Engine.

Deterministic social cognition layer:
- Structured claim extraction from natural court testimony
- Deterministic contradiction detection
- Belief-state accumulation & persona-weighted social traits
- Directional influence tracking
- Pairwise social heat / tension calculation
- Grounded causal evidence generation ("Why did trust change?")
- Post-game full court analysis retrospective

ZERO LLM calls: everything derives deterministically from existing
speeches, trust logs, transcripts, and persona profiles.
"""

import re
import time
import uuid
from typing import Any

from models import (
    Agent,
    AgentMemoryLedger,
    Claim,
    Contradiction,
    CourtAnalysis,
    GameState,
    HumanBehaviorProfile,
    InfluenceEvent,
    RelationshipMemory,
    SocialEvent,
    SocialHeatPair,
    StrategicState,
    VoteRationale,
)

# ---------------------------------------------------------------------------
# Lexicon & Ontology for Courtroom Extraction
# ---------------------------------------------------------------------------

LOCATIONS = [
    "archive",
    "archives",
    "library",
    "courtyard",
    "garden",
    "gardens",
    "great hall",
    "council chamber",
    "chamber",
    "western gate",
    "west gate",
    "eastern gate",
    "east gate",
    "gate",
    "watchtower",
    "tower",
    "gallery",
    "chapel",
    "armory",
    "kitchen",
    "kitchens",
    "cellar",
    "dungeon",
    "dungeons",
    "antechamber",
]

OBSERVATION_VERBS = [
    "saw",
    "spotted",
    "found",
    "observed",
    "witnessed",
    "encountered",
    "watched",
    "caught",
    "noticed",
]

NEGATIVE_PATTERNS = [
    r"\bnever\b",
    r"\bwas not\b",
    r"\bwasn't\b",
    r"\bdid not\b",
    r"\bdidn't\b",
    r"\bnowhere near\b",
    r"\bnowhere near the\b",
    r"\bnever entered\b",
    r"\bnever stepped\b",
    r"\bnever left\b",
    r"\bnot present\b",
    r"\bdenied\b",
    r"\bdeny\b",
    r"\bfalse\b",
]

ACCUSATION_WORDS = [
    "accuse",
    "accusation",
    "traitor",
    "treason",
    "guilty",
    "conspiracy",
    "conspiring",
    "lying",
    "liar",
    "deceit",
    "deceitful",
    "suspect",
    "suspicious",
    "betrayal",
    "betrayed",
]

DEFENSE_WORDS = [
    "innocent",
    "innocence",
    "defend",
    "defense",
    "swear",
    "oath",
    "truth",
    "falsely",
    "loyal",
    "loyalty",
    "framed",
]


# ---------------------------------------------------------------------------
# 1. Structured Claim Extraction (Deterministic)
# ---------------------------------------------------------------------------

def extract_claims_from_statement(
    statement_dict: dict,
    agents: list[Agent],
) -> list[Claim]:
    """Deterministically extracts structured claims from a statement.

    Identifies:
 - Speaker
 - Mentioned target agents
 - Mentioned locations
 - Claim type (observation, alibi, accusation, defense)
 - Polarity (affirmative vs negative)
 - Quote snippet
    """
    text = statement_dict.get("text", "")
    if not text or not text.strip():
        return []

    statement_id = statement_dict.get("statement_id", f"stmt_{uuid.uuid4().hex[:8]}")
    speaker_id = statement_dict.get("speaker_id", "")
    speaker_name = statement_dict.get("speaker_name", "Courtier")
    round_num = statement_dict.get("round_number", 1)

    text_lower = text.lower()
    claims: list[Claim] = []

    # 1. Identify locations mentioned in the statement
    detected_locations = [loc for loc in LOCATIONS if re.search(rf"\b{re.escape(loc)}\b", text_lower)]
    primary_location = detected_locations[0] if detected_locations else ""

    # 2. Check polarity (affirmative vs negative)
    is_negative = any(re.search(pat, text_lower) for pat in NEGATIVE_PATTERNS)
    polarity = "negative" if is_negative else "affirmative"

    # 3. Identify targets mentioned (other agents)
    targets_found: list[Agent] = []
    for ag in agents:
        if ag.id == speaker_id:
            continue
        # Match by full name, first name, or last name
        names = [ag.name.lower()] + [p.lower() for p in ag.name.split() if len(p) > 2]
        for n in names:
            if re.search(rf"\b{re.escape(n)}\b", text_lower):
                if ag not in targets_found:
                    targets_found.append(ag)
                break

    # 4. Classify claim types
    has_accusation = any(w in text_lower for w in ACCUSATION_WORDS)
    has_defense = any(w in text_lower for w in DEFENSE_WORDS)
    has_obs_verb = any(v in text_lower for v in OBSERVATION_VERBS)

    # Strategy A: Target-specific claims
    for idx, target in enumerate(targets_found):
        if has_accusation:
            ctype = "accusation"
        elif has_obs_verb or primary_location:
            ctype = "observation"
        else:
            ctype = "observation"

        claim_id = f"clm_{statement_id}_{idx}"
        quote_snippet = text if len(text) <= 120 else text[:117] + "…"

        claims.append(
            Claim(
                claim_id=claim_id,
                statement_id=statement_id,
                speaker_id=speaker_id,
                speaker_name=speaker_name,
                target_id=target.id,
                target_name=target.name,
                claim_type=ctype,
                subject=primary_location or "loyalty",
                polarity=polarity,
                round_number=round_num,
                quote=quote_snippet,
                confidence=0.90 if primary_location else 0.82,
            )
        )

    # Strategy B: Speaker alibi or self-defense (claims about self)
    has_explicit_self_presence = bool(re.search(r"\b(i was|i stayed|i remained|i spent|my presence|i never entered|i never left)\b", text_lower))
    if (not targets_found) or has_explicit_self_presence:
        if primary_location and (not targets_found or has_explicit_self_presence):
            # Self-location claim (alibi)
            ctype = "alibi"
            claim_id = f"clm_{statement_id}_self"
            quote_snippet = text if len(text) <= 120 else text[:117] + "…"
            claims.append(
                Claim(
                    claim_id=claim_id,
                    statement_id=statement_id,
                    speaker_id=speaker_id,
                    speaker_name=speaker_name,
                    target_id=speaker_id,
                    target_name=speaker_name,
                    claim_type=ctype,
                    subject=primary_location,
                    polarity=polarity,
                    round_number=round_num,
                    quote=quote_snippet,
                    confidence=0.88,
                )
            )
        elif has_defense and not targets_found:
            ctype = "defense"
            claim_id = f"clm_{statement_id}_def"
            quote_snippet = text if len(text) <= 120 else text[:117] + "…"
            claims.append(
                Claim(
                    claim_id=claim_id,
                    statement_id=statement_id,
                    speaker_id=speaker_id,
                    speaker_name=speaker_name,
                    target_id=speaker_id,
                    target_name=speaker_name,
                    claim_type=ctype,
                    subject="innocence",
                    polarity=polarity,
                    round_number=round_num,
                    quote=quote_snippet,
                    confidence=0.85,
                )
            )
        elif has_accusation and not targets_found:
            # General accusation without named target
            claim_id = f"clm_{statement_id}_genacc"
            quote_snippet = text if len(text) <= 120 else text[:117] + "…"
            claims.append(
                Claim(
                    claim_id=claim_id,
                    statement_id=statement_id,
                    speaker_id=speaker_id,
                    speaker_name=speaker_name,
                    target_id=None,
                    target_name="The Court",
                    claim_type="accusation",
                    subject="hidden_traitor",
                    polarity="affirmative",
                    round_number=round_num,
                    quote=quote_snippet,
                    confidence=0.75,
                )
            )

    return claims


# ---------------------------------------------------------------------------
# 2. Deterministic Contradiction Detection
# ---------------------------------------------------------------------------

def detect_contradictions(
    existing_claims: list[Claim],
    new_claims: list[Claim],
    current_round: int,
    existing_contradictions: list[Contradiction] | None = None,
) -> list[Contradiction]:
    """Detects logical and factual conflicts between claims deterministically.

    Checks:
    1. Direct Presence Conflict:
       Speaker A asserts "I was never in the archive" (alibi, negative) vs
       Speaker B asserts "I saw Speaker A in the archive" (observation, affirmative).
    2. Location Clash:
       Speaker A was placed in Location X vs Location Y during the inquiry.
    3. Mutual Treason Accusation:
       Speaker A accuses Speaker B vs Speaker B accuses Speaker A.
    """
    new_contradictions: list[Contradiction] = []

    # Build index of existing contradiction pairs to avoid duplicate records
    existing_pairs = set()
    existing_stmt_pairs = set()

    if existing_contradictions:
        for ct in existing_contradictions:
            existing_pairs.add(tuple(sorted([ct.claim_a_id, ct.claim_b_id])))
            existing_stmt_pairs.add(tuple(sorted([ct.statement_a_id, ct.statement_b_id])))

    for c in new_claims:
        for prior in existing_claims:
            if c.claim_id == prior.claim_id:
                continue
            if c.statement_id == prior.statement_id:
                continue

            pair_key = tuple(sorted([c.claim_id, prior.claim_id]))
            stmt_pair_key = tuple(sorted([c.statement_id, prior.statement_id]))
            if pair_key in existing_pairs or stmt_pair_key in existing_stmt_pairs:
                continue

            # Case 1: Direct Denial vs Observation Clash
            # e.g., Agent A claims negative presence in location; Agent B claims seeing Agent A in location
            if (
                c.subject and prior.subject
                and c.subject == prior.subject
                and c.subject not in ("loyalty", "innocence", "hidden_traitor")
            ):
                # Check if one is about target T and the other is target T or self
                target_match = False
                target_name = ""

                # Prior was A's self-alibi, C is B observing A
                if prior.claim_type == "alibi" and prior.speaker_id == c.target_id:
                    target_match = True
                    target_name = prior.speaker_name
                # C is A's self-alibi, Prior was B observing A
                elif c.claim_type == "alibi" and c.speaker_id == prior.target_id:
                    target_match = True
                    target_name = c.speaker_name
                # Both observing same target with opposite polarity
                elif c.target_id and prior.target_id and c.target_id == prior.target_id and c.speaker_id != prior.speaker_id:
                    target_match = True
                    target_name = c.target_name or prior.target_name or "Target"

                if target_match and (c.polarity != prior.polarity):
                    contra_id = f"contra_{uuid.uuid4().hex[:8]}"
                    desc = (
                        f"{c.speaker_name}'s statement regarding the {c.subject} "
                        f"conflicts directly with {prior.speaker_name}'s earlier testimony."
                    )
                    new_contradictions.append(
                        Contradiction(
                            contradiction_id=contra_id,
                            claim_a_id=prior.claim_id,
                            claim_b_id=c.claim_id,
                            statement_a_id=prior.statement_id,
                            statement_b_id=c.statement_id,
                            speaker_a=prior.speaker_name,
                            speaker_b=c.speaker_name,
                            target_name=target_name,
                            description=desc,
                            severity="direct_conflict",
                            detected_round=current_round,
                        )
                    )
                    existing_pairs.add(pair_key)
                    existing_stmt_pairs.add(stmt_pair_key)
                    continue

            # Case 2: Location Inconsistency (Different locations for same person)
            if (
                c.subject and prior.subject
                and c.subject != prior.subject
                and c.subject not in ("loyalty", "innocence", "hidden_traitor")
                and prior.subject not in ("loyalty", "innocence", "hidden_traitor")
            ):
                # Agent claimed to be in two different places in same or adjacent rounds
                if (
                    c.claim_type == "alibi"
                    and prior.claim_type == "alibi"
                    and c.speaker_id == prior.speaker_id
                    and c.polarity == "affirmative"
                    and prior.polarity == "affirmative"
                    and abs(c.round_number - prior.round_number) <= 1
                ):
                    contra_id = f"contra_{uuid.uuid4().hex[:8]}"
                    desc = (
                        f"{c.speaker_name} claimed presence in the {c.subject} "
                        f"which clashes with their earlier claim of being in the {prior.subject}."
                    )
                    new_contradictions.append(
                        Contradiction(
                            contradiction_id=contra_id,
                            claim_a_id=prior.claim_id,
                            claim_b_id=c.claim_id,
                            statement_a_id=prior.statement_id,
                            statement_b_id=c.statement_id,
                            speaker_a=prior.speaker_name,
                            speaker_b=c.speaker_name,
                            target_name=c.speaker_name,
                            description=desc,
                            severity="timeline_inconsistency",
                            detected_round=current_round,
                        )
                    )
                    existing_pairs.add(pair_key)
                    existing_stmt_pairs.add(stmt_pair_key)
                    continue

            # Case 3: Mutual Treason Accusations
            if (
                c.claim_type == "accusation"
                and prior.claim_type == "accusation"
                and c.target_id == prior.speaker_id
                and prior.target_id == c.speaker_id
                and c.speaker_id != prior.speaker_id
            ):
                contra_id = f"contra_{uuid.uuid4().hex[:8]}"
                desc = (
                    f"{c.speaker_name} and {prior.speaker_name} have traded reciprocal "
                    f"charges of treason and deceit in open court."
                )
                new_contradictions.append(
                    Contradiction(
                        contradiction_id=contra_id,
                        claim_a_id=prior.claim_id,
                        claim_b_id=c.claim_id,
                        statement_a_id=prior.statement_id,
                        statement_b_id=c.statement_id,
                        speaker_a=prior.speaker_name,
                        speaker_b=c.speaker_name,
                        target_name=f"{c.speaker_name} & {prior.speaker_name}",
                        description=desc,
                        severity="mutual_accusation",
                        detected_round=current_round,
                    )
                )
                existing_pairs.add(pair_key)
                existing_stmt_pairs.add(stmt_pair_key)
                continue

    return new_contradictions


# ---------------------------------------------------------------------------
# 3. Persona-Weighted Social Traits (Feature 12)
# ---------------------------------------------------------------------------

def apply_persona_trust_modifier(
    evaluator: Agent,
    speaker: Agent,
    raw_delta: int,
    statement_text: str,
    contradictions: list[Contradiction],
) -> int:
    """Adjusts trust delta deterministically based on character persona traits.

    Personas:
 - Lord Ashwick (Detective): Penalizes contradictions 1.4x; rewards logical consistency.
 - Duchess Morvaine (Charming Liar): Deflects; less affected by minor accusations (0.7x).
 - Captain Brask (Loud Accuser): Accusation volatility 1.3x; quick to slash trust on finger pointing.
 - Sister Vael (Nervous Newcomer): High sensitivity to aggressive confrontation (1.3x negative delta).
 - Mira Solenne (Loyal Friend): Empathetic; rewards defense and alibis (+1.2x positive delta).
 - Old Renner (Quiet Observer): Patient; dampens volatile swings (0.85x).
    """
    if raw_delta == 0:
        return 0

    name_lower = evaluator.name.lower()
    adjusted = float(raw_delta)

    # 1. Lord Ashwick - The Overconfident Detective
    if "ashwick" in name_lower:
        # Check if speaker is involved in any detected contradiction
        has_contra = any(
            c.speaker_a == speaker.name or c.speaker_b == speaker.name
            for c in contradictions
        )
        if has_contra and raw_delta < 0:
            adjusted *= 1.4
        elif raw_delta > 0:
            adjusted *= 0.9  # naturally skeptical

    # 2. Captain Brask - The Loud Accuser
    elif "brask" in name_lower:
        if any(w in statement_text.lower() for w in ACCUSATION_WORDS) and raw_delta < 0:
            adjusted *= 1.3
        elif raw_delta < 0:
            adjusted *= 1.15

    # 3. Duchess Morvaine - The Charming Liar
    elif "morvaine" in name_lower:
        if raw_delta < 0:
            adjusted *= 0.75  # smooth deflection
        else:
            adjusted *= 1.1   # receptive to flattery/compliments

    # 4. Sister Vael - The Nervous Newcomer
    elif "vael" in name_lower:
        if raw_delta < 0:
            adjusted *= 1.25  # easily startled into deep suspicion
        else:
            adjusted *= 1.1   # deeply grateful for support

    # 5. Mira Solenne - The Loyal Friend
    elif "mira" in name_lower:
        if any(w in statement_text.lower() for w in DEFENSE_WORDS) and raw_delta > 0:
            adjusted *= 1.3
        elif raw_delta < 0:
            adjusted *= 1.2   # betrayal hurts deeply

    # 6. Old Renner - The Quiet Observer
    elif "renner" in name_lower:
        adjusted *= 0.85  # slow, steady, patient weighting

    final_delta = int(round(adjusted))
    return max(-30, min(30, final_delta))


# ---------------------------------------------------------------------------
# 4. Influence Recording
# ---------------------------------------------------------------------------

def create_influence_event(
    statement_id: str,
    speaker_id: str,
    speaker_name: str,
    evaluator_id: str,
    evaluator_name: str,
    delta: int,
    reason: str,
    round_number: int,
) -> InfluenceEvent:
    """Records how a speaker's testimony causally influenced another agent's trust."""
    return InfluenceEvent(
        influence_id=f"infl_{uuid.uuid4().hex[:8]}",
        statement_id=statement_id,
        speaker_id=speaker_id,
        speaker_name=speaker_name,
        evaluator_id=evaluator_id,
        evaluator_name=evaluator_name,
        delta=delta,
        reason=reason,
        round_number=round_number,
        timestamp=time.time(),
    )


# ---------------------------------------------------------------------------
# 5. Pairwise Social Heat / Tension Calculation (Feature 6)
# ---------------------------------------------------------------------------

def calculate_social_heat(
    agents: list[Agent],
    trust_data: dict[str, dict[str, int]],
    contradictions: list[Contradiction],
    transcript: list[dict],
    influence_events: list[InfluenceEvent],
) -> list[SocialHeatPair]:
    """Calculates deterministic tension between every pair of living agents.

    Formula:
    Tension(A, B) =
        Distrust(A -> B) + Distrust(B -> A)
        + 15 * (number of contradictions involving A and B)
        + 10 * (number of accusations between A and B)
        + 0.5 * (recent negative influence magnitude)

    Heat Levels:
 - 0-25:   CALM
 - 26-50:  WATCH
 - 51-75:  TENSE
 - 76-100: VOLATILE
    """
    living = [a for a in agents if a.is_alive]
    heat_pairs: list[SocialHeatPair] = []
    seen = set()

    for i in range(len(living)):
        for j in range(i + 1, len(living)):
            a = living[i]
            b = living[j]
            pair_key = tuple(sorted([a.id, b.id]))
            if pair_key in seen:
                continue
            seen.add(pair_key)

            # Mutual distrust
            trust_a_to_b = trust_data.get(a.id, {}).get(b.id, 50)
            trust_b_to_a = trust_data.get(b.id, {}).get(a.id, 50)
            distrust_a = (100 - trust_a_to_b) / 2.0
            distrust_b = (100 - trust_b_to_a) / 2.0
            base_distrust = distrust_a + distrust_b

            # Contradiction count
            pair_contras = [
                c for c in contradictions
                if (c.speaker_a == a.name and c.speaker_b == b.name)
                or (c.speaker_a == b.name and c.speaker_b == a.name)
                or (c.target_name in (a.name, b.name))
            ]
            contra_points = len(pair_contras) * 15

            # Accusation count from transcript
            accusation_count = 0
            for entry in transcript:
                text = entry.get("text", "").lower()
                speaker_id = entry.get("speaker_id")
                if speaker_id == a.id and b.name.lower() in text and any(w in text for w in ACCUSATION_WORDS):
                    accusation_count += 1
                elif speaker_id == b.id and a.name.lower() in text and any(w in text for w in ACCUSATION_WORDS):
                    accusation_count += 1
            accusation_points = accusation_count * 10

            # Influence volatility
            recent_neg_infl = sum(
                abs(inf.delta)
                for inf in influence_events[-12:]
                if (inf.speaker_id == a.id and inf.evaluator_id == b.id and inf.delta < 0)
                or (inf.speaker_id == b.id and inf.evaluator_id == a.id and inf.delta < 0)
            )
            volatility_points = int(recent_neg_infl * 0.4)

            raw_tension = int(round(base_distrust * 0.6 + contra_points + accusation_points + volatility_points))
            tension_score = max(0, min(100, raw_tension))

            if tension_score <= 25:
                level = "calm"
            elif tension_score <= 50:
                level = "watch"
            elif tension_score <= 75:
                level = "tense"
            else:
                level = "volatile"

            factors = []
            if base_distrust >= 50:
                factors.append(f"Mutual trust eroded to {int(round(100 - base_distrust))}%")
            if pair_contras:
                factors.append(f"{len(pair_contras)} testimony conflict(s) recorded")
            if accusation_count > 0:
                factors.append(f"{accusation_count} direct accusation(s) exchanged")
            if volatility_points > 10:
                factors.append("Recent volatile trust shifts")
            if not factors:
                factors.append("Stable council relationship")

            heat_pairs.append(
                SocialHeatPair(
                    agent_a_id=a.id,
                    agent_a_name=a.name,
                    agent_b_id=b.id,
                    agent_b_name=b.name,
                    tension_score=tension_score,
                    heat_level=level,
                    factors=factors,
                )
            )

    # Sort highest tension first
    heat_pairs.sort(key=lambda p: p.tension_score, reverse=True)
    return heat_pairs


# ---------------------------------------------------------------------------
# 6. Relationship Dossier Evidence Assembler ("Why Did Trust Change?")
# ---------------------------------------------------------------------------

def assemble_relationship_dossier(
    evaluator_id: Any,
    target_id: Any,
    game_state: Any = None,
) -> dict[str, Any]:
    """Builds grounded, investigative evidence for why evaluator trusts/distrusts target."""
    # Handle both assemble_relationship_dossier(eval_id, target_id, gs) and assemble_relationship_dossier(gs, eval_id, target_id)
    if hasattr(evaluator_id, "agents"):
        real_gs = evaluator_id
        real_eval_id = target_id
        real_target_id = game_state
    else:
        real_gs = game_state
        real_eval_id = evaluator_id
        real_target_id = target_id

    evaluator = next((a for a in real_gs.agents if a.id == real_eval_id), None)
    target = next((a for a in real_gs.agents if a.id == real_target_id), None)

    if not evaluator or not target:
        return {}

    evaluator_id = real_eval_id
    target_id = real_target_id
    game_state = real_gs

    current_trust = evaluator.private_trust.get(target_id, 50)

    # Trace trust shifts from influence events & trust log
    relevant_shifts = [
        e for e in game_state.influence_events
        if e.evaluator_id == evaluator_id and e.speaker_id == target_id
    ]

    # Contradictions between the two
    pair_contras = [
        c for c in game_state.contradictions
        if (c.speaker_a == evaluator.name and c.speaker_b == target.name)
        or (c.speaker_a == target.name and c.speaker_b == evaluator.name)
    ]

    # Target statements cited
    target_statements = [
        s for s in game_state.transcript
        if s.get("speaker_id") == target_id
    ]

    recent_factors: list[str] = []
    if pair_contras:
        recent_factors.append(f"Testimony conflicted with {evaluator.name}'s statements ({len(pair_contras)} conflict(s))")

    for shift in reversed(relevant_shifts[-3:]):
        sign = "+" if shift.delta > 0 else ""
        recent_factors.append(f"Round {shift.round_number}: {shift.reason} ({sign}{shift.delta})")

    if not recent_factors:
        if current_trust >= 60:
            recent_factors.append("Consistent, non-confrontational chamber demeanor")
        else:
            recent_factors.append("General reserve and ambiguous positioning")

    # Evidence quotes
    evidence_quotes = []
    for shift in relevant_shifts[-3:]:
        # Find matching statement
        stmt = next((s for s in game_state.transcript if s.get("statement_id") == shift.statement_id), None)
        evidence_quotes.append({
            "round_number": shift.round_number,
            "speaker_name": target.name,
            "text": stmt["text"] if stmt else f"Testimony in Round {shift.round_number}",
            "delta": shift.delta,
            "reason": shift.reason,
        })

    # Net change across recorded shifts
    net_change = sum(s.delta for s in relevant_shifts)
    initial_trust = 60
    calculated_prev = current_trust - (relevant_shifts[-1].delta if relevant_shifts else 0)

    # Relationship memory metrics
    rel_mem = evaluator.memory_ledger.relationship_memories.get(target.id) if (hasattr(evaluator, "memory_ledger") and evaluator.memory_ledger) else None
    hist_high = rel_mem.historical_high if rel_mem else max(initial_trust, current_trust)
    hist_low = rel_mem.historical_low if rel_mem else min(initial_trust, current_trust)
    alignment = rel_mem.alignment_score if rel_mem else 50
    acc_count = rel_mem.accusations_made if rel_mem else 0
    def_count = rel_mem.defenses_given if rel_mem else 0

    return {
        "evaluator_id": evaluator.id,
        "evaluator_name": evaluator.name,
        "target_id": target.id,
        "target_name": target.name,
        "current_trust": current_trust,
        "previous_trust": max(0, min(100, calculated_prev)),
        "net_change": net_change,
        "historical_high": hist_high,
        "historical_low": hist_low,
        "alignment_score": alignment,
        "accusations_count": acc_count,
        "defenses_count": def_count,
        "recent_factors": recent_factors,
        "evidence_quotes": evidence_quotes,
        "contradictions": [c.model_dump() for c in pair_contras],
    }


# ---------------------------------------------------------------------------
# 7. Post-Game Full Court Analysis (Feature 10)
# ---------------------------------------------------------------------------

def generate_court_analysis(
    game_state: GameState,
    win_result: str | None = None,
) -> CourtAnalysis:
    """Produces the in-depth post-game retrospective narrative.

    Reveals:
 - True traitor identity
 - First point in time court suspicion formed
 - Major turning point testimony
 - Largest trust collapse
 - Most influential speaker
 - Critical contradiction that shaped the verdict
 - Final voting coalition
    """
    traitor = next((a for a in game_state.agents if a.role == "traitor"), None)
    traitor_id = traitor.id if traitor else "unknown"
    traitor_name = traitor.name if traitor else "Unknown Suspect"

    outcome = win_result or ("innocents_win" if traitor and not traitor.is_alive else "traitor_wins")

    # 1. First suspicion formed
    first_suspicion_round = 1
    first_suspicion_text = "Initial council opening remarks"

    for shift in game_state.influence_events:
        if shift.speaker_id == traitor_id and shift.delta < 0:
            first_suspicion_round = shift.round_number
            first_suspicion_text = shift.reason
            break

    # 2. Major turning point statement
    turning_point_speaker = "Council"
    turning_point_stmt = "The court's cross-examination"
    max_neg_impact = 0

    stmt_impacts: dict[str, int] = {}
    for inf in game_state.influence_events:
        stmt_impacts[inf.statement_id] = stmt_impacts.get(inf.statement_id, 0) + abs(inf.delta)

    if stmt_impacts:
        top_stmt_id = max(stmt_impacts.keys(), key=lambda sid: stmt_impacts[sid])
        top_stmt = next((s for s in game_state.transcript if s.get("statement_id") == top_stmt_id), None)
        if top_stmt:
            turning_point_speaker = top_stmt.get("speaker_name", "Courtier")
            turning_point_stmt = top_stmt.get("text", "")

    # 3. Largest trust collapse
    largest_collapse = {}
    steepest_drop = 0

    # Group influence by (evaluator, target)
    pair_deltas: dict[tuple[str, str], int] = {}
    for inf in game_state.influence_events:
        key = (inf.evaluator_name, inf.speaker_name)
        pair_deltas[key] = pair_deltas.get(key, 0) + inf.delta

    if pair_deltas:
        worst_pair, min_delta = min(pair_deltas.items(), key=lambda x: x[1])
        if min_delta < 0:
            largest_collapse = {
                "evaluator": worst_pair[0],
                "target": worst_pair[1],
                "delta": min_delta,
                "summary": f"{worst_pair[0]}'s trust in {worst_pair[1]} collapsed by {abs(min_delta)} points",
            }

    # 4. Most influential speaker
    speaker_deltas: dict[str, int] = {}
    for inf in game_state.influence_events:
        speaker_deltas[inf.speaker_name] = speaker_deltas.get(inf.speaker_name, 0) + abs(inf.delta)

    most_influential = "None"
    most_infl_delta = 0
    if speaker_deltas:
        most_influential, most_infl_delta = max(speaker_deltas.items(), key=lambda x: x[1])

    # 5. Critical contradiction
    critical_contra = "No fatal contradictions detected on record."
    if game_state.contradictions:
        # Prioritize contradiction involving the traitor
        traitor_contras = [
            c for c in game_state.contradictions
            if c.speaker_a == traitor_name or c.speaker_b == traitor_name or c.target_name == traitor_name
        ]
        if traitor_contras:
            critical_contra = traitor_contras[0].description
        else:
            critical_contra = game_state.contradictions[0].description

    # 6. Final coalition
    final_coalition = [
        _id_to_name(game_state, voter_id)
        for voter_id, accused_id in game_state.votes.items()
        if accused_id == traitor_id
    ]
    if not final_coalition:
        final_coalition = [a.name for a in game_state.agents if a.is_alive and a.role == "innocent"]

    # 7. Narrative summary
    if outcome == "innocents_win":
        narrative = (
            f"The court unmasked {traitor_name} through consistent cross-examination. "
            f"Suspicion first stirred in Round {first_suspicion_round} ({first_suspicion_text}). "
            f"The turning point arrived when {turning_point_speaker} testified before the council. "
            f"The coalition of {', '.join(final_coalition) or 'the loyal court'} sealed the traitor's banishment."
        )
    else:
        narrative = (
            f"{traitor_name} successfully deflected suspicion, exploiting court rivalries to divide the council. "
            f"Despite early doubts in Round {first_suspicion_round}, the court's attention fractured, "
            f"enabling the traitor to claim dominion over the Whisper Court."
        )

    # 8. Agent Journeys & Vote Rationales (Master Prompt 06)
    agent_journeys = build_agent_journeys(game_state, traitor_id, outcome)
    vote_rationales = [
        a.last_vote_rationale.model_dump()
        for a in game_state.agents
        if a.last_vote_rationale is not None
    ]

    return CourtAnalysis(
        traitor_id=traitor_id,
        traitor_name=traitor_name,
        outcome=outcome,
        first_suspicion_round=first_suspicion_round,
        first_suspicion_text=first_suspicion_text,
        turning_point_statement=turning_point_stmt,
        turning_point_speaker=turning_point_speaker,
        largest_trust_collapse=largest_collapse,
        most_influential_speaker=most_influential,
        most_influential_delta=most_infl_delta,
        critical_contradiction=critical_contra,
        final_coalition=final_coalition,
        narrative_summary=narrative,
        agent_journeys=agent_journeys,
        vote_rationales=vote_rationales,
    )


# ---------------------------------------------------------------------------
# 8. Living Agent Memory & Strategic State Engine (Master Prompt 06)
# ---------------------------------------------------------------------------

def init_agent_memory(agent: Agent, all_agents: list[Agent]) -> None:
    """Initializes structured memory ledger and relationship trackers for an agent."""
    if not hasattr(agent, "memory_ledger") or agent.memory_ledger is None:
        agent.memory_ledger = AgentMemoryLedger()
    if not hasattr(agent, "strategic_state") or agent.strategic_state is None:
        agent.strategic_state = StrategicState()

    agent.memory_ledger.agent_id = agent.id

    for other in all_agents:
        if other.id != agent.id and other.id not in agent.memory_ledger.relationship_memories:
            init_trust = agent.private_trust.get(other.id, 60)
            agent.memory_ledger.relationship_memories[other.id] = RelationshipMemory(
                target_id=other.id,
                target_name=other.name,
                current_trust=init_trust,
                historical_high=init_trust,
                historical_low=init_trust,
                net_delta=0,
                alignment_score=50,
                last_interaction_round=1,
            )

    if not agent.strategic_state.public_position:
        agent.strategic_state.public_position = f"{agent.name} has taken their seat in court, observing initial testimonies."
    if not agent.strategic_state.recent_strategy:
        agent.strategic_state.recent_strategy = "Observing chamber demeanor and listening for inconsistencies."


def update_agent_memory_from_statement(
    agent: Agent,
    stmt_dict: dict[str, Any],
    claims: list[Claim],
    contradictions: list[Contradiction],
    game_state: GameState,
) -> None:
    """Updates an agent's memory ledger from an observed statement and claims."""
    if not hasattr(agent, "memory_ledger") or not agent.memory_ledger:
        init_agent_memory(agent, game_state.agents)

    stmt_id = stmt_dict.get("statement_id", "")
    speaker_id = stmt_dict.get("speaker_id", "")
    speaker_name = stmt_dict.get("speaker_name", "")
    round_num = stmt_dict.get("round_number", 1)
    text = stmt_dict.get("text", "")
    text_lower = text.lower()

    # 1. Observable Fact Entry (Strictly Traceable)
    fact_entry = f"Round {round_num}: {speaker_name} testified: \"{text[:90]}...\" [ID: {stmt_id}]"
    if fact_entry not in agent.memory_ledger.known_facts:
        agent.memory_ledger.known_facts.append(fact_entry)

    # 2. Track Observed Claim IDs
    for c in claims:
        if c.claim_id not in agent.memory_ledger.observed_claim_ids:
            agent.memory_ledger.observed_claim_ids.append(c.claim_id)

    # 3. Accusation / Defense Tracking
    is_accusation = any(w in text_lower for w in ACCUSATION_WORDS)
    is_defense = any(w in text_lower for w in DEFENSE_WORDS)

    # Find target mentioned
    targets_mentioned = [a for a in game_state.agents if a.id != speaker_id and a.name.lower() in text_lower]

    if is_accusation and targets_mentioned:
        for tgt in targets_mentioned:
            if speaker_id == agent.id:
                # We made the accusation
                agent.memory_ledger.accusations_made.append({
                    "target_id": tgt.id,
                    "target_name": tgt.name,
                    "statement_id": stmt_id,
                    "round": round_num,
                    "text": text[:80],
                })
                agent.strategic_state.focus_agent_id = tgt.id
                agent.strategic_state.focus_agent_name = tgt.name
                agent.strategic_state.public_position = f"Directly challenged {tgt.name}'s integrity in court."
                commitment = f"Seek council inquiry against {tgt.name}"
                if commitment not in agent.memory_ledger.strategic_commitments:
                    agent.memory_ledger.strategic_commitments.append(commitment)
            elif tgt.id == agent.id:
                # We received the accusation
                agent.memory_ledger.accusations_received.append({
                    "speaker_id": speaker_id,
                    "speaker_name": speaker_name,
                    "statement_id": stmt_id,
                    "round": round_num,
                    "text": text[:80],
                })
                if speaker_id in agent.memory_ledger.relationship_memories:
                    rel = agent.memory_ledger.relationship_memories[speaker_id]
                    rel.accusations_made += 1
                    rel.alignment_score = max(0, rel.alignment_score - 15)

    if is_defense and targets_mentioned:
        for tgt in targets_mentioned:
            if speaker_id == agent.id:
                if tgt.id not in agent.memory_ledger.defended_agents:
                    agent.memory_ledger.defended_agents.append(tgt.id)
                agent.strategic_state.defensive_target_id = tgt.id
                agent.strategic_state.defensive_target_name = tgt.name
            elif tgt.id == agent.id:
                if speaker_id in agent.memory_ledger.relationship_memories:
                    rel = agent.memory_ledger.relationship_memories[speaker_id]
                    rel.defenses_given += 1
                    rel.alignment_score = min(100, rel.alignment_score + 15)

    # 4. Contradiction Tracking
    for ct in contradictions:
        if ct.speaker_a == agent.name or ct.speaker_b == agent.name:
            other_name = ct.speaker_b if ct.speaker_a == agent.name else ct.speaker_a
            other = next((a for a in game_state.agents if a.name == other_name), None)
            if other and other.id in agent.memory_ledger.relationship_memories:
                rel = agent.memory_ledger.relationship_memories[other.id]
                rel.contradictions_count += 1
                agent.strategic_state.focus_agent_id = other.id
                agent.strategic_state.focus_agent_name = other.name
                agent.strategic_state.public_position = f"Discovered testimony clash with {other_name} regarding {ct.description[:40]}."


def update_agent_memory_from_trust(
    evaluator: Agent,
    target_id: str,
    target_name: str,
    delta: int,
    reason: str,
    round_num: int,
) -> None:
    """Updates RelationshipMemory and social alignment following a trust evaluation."""
    if not hasattr(evaluator, "memory_ledger") or not evaluator.memory_ledger:
        return

    rel = evaluator.memory_ledger.relationship_memories.setdefault(
        target_id,
        RelationshipMemory(
            target_id=target_id,
            target_name=target_name,
            current_trust=evaluator.private_trust.get(target_id, 50),
            historical_high=evaluator.private_trust.get(target_id, 50),
            historical_low=evaluator.private_trust.get(target_id, 50),
        ),
    )

    curr_trust = evaluator.private_trust.get(target_id, 50)
    rel.current_trust = curr_trust
    rel.historical_high = max(rel.historical_high, curr_trust)
    rel.historical_low = min(rel.historical_low, curr_trust)
    rel.net_delta += delta
    rel.last_interaction_round = round_num

    # Derived social alignment score (0 - 100)
    base = 50 + int((curr_trust - 50) * 0.55)
    modifiers = (rel.defenses_given * 12) - (rel.accusations_made * 15) - (rel.contradictions_count * 12)
    rel.alignment_score = max(0, min(100, base + modifiers))

    # Update strategic alliance targets
    if rel.alignment_score >= 70 and target_id not in evaluator.strategic_state.alliance_target_ids:
        evaluator.strategic_state.alliance_target_ids.append(target_id)
    elif rel.alignment_score < 45 and target_id in evaluator.strategic_state.alliance_target_ids:
        evaluator.strategic_state.alliance_target_ids.remove(target_id)


def record_human_action(
    agent: Agent,
    action_type: str,
    target_id: str | None,
    text: str,
    game_state: GameState,
) -> None:
    """Records human strategic choices deterministically to form a behavior profile."""
    if not hasattr(agent, "memory_ledger") or not agent.memory_ledger:
        init_agent_memory(agent, game_state.agents)

    prof = agent.memory_ledger.human_profile

    if action_type == "question":
        prof.question_count += 1
        if target_id:
            prof.target_interaction_counts[target_id] = prof.target_interaction_counts.get(target_id, 0) + 1
            if target_id not in agent.memory_ledger.challenged_agents:
                agent.memory_ledger.challenged_agents.append(target_id)
            target = next((a for a in game_state.agents if a.id == target_id), None)
            agent.strategic_state.focus_agent_id = target_id
            if target:
                agent.strategic_state.focus_agent_name = target.name
            agent.strategic_state.focus_topic = text[:40]

    elif action_type == "accuse":
        prof.accusation_count += 1
        if target_id:
            prof.target_interaction_counts[target_id] = prof.target_interaction_counts.get(target_id, 0) + 1
            prof.target_accusation_counts[target_id] = prof.target_accusation_counts.get(target_id, 0) + 1
            target = next((a for a in game_state.agents if a.id == target_id), None)
            agent.strategic_state.focus_agent_id = target_id
            target_name = target.name if target else target_id
            agent.strategic_state.focus_agent_name = target_name
            agent.strategic_state.public_position = f"Formally accused {target_name}."
            agent.memory_ledger.accusations_made.append({
                "target_id": target_id,
                "target_name": target_name,
                "round": game_state.round_number,
                "statement_id": f"stmt_acc_r{game_state.round_number}_{agent.id}",
                "text": text[:80],
            })
            if target and hasattr(target, "memory_ledger") and target.memory_ledger:
                target.memory_ledger.accusations_received.append({
                    "speaker_id": agent.id,
                    "speaker_name": agent.name,
                    "round": game_state.round_number,
                    "statement_id": f"stmt_acc_r{game_state.round_number}_{agent.id}",
                    "text": text[:80],
                })
            commitment = f"Pursue exile for {target_name}"
            if commitment not in agent.memory_ledger.strategic_commitments:
                agent.memory_ledger.strategic_commitments.append(commitment)

    elif action_type == "defend":
        prof.defense_count += 1
        agent.strategic_state.public_position = f"Maintained innocence: \"{text[:45]}...\""

    elif action_type == "stay_silent":
        prof.silence_count += 1

    elif action_type == "vote":
        if target_id:
            target = next((a for a in game_state.agents if a.id == target_id), None)
            target_name = target.name if target else target_id
            prof.voted_against_id = target_id
            prof.voted_against_name = target_name
            prof.target_interaction_counts[target_id] = prof.target_interaction_counts.get(target_id, 0) + 1
            agent.memory_ledger.vote_history.append({
                "round": game_state.round_number,
                "target_id": target_id,
                "target_name": target_name,
                "is_human": True,
            })

    # Recalculate preferred target
    if prof.target_interaction_counts:
        prof.preferred_target_id = max(prof.target_interaction_counts, key=prof.target_interaction_counts.get)
        tgt = next((a for a in game_state.agents if a.id == prof.preferred_target_id), None)
        if tgt:
            prof.preferred_target_name = tgt.name

    # Tendencies
    prof.question_tendency = "high" if prof.question_count >= 2 else ("medium" if prof.question_count == 1 else "low")
    prof.accusation_tendency = "high" if prof.accusation_count >= 2 else ("medium" if prof.accusation_count == 1 else "low")
    prof.defense_tendency = "high" if prof.defense_count >= 2 else ("medium" if prof.defense_count == 1 else "low")
    prof.recent_strategic_focus = agent.strategic_state.public_position


def generate_takeover_briefing(agent: Agent, game_state: GameState) -> str:
    """Generates an internal seat continuity briefing for AI takeover."""
    allies = [
        f"{rel.target_name} ({rel.current_trust}/100)"
        for rel in agent.memory_ledger.relationship_memories.values()
        if rel.current_trust >= 60
    ]
    suspects = [
        f"{rel.target_name} ({rel.current_trust}/100)"
        for rel in agent.memory_ledger.relationship_memories.values()
        if rel.current_trust < 50
    ]

    commitments = agent.memory_ledger.strategic_commitments[-2:] if agent.memory_ledger.strategic_commitments else ["Observe court"]

    briefing = (
        f"### SEAT CONTINUITY BRIEFING\n"
        f"YOU ARE CONTINUING {agent.name.upper()}'S SEAT.\n"
        f"Current role: {agent.role.upper()}\n"
        f"Current round: {game_state.round_number}\n"
        f"Recent public position: \"{agent.strategic_state.public_position or 'Observed testimonies'}\"\n"
        f"Strategic focus: Scrutinizing {agent.strategic_state.focus_agent_name or 'the court'}\n"
        f"Trusted allies: {', '.join(allies) if allies else 'None yet'}\n"
        f"Suspected adversaries: {', '.join(suspects) if suspects else 'None yet'}\n"
        f"Strategic commitments: {', '.join(commitments)}\n"
        f"DIRECTIVE: Continue the character's existing trajectory! Do not reverse stances without genuine new evidence."
    )
    return briefing


def get_persona_strategic_weights(agent_or_persona: Agent | str) -> dict[str, float]:
    """Returns deterministic strategic multipliers based on persona archetype."""
    if isinstance(agent_or_persona, str):
        p_lower = agent_or_persona.lower()
    else:
        p_lower = (agent_or_persona.personality + " " + agent_or_persona.name).lower()

    if "detective" in p_lower or "ashwick" in p_lower or "logical" in p_lower:
        base = {"w_contra": 24.0, "w_acc": 8.0, "loyalty_discount": 15.0, "noise_filter": 1.0}
    elif "cautious" in p_lower or "vael" in p_lower or "nervous" in p_lower:
        base = {"w_contra": 12.0, "w_acc": 6.0, "loyalty_discount": 20.0, "noise_filter": 1.3}
    elif "loud" in p_lower or "brask" in p_lower or "accuser" in p_lower or "aggressive" in p_lower:
        base = {"w_contra": 15.0, "w_acc": 22.0, "loyalty_discount": 10.0, "noise_filter": 0.8}
    elif "liar" in p_lower or "morvaine" in p_lower or "charming" in p_lower or "skeptical" in p_lower:
        base = {"w_contra": 18.0, "w_acc": 12.0, "loyalty_discount": 10.0, "noise_filter": 1.0}
    elif "loyal" in p_lower or "mira" in p_lower or "friend" in p_lower or "empathetic" in p_lower:
        base = {"w_contra": 12.0, "w_acc": 8.0, "loyalty_discount": 35.0, "noise_filter": 1.0}
    elif "observer" in p_lower or "renner" in p_lower or "quiet" in p_lower or "stoic" in p_lower:
        base = {"w_contra": 14.0, "w_acc": 7.0, "loyalty_discount": 15.0, "noise_filter": 0.6}
    else:
        base = {"w_contra": 15.0, "w_acc": 10.0, "loyalty_discount": 15.0, "noise_filter": 1.0}

    # Aliases for convenience & test compatibility
    base["contradiction_weight"] = base["w_contra"]
    base["accusation_weight"] = base["w_acc"]
    base["delta_dampening"] = round(1.0 / base["noise_filter"], 2)
    base["accusation_frequency"] = base["w_acc"]
    return base


def calculate_agent_vote_target(voter: Agent, game_state: GameState) -> tuple[str, VoteRationale]:
    """Calculates a deterministic, multi-factor voting target with grounded rationale.

    Factors:
 - Current trust score deficit (100 - trust)
 - Recent negative trust movement
 - Contradictions involving candidate
 - Public accusations against candidate
 - Pairwise social heat
 - Strategic focus bonus
 - Persona-based loyalty discount for allies
    """
    living = [a for a in game_state.agents if a.is_alive and a.id != voter.id]
    if not living:
        return voter.id, VoteRationale(voter_id=voter.id, target_id=voter.id, target_name=voter.name, score=0.0, factors=["No targets"])

    weights = get_persona_strategic_weights(voter)
    best_target = living[0]
    best_score = -999999.0
    best_factors: list[str] = []

    # Map candidate contradiction counts
    candidate_contras: dict[str, int] = {}
    for ct in game_state.contradictions:
        for cand in living:
            if cand.name == ct.speaker_a or cand.name == ct.speaker_b or cand.name == ct.target_name:
                candidate_contras[cand.id] = candidate_contras.get(cand.id, 0) + 1

    # Map candidate accusation counts from transcript
    candidate_accs: dict[str, int] = {}
    for stmt in game_state.transcript:
        text_lower = stmt.get("text", "").lower()
        for cand in living:
            if cand.name.lower() in text_lower and any(w in text_lower for w in ACCUSATION_WORDS):
                candidate_accs[cand.id] = candidate_accs.get(cand.id, 0) + 1

    # Map heat
    heat_map: dict[str, int] = {}
    for sh in game_state.social_heat:
        if sh.agent_a_id == voter.id and sh.agent_b_id in [c.id for c in living]:
            heat_map[sh.agent_b_id] = sh.tension_score
        elif sh.agent_b_id == voter.id and sh.agent_a_id in [c.id for c in living]:
            heat_map[sh.agent_a_id] = sh.tension_score

    for cand in living:
        trust = voter.private_trust.get(cand.id, 50)
        rel = voter.memory_ledger.relationship_memories.get(cand.id) if hasattr(voter, "memory_ledger") else None
        neg_delta = max(0, -rel.net_delta) if rel else 0
        contras = max(candidate_contras.get(cand.id, 0), rel.contradictions_count if rel else 0)
        accs = max(candidate_accs.get(cand.id, 0), rel.accusations_made if rel else 0)
        heat = heat_map.get(cand.id, 20)

        # Base suspicion (0 to 100)
        score = (100 - trust) * 0.45
        factors = [f"Trust deficit ({trust}/100)"]

        # Negative shift
        if neg_delta > 0:
            score += neg_delta * 0.3
            factors.append(f"Trust declined by {neg_delta} points")

        # Contradictions
        if contras > 0:
            score += contras * weights["w_contra"]
            factors.append(f"Involved in {contras} contradiction(s)")

        # Accusations
        if accs > 0:
            score += accs * weights["w_acc"]
            factors.append(f"Accused {accs} time(s) in chamber")

        # Social Heat
        score += heat * 0.15

        # Focus target bonus
        if voter.strategic_state and voter.strategic_state.focus_agent_id == cand.id:
            score += 15.0
            factors.append("Active strategic focus")

        # Loyalty discount for allies
        is_ally = (voter.strategic_state and cand.id in voter.strategic_state.alliance_target_ids) or (rel and rel.alignment_score >= 65)
        if is_ally:
            score -= weights["loyalty_discount"]
            factors.append(f"Loyalty discount (-{weights['loyalty_discount']:.0f} pts)")

        # Tie breaking: prefer higher contradiction count, then lower string ID
        if (score > best_score) or (score == best_score and (contras > candidate_contras.get(best_target.id, 0) or cand.id < best_target.id)):
            best_score = score
            best_target = cand
            best_factors = factors

    rationale = VoteRationale(
        voter_id=voter.id,
        target_id=best_target.id,
        target_name=best_target.name,
        score=round(best_score, 1),
        factors=best_factors,
    )
    return best_target.id, rationale


def build_agent_journeys(game_state: GameState, traitor_id: str = "", outcome: str = "innocents_win") -> dict[str, dict]:
    """Compiles chronological agent journeys for post-game retrospective."""
    if not traitor_id:
        t = next((a for a in game_state.agents if a.role == "traitor"), None)
        traitor_id = t.id if t else (game_state.agents[0].id if game_state.agents else "")
    journeys: dict[str, dict] = {}
    traitor = next((a for a in game_state.agents if a.id == traitor_id), None)
    traitor_name = traitor.name if traitor else "the traitor"

    for agent in game_state.agents:
        final_trust_in_traitor = agent.private_trust.get(traitor_id, 50)
        rel_mem = agent.memory_ledger.relationship_memories.get(traitor_id) if hasattr(agent, "memory_ledger") else None
        init_trust_in_traitor = 60
        delta_in_traitor = rel_mem.net_delta if rel_mem else (final_trust_in_traitor - init_trust_in_traitor)

        vote_target_id = game_state.votes.get(agent.id)
        vote_target_name = _id_to_name(game_state, vote_target_id) if vote_target_id else "Abstained"

        # Correctness logic
        if agent.role == "innocent":
            was_correct = (vote_target_id == traitor_id)
        else:  # traitor
            was_correct = (outcome == "traitor_wins")

        # Key statements
        my_statements = [s.get("text", "") for s in game_state.transcript if s.get("speaker_id") == agent.id]

        if agent.role == "traitor":
            summary = (
                f"{agent.name} acted as the traitor, maintaining an average trust of {final_trust_in_traitor}/100. "
                + ("Successfully misled the court into banishing an innocent." if was_correct else "Was ultimately exposed by council scrutiny.")
            )
        else:
            if was_correct:
                summary = f"{agent.name} correctly identified {traitor_name}, seeing through their testimony and casting their vote for banishment."
            else:
                summary = f"{agent.name} was misled, directing their vote toward {vote_target_name} rather than {traitor_name}."

        journeys[agent.id] = {
            "agent_id": agent.id,
            "agent_name": agent.name,
            "role": agent.role,
            "personality": agent.personality,
            "initial_trust_in_traitor": init_trust_in_traitor,
            "final_trust_in_traitor": final_trust_in_traitor,
            "net_trust_delta_traitor": delta_in_traitor,
            "vote_target_id": vote_target_id,
            "vote_target_name": vote_target_name,
            "final_vote": vote_target_name,
            "was_correct": was_correct,
            "key_statement": my_statements[0][:80] + "..." if my_statements else "Observed court silently.",
            "journey_summary": summary,
        }

    return journeys


def _id_to_name(game_state: GameState, agent_id: str) -> str:
    for a in game_state.agents:
        if a.id == agent_id:
            return a.name
    return agent_id

