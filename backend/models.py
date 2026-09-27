"""
Whisper Court - Pydantic data models.
"""

from pydantic import BaseModel, Field


class StrategicState(BaseModel):
    """Structured strategic focus and commitments of an agent or seat."""

    focus_agent_id: str | None = None
    focus_agent_name: str | None = None
    focus_topic: str = ""
    public_position: str = ""
    defensive_target_id: str | None = None
    defensive_target_name: str | None = None
    alliance_target_ids: list[str] = Field(default_factory=list)
    investigation_target_id: str | None = None
    recent_strategy: str = ""


class RelationshipMemory(BaseModel):
    """Historical memory and tracking of an agent pair relationship."""

    target_id: str
    target_name: str
    current_trust: int = 60
    historical_high: int = 60
    historical_low: int = 60
    net_delta: int = 0
    accusations_made: int = 0
    defenses_given: int = 0
    contradictions_count: int = 0
    alignment_score: int = 50  # 0 to 100 derived social alignment
    last_interaction_round: int = 1


class HumanBehaviorProfile(BaseModel):
    """Tracked strategic tendencies of a human player for seamless AI continuity."""

    question_count: int = 0
    accusation_count: int = 0
    defense_count: int = 0
    silence_count: int = 0
    preferred_target_id: str | None = None
    preferred_target_name: str | None = None
    voted_against_id: str | None = None
    voted_against_name: str | None = None
    target_interaction_counts: dict[str, int] = Field(default_factory=dict)
    target_accusation_counts: dict[str, int] = Field(default_factory=dict)
    target_defense_counts: dict[str, int] = Field(default_factory=dict)
    question_tendency: str = "medium"  # "low" | "medium" | "high"
    accusation_tendency: str = "medium"
    defense_tendency: str = "medium"
    recent_strategic_focus: str = ""


class VoteRationale(BaseModel):
    """Deterministic multi-factor rationale for an agent's vote."""

    voter_id: str
    target_id: str
    target_name: str
    score: float
    factors: list[str] = Field(default_factory=list)


class AgentMemoryLedger(BaseModel):
    """Persistent structured memory ledger for an agent seat."""

    agent_id: str = ""
    known_facts: list[str] = Field(default_factory=list)
    observed_claim_ids: list[str] = Field(default_factory=list)
    relationship_memories: dict[str, RelationshipMemory] = Field(default_factory=dict)
    public_positions: list[str] = Field(default_factory=list)
    accusations_made: list[dict] = Field(default_factory=list)
    accusations_received: list[dict] = Field(default_factory=list)
    defended_agents: list[str] = Field(default_factory=list)
    challenged_agents: list[str] = Field(default_factory=list)
    vote_history: list[dict] = Field(default_factory=list)
    strategic_commitments: list[str] = Field(default_factory=list)
    human_profile: HumanBehaviorProfile = Field(default_factory=HumanBehaviorProfile)
    takeover_briefing: str = ""


class Agent(BaseModel):
    """A single player (human or AI) in a Whisper Court game."""

    id: str
    name: str
    personality: str = ""  # e.g. "paranoid and theatrical, speaks in metaphors"
    is_human: bool = False
    control_type: str = "ai"  # "human" or "ai"
    controller_state: str = "ai"  # "ai" | "human_active" | "ai_takeover" | "reclaimed"
    connection_status: str = "connected"  # "connected" or "disconnected"
    player_id: str | None = None
    player_name: str | None = None
    is_host: bool = False
    reclaim_token: str | None = None
    role: str = "innocent"  # "innocent", "traitor", "seer", etc.
    is_alive: bool = True
    private_trust: dict[str, int] = Field(
        default_factory=dict,
        description="Maps other agent IDs → trust score (0-100). "
        "50 is neutral, 0 is absolute distrust, 100 is blind faith.",
    )
    memory: list[str] = Field(
        default_factory=list,
        description="Running log of things this agent has personally observed or been told.",
    )
    strategic_state: StrategicState = Field(default_factory=StrategicState)
    memory_ledger: AgentMemoryLedger = Field(default_factory=AgentMemoryLedger)
    last_vote_rationale: VoteRationale | None = None


class Claim(BaseModel):
    """A structured assertion made during court testimony."""

    claim_id: str
    statement_id: str
    speaker_id: str
    speaker_name: str
    target_id: str | None = None
    target_name: str | None = None
    claim_type: str = "observation"  # "observation" | "alibi" | "accusation" | "defense"
    subject: str = ""  # location or topic (e.g. "archive", "library", "garden")
    polarity: str = "affirmative"  # "affirmative" | "negative"
    round_number: int = 1
    quote: str = ""
    confidence: float = 0.85


