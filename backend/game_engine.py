"""
Whisper Court - Core game engine.

Orchestrates game creation, discussion rounds, voting, elimination,
and win-condition checks. All Groq calls are sequential for now.
"""

import json
import re
import random
import uuid
import time
import asyncio

from agent import apply_trust_update, build_system_prompt, build_trust_update_prompt
from groq_client import get_agent_response, get_agent_response_async
from models import (
    Agent,
    Claim,
    Contradiction,
    CourtAnalysis,
    GameState,
    InfluenceEvent,
    SocialEvent,
    SocialHeatPair,
)
import social_engine


# ---------------------------------------------------------------------------
# Pre-built personas (pick from these when creating AI agents)
# ---------------------------------------------------------------------------

PERSONAS = [
    {
        "name": "Lord Ashwick",
        "personality": (
            "The Overconfident Detective - speaks with absolute certainty, "
            "enjoys cornering others with pointed questions, and rarely "
            "admits when he's wrong."
        ),
    },
    {
        "name": "Sister Vael",
        "personality": (
            "The Nervous Newcomer - fidgets with words, second-guesses "
            "herself often, apologises before making accusations, but "
            "occasionally blurts out shockingly sharp observations."
        ),
    },
    {
        "name": "Duchess Morvaine",
        "personality": (
            "The Charming Liar - drips honey and flattery, deflects "
            "suspicion with compliments, and always has a convenient alibi. "
            "Speaks in a smooth, theatrical cadence."
        ),
    },
    {
        "name": "Old Renner",
        "personality": (
            "The Quiet Observer - says very little, but when he speaks "
            "it carries weight. Prefers to watch others argue before "
            "delivering a dry, devastating one-liner."
        ),
    },
    {
        "name": "Captain Brask",
        "personality": (
            "The Loud Accuser - brash, confrontational, and always the "
            "first to point a finger. Speaks in short, punchy declarations "
            "and takes everything personally."
        ),
    },
    {
        "name": "Mira Solenne",
        "personality": (
            "The Loyal Friend - warm and protective, always defending "
            "someone. Trusts easily and takes betrayal very hard. "
            "Speaks with genuine emotion and empathy."
        ),
    },
]

# Trust-update system prompt (used for the JSON trust-eval call)
_TRUST_JSON_SYSTEM = (
    "You are a game analysis assistant. When asked about trust changes, "
    "respond with a JSON object containing trust_delta (an integer) and "
    "reason (a short string). Example: "
    '{"trust_delta": -10, "reason": "suspicious deflection"}'
)


