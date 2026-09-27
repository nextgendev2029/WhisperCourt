"""
Whisper Court - AI agent prompt-building and trust logic.
"""

from models import Agent


# ---------------------------------------------------------------------------
# System prompt for in-game conversation
# ---------------------------------------------------------------------------

_ROLE_OBJECTIVES: dict[str, str] = {
    "innocent": (
        "You are INNOCENT. Your goal is to survive and help the court identify "
        "the traitor(s). Be honest - but remember, others may lie to you."
    ),
    "traitor": (
        "You are a TRAITOR. Your goal is to avoid suspicion and secretly "
        "manipulate the court into exiling innocent players. You may lie, "
        "deflect, and sow distrust - but be subtle about it."
    ),
    "seer": (
        "You are the SEER. Each night you learn one player's true alignment. "
        "Your goal is to guide the court toward the traitor without revealing "
        "yourself too early - the traitor will try to eliminate you if they "
        "figure out who you are."
    ),
}


def build_system_prompt(agent: Agent, game_context: str) -> str:
    """Construct the system prompt that defines an agent's persona and goals.

    Parameters
    ----------
    agent : Agent
        The agent this prompt is for.
    game_context : str
        A short paragraph describing the current state of the game
        (e.g. number of players alive, current phase, round number).

    Returns
    -------
    str
        A system prompt ready to pass to the LLM.
    """

    role_description = _ROLE_OBJECTIVES.get(agent.role, _ROLE_OBJECTIVES["innocent"])

    trust_summary = ""
    if agent.private_trust:
        trust_lines = [f" - {aid}: {score}/100" for aid, score in agent.private_trust.items()]
        trust_summary = (
            "\n\nYour current private trust scores for other players:\n"
            + "\n".join(trust_lines)
        )

    memory_summary = ""
    if agent.memory:
        recent = [m[:160] + ('…' if len(m) > 160 else '') for m in agent.memory[-6:]]
        memory_summary = (
            "\n\nYour personal memory (recent courtroom events):\n"
            + "\n".join(f" - {m}" for m in recent)
        )

    strategic_summary = ""
    if hasattr(agent, "strategic_state") and agent.strategic_state:
        lines = []
        if agent.strategic_state.public_position:
            lines.append(f" - Established public stance: {agent.strategic_state.public_position}")
        if agent.strategic_state.focus_agent_name:
            lines.append(f" - Target under your scrutiny: {agent.strategic_state.focus_agent_name}")
        if agent.strategic_state.defensive_target_name:
            lines.append(f" - Ally you have defended: {agent.strategic_state.defensive_target_name}")
        if lines:
            strategic_summary = "\n\nYour current strategic commitments & public positions:\n" + "\n".join(lines)

    takeover_block = ""
    if getattr(agent, "controller_state", "ai") == "ai_takeover":
        briefing = getattr(agent.memory_ledger, "takeover_briefing", "") if hasattr(agent, "memory_ledger") else ""
        if briefing:
            takeover_block = f"\n\n=== SEAT CONTINUITY BRIEFING ===\n{briefing}\n================================"

    return (
        f"You are {agent.name}, a character in a social-deduction game called Whisper Court.\n"
        f"\n"
        f"Personality: {agent.personality}\n"
        f"\n"
        f"SECRET ROLE (never reveal this directly):\n"
        f"{role_description}\n"
        f"\n"
        f"Rules you MUST follow:\n"
        f"- Stay in character at ALL times. Speak the way your personality dictates.\n"
        f"- Be consistent with things you have said in earlier rounds.\n"
        f"- You may lie, omit, or exaggerate if your role benefits from it.\n"
        f"- NEVER break character. NEVER mention that you are an AI, a language model, or a program.\n"
        f"- Keep responses concise - 1 to 3 sentences is ideal for discussion, unless making an accusation.\n"
        f"\n"
        f"Current game situation:\n"
        f"{game_context}"
        f"{trust_summary}"
        f"{strategic_summary}"
        f"{memory_summary}"
        f"{takeover_block}"
    )


# ---------------------------------------------------------------------------
# Trust-update prompt
# ---------------------------------------------------------------------------

def build_trust_update_prompt(
    agent: Agent, new_statement: str, speaker_name: str
) -> str:
    """Build a prompt that asks the model to evaluate how a new statement
    should change this agent's trust toward the speaker.

    The model is instructed to include a JSON object in its response.

    Parameters
    ----------
    agent : Agent
        The agent whose trust may change.
    new_statement : str
        What the speaker just said.
    speaker_name : str
        Display name of the speaker.

    Returns
    -------
    str
        A user-message prompt to send to the LLM.
    """

    memory_block = ""
    if agent.memory:
        recent = [m[:140] + ('…' if len(m) > 140 else '') for m in agent.memory[-3:]]
        memory_block = "Your recent observations:\n" + "\n".join(f" - {m}" for m in recent)

    return (
        f"You are {agent.name} ({agent.personality}).\n"
        f"\n"
        f"{memory_block}\n"
        f"\n"
        f"{speaker_name} just said: \"{new_statement}\"\n"
        f"\n"
        f"How does this change your trust toward {speaker_name}? "
        f"Give a trust_delta between -30 and +30 and a short reason.\n"
        f"\n"
        f"You must include exactly one JSON object in your answer, like this example:\n"
        f"{{\"trust_delta\": -15, \"reason\": \"contradicts earlier claim about being in the kitchen\"}}\n"
        f"\n"
        f"Write the JSON object now:"
    )


# ---------------------------------------------------------------------------
# Trust mutation helper
# ---------------------------------------------------------------------------

def apply_trust_update(agent: Agent, target_id: str, delta: int) -> None:
    """Update ``agent.private_trust[target_id]`` by *delta*, clamped to 0-100.

    If the target has no existing trust entry, it starts from 50 (neutral).
    """

    current = agent.private_trust.get(target_id, 50)
    agent.private_trust[target_id] = max(0, min(100, current + delta))