class Contradiction(BaseModel):
    """A detected conflict between two court testimonies."""

    contradiction_id: str
    claim_a_id: str
    claim_b_id: str
    statement_a_id: str
    statement_b_id: str
    speaker_a: str
    speaker_b: str
    target_name: str = ""
    description: str
    severity: str = "direct_conflict"  # "direct_conflict" | "timeline_inconsistency" | "mutual_accusation"
    detected_round: int = 1
    resolved: bool = False


class InfluenceEvent(BaseModel):
    """Directional shift in trust caused by a specific statement."""

    influence_id: str
    statement_id: str
    speaker_id: str
    speaker_name: str
    evaluator_id: str
    evaluator_name: str
    delta: int
    reason: str = ""
    round_number: int = 1
    timestamp: float = 0.0


class SocialHeatPair(BaseModel):
    """Pairwise tension metric between two living agents."""

    agent_a_id: str
    agent_a_name: str
    agent_b_id: str
    agent_b_name: str
    tension_score: int = 0  # 0 to 100
    heat_level: str = "calm"  # "calm" | "watch" | "tense" | "volatile"
    factors: list[str] = Field(default_factory=list)


class SocialEvent(BaseModel):
    """Chronological court event item for the Observatory and Replay engine."""

    event_id: str
    timestamp: float
    round_number: int
    phase: str = "discussion"
    event_type: str  # "STATEMENT" | "QUESTION" | "ACCUSATION" | "DEFENSE" | "TRUST_CHANGE" | "INFLUENCE" | "CONTRADICTION" | "ALLIANCE_SHIFT" | "VOTE" | "ELIMINATION" | "ROLE_REVEAL"
    actor_id: str = ""
    actor_name: str = ""
    target_id: str | None = None
    target_name: str | None = None
    statement_id: str | None = None
    magnitude: int = 0
    description: str = ""
    public_visibility: bool = True


class CourtAnalysis(BaseModel):
    """Post-game full court retrospective (unlocked after role reveal)."""

    traitor_id: str = ""
    traitor_name: str = ""
    outcome: str = ""  # "innocents_win" | "traitor_wins"
    first_suspicion_round: int = 1
    first_suspicion_text: str = ""
    turning_point_statement: str = ""
    turning_point_speaker: str = ""
    largest_trust_collapse: dict = Field(default_factory=dict)
    most_influential_speaker: str = ""
    most_influential_delta: int = 0
    critical_contradiction: str = ""
    final_coalition: list[str] = Field(default_factory=list)
    narrative_summary: str = ""
    agent_journeys: dict[str, dict] = Field(default_factory=dict)
    vote_rationales: list[dict] = Field(default_factory=list)


class GameState(BaseModel):
    """The full state of a single Whisper Court game."""

    game_id: str
    agents: list[Agent] = Field(default_factory=list)
    round_number: int = 1
    transcript: list[dict] = Field(
        default_factory=list,
        description="Each entry: {'speaker_id': str, 'text': str, 'round_number': int}",
    )
    phase: str = "discussion"  # "discussion", "voting", "reveal", "ended"
    votes: dict[str, str] = Field(
        default_factory=dict,
        description="Maps voter_id → accused_id for the current voting round.",
    )
    trust_log: list[dict] = Field(
        default_factory=list,
        description="Recent trust changes: [{trust_event_id, statement_id, evaluator_id, evaluator_name, target_id, target_name, old_score, new_score, delta, reason}]",
    )
    evaluated_statements: set[str] = Field(
        default_factory=set,
        description="Set of '{statement_id}::{evaluator_id}' keys preventing duplicate trust evaluations.",
    )
    claims: list["Claim"] = Field(
        default_factory=list,
        description="Structured claims made during testimonies.",
    )
    contradictions: list["Contradiction"] = Field(
        default_factory=list,
        description="Detected conflicts between statements.",
    )
    influence_events: list["InfluenceEvent"] = Field(
        default_factory=list,
        description="Recorded influence shifts where statements moved others' trust.",
    )
    social_events: list["SocialEvent"] = Field(
        default_factory=list,
        description="Chronological stream of court social events.",
    )
    social_heat: list["SocialHeatPair"] = Field(
        default_factory=list,
        description="Current pairwise tension scores between all agents.",
    )
    court_analysis: "CourtAnalysis | None" = None


class SeatInfo(BaseModel):
    """Public seat information shared with lobby and clients."""

    seat_id: str
    character_name: str
    character_archetype: str = ""
    control_type: str = "ai"  # "human" | "ai"
    connection_status: str = "connected"  # "connected" | "disconnected"
    player_name: str | None = None
    is_host: bool = False
    is_alive: bool = True


class RoomInfo(BaseModel):
    """Room metadata for lobby and matchmaking."""

    room_id: str
    join_code: str
    host_player_id: str
    court_size: int = 5
    game_mode: str = "traitor"
    started: bool = False
    seats: list[SeatInfo] = Field(default_factory=list)