class GameEngine:
    """Manages a single Whisper Court game session."""

    # ------------------------------------------------------------------
    # 1. Game creation
    # ------------------------------------------------------------------

    @staticmethod
    def create_game(num_agents: int = 5, num_humans: int = 1) -> GameState:
        """Set up a new game with *num_agents* total players.

        Parameters
        ----------
        num_agents : int
            Total number of seats (AI + human).
        num_humans : int
            How many of those seats are reserved for human players.
            Human seats are placed at the front of the agent list.
        """

        if num_agents > len(PERSONAS):
            raise ValueError(f"Max {len(PERSONAS)} agents supported (requested {num_agents})")
        if num_humans > num_agents:
            raise ValueError("num_humans cannot exceed num_agents")

        game_id = uuid.uuid4().hex[:8]
        print(f"\n{'='*60}")
        print(f"[engine] Creating game {game_id}  |  {num_agents} players  |  {num_humans} human(s)")
        print(f"{'='*60}")

        # Shuffle personas and pick the first num_agents
        chosen = random.sample(PERSONAS, num_agents)

        # Build Agent objects
        agents: list[Agent] = []
        for idx, persona in enumerate(chosen):
            is_hum = (idx < num_humans)
            agent = Agent(
                id=f"agent_{idx}",
                name=persona["name"],
                personality=persona["personality"],
                is_human=is_hum,
                control_type="human" if is_hum else "ai",
                connection_status="connected",
                role="innocent",  # will override one below
                is_alive=True,
            )
            agents.append(agent)

        # Assign exactly one traitor (from AI agents only, unless there's only humans)
        ai_agents = [a for a in agents if not a.is_human]
        traitor = random.choice(ai_agents) if ai_agents else random.choice(agents)
        traitor.role = "traitor"

        # Initialise trust and structured memory ledger
        for agent in agents:
            agent.private_trust = {
                other.id: 60 for other in agents if other.id != agent.id
            }
            social_engine.init_agent_memory(agent, agents)

        # Log
        for a in agents:
            tag = "👤 HUMAN" if a.is_human else "🤖 AI"
            role_tag = "🗡️ TRAITOR" if a.role == "traitor" else "🕊️ innocent"
            print(f"  [{tag}] {a.name}  (id={a.id})  role={role_tag}")

        game_state = GameState(game_id=game_id, agents=agents)

        # Baseline social heat between all seated agents
        trust_snap = {a.id: dict(a.private_trust) for a in agents}
        game_state.social_heat = social_engine.calculate_social_heat(
            agents=agents,
            trust_data=trust_snap,
            contradictions=[],
            transcript=[],
            influence_events=[],
        )

        print(f"[engine] Game {game_id} created - phase: {game_state.phase}\n")
        return game_state

    # ------------------------------------------------------------------
    # 2. Discussion round (Async & Sync with Telemetry & Idempotency)
    # ------------------------------------------------------------------

    @staticmethod
    async def _evaluate_single_trust_async(
        evaluator: Agent,
        speaker: Agent,
        statement_id: str,
        statement: str,
        game_state: GameState,
        room_id: str = "",
    ) -> None:
        """Evaluate trust delta from evaluator toward speaker for statement_id idempotently."""
        # 1. Guards
        if evaluator.id == speaker.id:
            return
        if not evaluator.is_alive:
            return
        if getattr(evaluator, "control_type", "human" if evaluator.is_human else "ai") != "ai":
            return

        # 2. Idempotency guard: statement_id + evaluator_id
        eval_key = f"{statement_id}::{evaluator.id}"
        if eval_key in game_state.evaluated_statements:
            print(f"[engine] ⚠️ Skip duplicate trust eval: {eval_key}")
            return
        game_state.evaluated_statements.add(eval_key)

        old_score = evaluator.private_trust.get(speaker.id, 50)
        trust_prompt = build_trust_update_prompt(evaluator, statement, speaker.name)

        raw_response = await get_agent_response_async(
            system_prompt=_TRUST_JSON_SYSTEM,
            conversation_history=[],
            user_message=trust_prompt,
            max_tokens=128,
            temperature=0.4,
            game_id=game_state.game_id,
            room_id=room_id,
            round_number=game_state.round_number,
            phase="discussion",
            agent_id=evaluator.id,
            agent_name=evaluator.name,
            call_type="trust_evaluation",
            trigger="post_statement_trust",
        )

        delta, reason = _parse_trust_json(raw_response)

        # Apply persona traits weighting (Feature 12)
        adjusted_delta = social_engine.apply_persona_trust_modifier(
            evaluator=evaluator,
            speaker=speaker,
            raw_delta=delta,
            statement_text=statement,
            contradictions=game_state.contradictions,
        )

        apply_trust_update(evaluator, speaker.id, adjusted_delta)
        new_score = evaluator.private_trust.get(speaker.id, 50)

        # Update persistent relationship memory & social alignment (Master Prompt 06)
        social_engine.update_agent_memory_from_trust(
            evaluator=evaluator,
            target_id=speaker.id,
            target_name=speaker.name,
            delta=adjusted_delta,
            reason=reason,
            round_num=game_state.round_number,
        )

        trust_event_id = f"trust_evt_{uuid.uuid4().hex[:8]}"

        # Record influence event (Feature 5)
        inf_evt = social_engine.create_influence_event(
            statement_id=statement_id,
            speaker_id=speaker.id,
            speaker_name=speaker.name,
            evaluator_id=evaluator.id,
            evaluator_name=evaluator.name,
            delta=adjusted_delta,
            reason=reason,
            round_number=game_state.round_number,
        )
        game_state.influence_events.append(inf_evt)

        # Record SocialEvent for timeline (Feature 7)
        game_state.social_events.append(SocialEvent(
            event_id=f"evt_{uuid.uuid4().hex[:8]}",
            timestamp=time.time(),
            round_number=game_state.round_number,
            phase="discussion",
            event_type="TRUST_CHANGE",
            actor_id=speaker.id,
            actor_name=speaker.name,
            target_id=evaluator.id,
            target_name=evaluator.name,
            statement_id=statement_id,
            magnitude=adjusted_delta,
            description=f"{evaluator.name}'s trust in {speaker.name} {'rose' if adjusted_delta > 0 else 'fell'} by {abs(adjusted_delta)} ({reason})",
            public_visibility=True,
        ))

        # Structured log
        print(
            f"[TRUST] game={game_state.game_id[:8]} "
            f"statement={statement_id} "
            f"evaluator={evaluator.name} "
            f"target={speaker.name} "
            f"delta={adjusted_delta:+d} "
            f"old={old_score} "
            f"new={new_score} "
            f"reason=\"{reason}\""
        )

        # Log for frontend and audit trail
        game_state.trust_log.append({
            "trust_event_id": trust_event_id,
            "statement_id": statement_id,
            "evaluator_id": evaluator.id,
            "evaluator_name": evaluator.name,
            "target_id": speaker.id,
            "target_name": speaker.name,
            "old_score": old_score,
            "new_score": new_score,
            "delta": adjusted_delta,
            "reason": reason,
        })

    @staticmethod
    async def run_discussion_round_async(game_state: GameState, room_id: str = "") -> GameState:
        """Each living AI agent speaks once, in turn order.

        After each statement:
 - A unique statement_id is minted (stmt_r{round}_{speaker_id}_{hash}).
 - Appended to transcript with metadata.
 - Appended to every OTHER living agent's memory.
 - Claims are extracted and contradictions detected deterministically.
 - Every other living AI agent concurrently evaluates trust (bounded by MAX_CONCURRENT_LLM_CALLS = 4).
        """
        round_num = game_state.round_number
        print(f"\n{'─'*60}")
        print(f"[engine] ── Discussion Round {round_num} ──")
        print(f"{'─'*60}")

        living = [a for a in game_state.agents if a.is_alive]
        living_ai = [a for a in living if getattr(a, "control_type", "human" if a.is_human else "ai") == "ai"]

        game_context = (
            f"Round {round_num}, discussion phase. "
            f"{len(living)} players are still alive: "
            f"{', '.join(a.name for a in living)}."
        )

        for speaker in living_ai:
            print(f"\n[engine] 🎤 {speaker.name}'s turn to speak …")

            # Build conversation history from this agent's recent memory
            history = [{"role": "user", "content": m[:140]} for m in speaker.memory[-4:]]
            system_prompt = build_system_prompt(speaker, game_context)

            statement = await get_agent_response_async(
                system_prompt=system_prompt,
                conversation_history=history,
                user_message=(
                    "It's your turn to speak to the court. "
                    "Share information, defend yourself, or make an accusation. "
                    "Stay in character. Be concise (1-3 sentences)."
                ),
                max_tokens=220,
                game_id=game_state.game_id,
                room_id=room_id,
                round_number=round_num,
                phase="discussion",
                agent_id=speaker.id,
                agent_name=speaker.name,
                call_type="speech",
                trigger="agent_statement",
            )

            statement_id = f"stmt_r{round_num}_{speaker.id}_{uuid.uuid4().hex[:6]}"
            print(f"[engine] 💬 {speaker.name} ({statement_id}): {statement}")

            # Record in transcript
            stmt_dict = {
                "statement_id": statement_id,
                "game_id": game_state.game_id,
                "speaker_id": speaker.id,
                "speaker_name": speaker.name,
                "text": statement,
                "round_number": round_num,
                "timestamp": time.time(),
            }
            game_state.transcript.append(stmt_dict)

            # Feature 1: Structured Claim Extraction
            new_claims = social_engine.extract_claims_from_statement(stmt_dict, game_state.agents)
            prior_claims = list(game_state.claims)
            game_state.claims.extend(new_claims)

            # Feature 7: Timeline Social Event for Statement
            tag = "ACCUSATION" if any(w in statement.lower() for w in social_engine.ACCUSATION_WORDS) else (
                "DEFENSE" if any(w in statement.lower() for w in social_engine.DEFENSE_WORDS) else "STATEMENT"
            )
            game_state.social_events.append(SocialEvent(
                event_id=f"evt_{uuid.uuid4().hex[:8]}",
                timestamp=time.time(),
                round_number=round_num,
                phase="discussion",
                event_type=tag,
                actor_id=speaker.id,
                actor_name=speaker.name,
                statement_id=statement_id,
                description=f"{speaker.name} testified: \"{statement[:90]}{'…' if len(statement) > 90 else ''}\"",
                public_visibility=True,
            ))

            # Feature 2: Contradiction Detection
            if prior_claims and new_claims:
                new_contras = social_engine.detect_contradictions(
                    existing_claims=prior_claims,
                    new_claims=new_claims,
                    current_round=round_num,
                )
                for ct in new_contras:
                    game_state.contradictions.append(ct)
                    game_state.social_events.append(SocialEvent(
                        event_id=f"evt_{uuid.uuid4().hex[:8]}",
                        timestamp=time.time(),
                        round_number=round_num,
                        phase="discussion",
                        event_type="CONTRADICTION",
                        actor_id=speaker.id,
                        actor_name=speaker.name,
                        statement_id=statement_id,
                        description=f"Contradiction detected: {ct.description}",
                        public_visibility=True,
                    ))
                    print(f"[CONTRADICTION] round={round_num} {ct.description}")

            # Push statement into every OTHER living agent's memory
            for other in living:
                if other.id != speaker.id:
                    other.memory.append(f"{speaker.name} said: \"{statement}\"")

            # Update structured memory ledger for all living agents (Master Prompt 06)
            for person in living:
                social_engine.update_agent_memory_from_statement(
                    agent=person,
                    stmt_dict=stmt_dict,
                    claims=new_claims,
                    contradictions=new_contras if (prior_claims and new_claims) else [],
                    game_state=game_state,
                )

            # Trust updates: run concurrently across other living AI agents
            # Bounded concurrency (MAX_CONCURRENT_LLM_CALLS = 4) is enforced in groq_client.py
            eval_tasks = [
                GameEngine._evaluate_single_trust_async(
                    evaluator=evaluator,
                    speaker=speaker,
                    statement_id=statement_id,
                    statement=statement,
                    game_state=game_state,
                    room_id=room_id,
                )
                for evaluator in living_ai
                if evaluator.id != speaker.id
            ]

            if eval_tasks:
                await asyncio.gather(*eval_tasks)

        # Feature 6: Recompute Social Heat at the conclusion of discussion round
        trust_snap = {a.id: dict(a.private_trust) for a in game_state.agents}
        game_state.social_heat = social_engine.calculate_social_heat(
            agents=game_state.agents,
            trust_data=trust_snap,
            contradictions=game_state.contradictions,
            transcript=game_state.transcript,
            influence_events=game_state.influence_events,
        )

        game_state.round_number += 1
        print(f"\n[engine] Discussion round complete. Moving to round {game_state.round_number}.")
        return game_state

    @staticmethod
    def run_discussion_round(game_state: GameState, room_id: str = "") -> GameState:
        """Synchronous wrapper for legacy callers."""
        try:
            loop = asyncio.get_running_loop()
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(
                    asyncio.run,
                    GameEngine.run_discussion_round_async(game_state, room_id),
                ).result()
        except RuntimeError:
            return asyncio.run(GameEngine.run_discussion_round_async(game_state, room_id))

    # ------------------------------------------------------------------
    # 3. Voting round
    # ------------------------------------------------------------------

    @staticmethod
    def run_voting_round(game_state: GameState) -> GameState:
        """Each living AI agent votes to eliminate the player they trust least.

        Human votes must already be set in ``game_state.votes`` before calling
        this method.
        """

        print(f"\n{'─'*60}")
        print(f"[engine] ── Voting Round ──")
        print(f"{'─'*60}")

        living = [a for a in game_state.agents if a.is_alive]

        for voter in living:
            is_human_ctrl = getattr(voter, 'control_type', 'human' if voter.is_human else 'ai') == 'human'
            if is_human_ctrl:
                if voter.id in game_state.votes:
                    target_name = _id_to_name(game_state, game_state.votes[voter.id])
                    print(f"[engine] 🗳️  {voter.name} (human) voted for {target_name}")
                else:
                    print(f"[engine] ⚠️  {voter.name} (human) has not voted - skipping")
                continue

            # AI: Deterministic multi-factor vote target selection (Master Prompt 06)
            target_id, rationale = social_engine.calculate_agent_vote_target(voter, game_state)
            voter.last_vote_rationale = rationale

            if hasattr(voter, "memory_ledger") and voter.memory_ledger:
                voter.memory_ledger.vote_history.append({
                    "round": game_state.round_number,
                    "target_id": target_id,
                    "target_name": _id_to_name(game_state, target_id),
                    "score": rationale.score,
                    "factors": rationale.factors,
                })

            game_state.votes[voter.id] = target_id
            target_name = _id_to_name(game_state, target_id)
            print(
                f"[engine] 🗳️  {voter.name} votes to eliminate {target_name} "
                f"(score={rationale.score}, factors={rationale.factors[:2]})"
            )
            # Record SocialEvent for vote
            game_state.social_events.append(SocialEvent(
                event_id=f"evt_{uuid.uuid4().hex[:8]}",
                timestamp=time.time(),
                round_number=game_state.round_number,
                phase="voting",
                event_type="VOTE",
                actor_id=voter.id,
                actor_name=voter.name,
                target_id=target_id,
                target_name=target_name,
                description=f"{voter.name} cast ballot to banish {target_name}",
                public_visibility=True,
            ))

        print(f"[engine] All votes cast: {_votes_summary(game_state)}")
        return game_state

    # ------------------------------------------------------------------
    # 4. Resolve votes
    # ------------------------------------------------------------------

    @staticmethod
    def resolve_votes(game_state: GameState) -> dict:
        """Tally votes, eliminate the most-voted agent, return a summary."""

        print(f"\n{'─'*60}")
        print(f"[engine] ── Resolving Votes ──")
        print(f"{'─'*60}")

        # Tally
        tally: dict[str, int] = {}
        for accused_id in game_state.votes.values():
            tally[accused_id] = tally.get(accused_id, 0) + 1

        if not tally:
            print("[engine] No votes were cast - nobody is eliminated.")
            return {"eliminated": None}

        max_votes = max(tally.values())
        top = [aid for aid, count in tally.items() if count == max_votes]
        eliminated_id = random.choice(top)  # break ties randomly

        # Find the agent
        eliminated = next(a for a in game_state.agents if a.id == eliminated_id)
        eliminated.is_alive = False

        # Snapshot trust scores everyone had toward the eliminated agent
        trust_snapshot: dict[str, int] = {}
        for a in game_state.agents:
            if a.id != eliminated_id:
                trust_snapshot[a.name] = a.private_trust.get(eliminated_id, -1)

        summary = {
            "eliminated": eliminated.name,
            "eliminated_id": eliminated.id,
            "true_role": eliminated.role,
            "votes_received": max_votes,
            "vote_tally": {_id_to_name(game_state, k): v for k, v in tally.items()},
            "trust_snapshot": trust_snapshot,
        }

        role_emoji = "🗡️" if eliminated.role == "traitor" else "🕊️"
        print(f"[engine] ⚖️  {eliminated.name} is ELIMINATED  ({role_emoji} {eliminated.role})")
        print(f"[engine]    Votes: {summary['vote_tally']}")
        print(f"[engine]    Trust at time of death: {trust_snapshot}")

        # Record SocialEvent for elimination
        game_state.social_events.append(SocialEvent(
            event_id=f"evt_{uuid.uuid4().hex[:8]}",
            timestamp=time.time(),
            round_number=game_state.round_number,
            phase="reveal",
            event_type="ELIMINATION",
            actor_id=eliminated.id,
            actor_name=eliminated.name,
            description=f"{eliminated.name} was banished by decree of the court ({max_votes} votes)",
            public_visibility=True,
        ))

        # Add to every living agent's memory
        for a in game_state.agents:
            if a.is_alive and a.id != eliminated_id:
                a.memory.append(
                    f"{eliminated.name} was eliminated by the court. "
                    f"Their true role was revealed: {eliminated.role}."
                )

        # Clear votes for next round
        game_state.votes = {}
        game_state.phase = "reveal"

        return summary

    # ------------------------------------------------------------------
    # 5. Win condition
    # ------------------------------------------------------------------

    @staticmethod
    def check_win_condition(game_state: GameState) -> str | None:
        """Check if the game is over.

        Returns
        -------
        "innocents_win" - the traitor has been eliminated.
        "traitor_wins" - only 2 players remain and one is the traitor.
        None - game continues.
        """

        living = [a for a in game_state.agents if a.is_alive]
        traitors_alive = [a for a in living if a.role == "traitor"]

        if not traitors_alive:
            print("[engine] 🎉 INNOCENTS WIN - the traitor has been eliminated!")
            game_state.phase = "ended"
            win = "innocents_win"
            game_state.court_analysis = social_engine.generate_court_analysis(game_state, win)
            game_state.social_events.append(SocialEvent(
                event_id=f"evt_{uuid.uuid4().hex[:8]}",
                timestamp=time.time(),
                round_number=game_state.round_number,
                phase="ended",
                event_type="ROLE_REVEAL",
                description="The court banished the traitor. Royal triumph for the innocents!",
                public_visibility=True,
            ))
            return win

        if len(living) <= 2 and traitors_alive:
            print("[engine] 💀 TRAITOR WINS - too few innocents remain!")
            game_state.phase = "ended"
            win = "traitor_wins"
            game_state.court_analysis = social_engine.generate_court_analysis(game_state, win)
            game_state.social_events.append(SocialEvent(
                event_id=f"evt_{uuid.uuid4().hex[:8]}",
                timestamp=time.time(),
                round_number=game_state.round_number,
                phase="ended",
                event_type="ROLE_REVEAL",
                description="The traitor divided and conquered the Whisper Court.",
                public_visibility=True,
            ))
            return win

        print(f"[engine] Game continues - {len(living)} alive, traitor still hidden.")
        return None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _id_to_name(game_state: GameState, agent_id: str) -> str:
    """Look up an agent's display name by ID."""
    for a in game_state.agents:
        if a.id == agent_id:
            return a.name
    return agent_id


def _is_alive(game_state: GameState, agent_id: str) -> bool:
    """Check whether a given agent is still alive."""
    for a in game_state.agents:
        if a.id == agent_id:
            return a.is_alive
    return False


def _votes_summary(game_state: GameState) -> str:
    """Pretty-print the current votes dict with names."""
    parts = []
    for voter_id, target_id in game_state.votes.items():
        voter = _id_to_name(game_state, voter_id)
        target = _id_to_name(game_state, target_id)
        parts.append(f"{voter} → {target}")
    return ", ".join(parts) if parts else "(none)"


def _parse_trust_json(raw: str) -> tuple[int, str]:
    """Best-effort parse of the LLM's trust-delta JSON response.

    Extracts JSON from anywhere in the response using multiple strategies.
    Returns (delta, reason). Falls back to (0, "parse error") on failure.
    """
    if not raw or not raw.strip():
        print(f"[engine]     ⚠️  Empty response from trust eval")
        return 0, "empty response"

    cleaned = raw.strip()

    # Strategy 1: Strip markdown code fences if present
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    # Strategy 2: Try direct JSON parse
    try:
        data = json.loads(cleaned)
        return _extract_delta(data)
    except json.JSONDecodeError:
        pass

    # Strategy 3: Find JSON object anywhere in text with regex
    json_match = re.search(r'\{[^{}]*"trust_delta"[^{}]*\}', cleaned)
    if json_match:
        try:
            data = json.loads(json_match.group())
            return _extract_delta(data)
        except json.JSONDecodeError:
            pass

    # Strategy 4: Try to extract numbers with regex as last resort
    delta_match = re.search(r'trust_delta["\s:]+(-?\d+)', cleaned)
    reason_match = re.search(r'reason["\s:]+["\']([^"\']+)["\']', cleaned)
    if delta_match:
        delta = int(delta_match.group(1))
        delta = max(-30, min(30, delta))
        reason = reason_match.group(1) if reason_match else "extracted via regex"
        return delta, reason

    print(f"[engine]     ⚠️  Could not parse trust JSON from: {raw!r}")
    return 0, "parse error"


def _extract_delta(data: dict) -> tuple[int, str]:
    """Pull trust_delta and reason from a parsed JSON dict."""
    delta = int(data.get("trust_delta", 0))
    delta = max(-30, min(30, delta))  # enforce bounds
    reason = str(data.get("reason", ""))
    return delta, reason


# ---------------------------------------------------------------------------
# Quick test harness
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    engine = GameEngine()

    # Create a 5-player game with 0 humans (fully AI for testing)
    gs = engine.create_game(num_agents=5, num_humans=0)

    # Run one discussion round
    gs = engine.run_discussion_round(gs)

    # Run voting
    gs.phase = "voting"
    gs = engine.run_voting_round(gs)

    # Resolve
    result = engine.resolve_votes(gs)
    print(f"\n[test] Elimination result: {json.dumps(result, indent=2)}")

    # Check win
    winner = engine.check_win_condition(gs)
    print(f"[test] Win condition: {winner}")
