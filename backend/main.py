"""
Whisper Court - FastAPI backend entry point with Multiplayer Living Court & Seat Continuity.
"""

import os
import json
import random
import asyncio
import time
import uuid
import string
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load environment configuration
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)
else:
    load_dotenv()

from agent import build_system_prompt
from groq_client import get_agent_response, get_agent_response_async
from llm_telemetry import telemetry
from game_engine import GameEngine, PERSONAS, _id_to_name
from models import Agent, GameState, RoomInfo, SeatInfo, SocialEvent
import social_engine


app = FastAPI(title="Whisper Court", version="0.3.0")

# ---------------------------------------------------------------------------
# CORS - allow Vite dev server during local development and configured origins
# ---------------------------------------------------------------------------
cors_env = os.getenv("CORS_ORIGINS", "")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if cors_env:
    for origin in cors_env.split(","):
        clean_origin = origin.strip()
        if clean_origin and clean_origin not in allowed_origins:
            allowed_origins.append(clean_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = GameEngine()

# Disconnect grace period before AI takeover (seconds)
DISCONNECT_GRACE_SECONDS = 15
VOTING_TIMEOUT_SECONDS = 30


# ---------------------------------------------------------------------------
# Room & Multiplayer State Management
# ---------------------------------------------------------------------------
class Room:
    def __init__(self, room_id: str, join_code: str, host_player_id: str, court_size: int = 5, game_mode: str = "traitor"):
        self.room_id = room_id
        self.join_code = join_code
        self.host_player_id = host_player_id
        self.court_size = court_size
        self.game_mode = game_mode
        self.started = False
        self.game_state: GameState | None = None

        # Room-level Game Loop Authority & Lock
        self.game_running: bool = False
        self.game_lock: asyncio.Lock = asyncio.Lock()
        self.game_task: asyncio.Task | None = None

        # player_id -> { id, name, token, seat_id, is_host, connected, disconnect_time }
        self.players: dict[str, dict] = {}
        # player_id -> WebSocket
        self.connections: dict[str, WebSocket] = {}
        # player_id -> Task (grace period timer)
        self.grace_tasks: dict[str, asyncio.Task] = {}
        # player_id -> list of missed events while away
        self.missed_events: dict[str, list[dict]] = {}
        # voting timeout task
        self.voting_timeout_task: asyncio.Task | None = None
        self.created_at = time.time()



# In-memory stores
rooms: dict[str, Room] = {}
rooms_by_code: dict[str, str] = {}
legacy_games: dict[str, GameState] = {}


def generate_join_code() -> str:
    """Generate a clean 5-character room code (avoiding ambiguous letters/numbers)."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choices(chars, k=5))
        if code not in rooms_by_code:
            return code


def _build_trust_snapshot(game_state: GameState) -> dict:
    """Extract {agent_id: {other_id: score}} for all agents."""
    return {
        agent.id: dict(agent.private_trust)
        for agent in game_state.agents
    }


def _serialize_public_agent(agent: Agent, is_revealed: bool = False) -> dict:
    """Serialize agent for client broadcast, strictly omitting hidden role and private ledger during active play."""
    data = {
        "id": agent.id,
        "name": agent.name,
        "personality": agent.personality,
        "is_human": agent.is_human,
        "is_alive": agent.is_alive,
        "control_type": getattr(agent, "control_type", "human" if agent.is_human else "ai"),
        "connection_status": getattr(agent, "connection_status", "connected"),
        "player_id": getattr(agent, "player_id", None),
        "player_name": getattr(agent, "player_name", None),
        "is_host": getattr(agent, "is_host", False),
        "last_speech": getattr(agent, "last_speech", ""),
    }
    # Role is only revealed if dead or in post-game reveal/ended
    if is_revealed or not agent.is_alive:
        data["role"] = agent.role
        data["role_revealed"] = True
    return data


def _send_game_state(game_state: GameState) -> dict:
    """Build a full game_state message for client."""
    is_revealed = game_state.phase in ("reveal", "ended")
    return {
        "type": "game_state",
        "agents": [_serialize_public_agent(a, is_revealed=is_revealed) for a in game_state.agents],
        "round_number": game_state.round_number,
        "phase": game_state.phase,
        "trust_data": _build_trust_snapshot(game_state),
        "claims": [c.model_dump() for c in game_state.claims],
        "contradictions": [c.model_dump() for c in game_state.contradictions],
        "influence_events": [i.model_dump() for i in game_state.influence_events[-30:]],
        "social_heat": [h.model_dump() for h in game_state.social_heat],
        "social_events": [e.model_dump() for e in game_state.social_events[-50:]],
        "court_analysis": (
            game_state.court_analysis.model_dump()
            if (game_state.court_analysis and game_state.phase in ("reveal", "ended"))
            else None
        ),
    }


def get_room_state_dict(room: Room) -> dict:
    """Construct public room state for lobby and in-game roster."""
    seats_info = []

    if room.started and room.game_state:
        for a in room.game_state.agents:
            p = next((p for p in room.players.values() if p.get("seat_id") == a.id), None)
            seats_info.append({
                "seat_id": a.id,
                "character_name": a.name,
                "character_archetype": a.personality,
                "control_type": getattr(a, "control_type", "human" if a.is_human else "ai"),
                "connection_status": getattr(a, "connection_status", "connected"),
                "player_id": p["id"] if p else getattr(a, "player_id", None),
                "player_name": p["name"] if p else getattr(a, "player_name", None),
                "is_host": (p["id"] == room.host_player_id) if p else getattr(a, "is_host", False),
                "is_alive": a.is_alive,
            })
    else:
        # Lobby state preview
        for idx in range(room.court_size):
            seat_id = f"agent_{idx}"
            persona = PERSONAS[idx % len(PERSONAS)]
            p = next((p for p in room.players.values() if p.get("seat_id") == seat_id), None)
            seats_info.append({
                "seat_id": seat_id,
                "character_name": persona["name"],
                "character_archetype": persona["personality"],
                "control_type": "human" if p else "ai",
                "connection_status": "connected" if (p and p.get("connected")) else ("disconnected" if p else "connected"),
                "player_id": p["id"] if p else None,
                "player_name": p["name"] if p else None,
                "is_host": (p["id"] == room.host_player_id) if p else False,
                "is_alive": True,
            })

    connected_count = sum(1 for p in room.players.values() if p.get("connected", False))
    is_revealed = (room.game_state.phase in ("reveal", "ended")) if (room.started and room.game_state) else False

    return {
        "type": "room_state",
        "room_id": room.room_id,
        "join_code": room.join_code,
        "host_player_id": room.host_player_id,
        "court_size": room.court_size,
        "game_mode": room.game_mode,
        "started": room.started,
        "seats": seats_info,
        "agents": [_serialize_public_agent(a, is_revealed=is_revealed) for a in room.game_state.agents] if (room.started and room.game_state) else [],
        "connected_human_count": connected_count,
        "total_human_count": len(room.players),
        "players_count": len(room.players),
        "players": {pid: {"id": p["id"], "name": p["name"], "seat_id": p.get("seat_id")} for pid, p in room.players.items()},
    }


async def broadcast_to_room(room: Room, msg: dict):
    """Safely broadcast JSON payload to all active WebSockets in this room."""
    raw = json.dumps(msg)

    # Record important events into missed_events for any currently disconnected players
    if msg.get("type") in ("statement", "trust_update", "reveal", "win", "court_notice", "phase_change"):
        for pid, player in room.players.items():
            if not player.get("connected", False) and pid in room.missed_events:
                room.missed_events[pid].append(msg)

    dead_pids = []
    for pid, ws in list(room.connections.items()):
        try:
            await ws.send_text(raw)
        except Exception:
            dead_pids.append(pid)

    for pid in dead_pids:
        room.connections.pop(pid, None)


async def _send_round_statements(room: Room, gs: GameState, round_num: int, delay: float = 0.25):
    """Stream transcript entries for a given round one by one."""
    for entry in gs.transcript:
        if entry["round_number"] == round_num:
            agent = next((a for a in gs.agents if a.id == entry["speaker_id"]), None)
            speaker_name = agent.name if agent else entry.get("speaker_name", entry["speaker_id"])

            # Inform client of active speaker considering testimony
            await broadcast_to_room(room, {
                "type": "speaker_thinking",
                "speaker_id": entry["speaker_id"],
                "speaker_name": speaker_name,
            })
            await asyncio.sleep(min(delay, 0.5))

            await broadcast_to_room(room, {
                "type": "statement",
                "statement_id": entry.get("statement_id", ""),
                "speaker_id": entry["speaker_id"],
                "speaker_name": speaker_name,
                "text": entry["text"],
                "round_number": entry["round_number"],
            })
            await asyncio.sleep(delay)



async def _send_observatory_update(room: Room, gs: GameState):
    """Broadcast public observatory events and metrics to room."""
    await broadcast_to_room(room, {
        "type": "observatory_update",
        "claims": [c.model_dump() for c in gs.claims],
        "contradictions": [c.model_dump() for c in gs.contradictions],
        "influence_events": [i.model_dump() for i in gs.influence_events[-30:]],
        "social_heat": [h.model_dump() for h in gs.social_heat],
        "social_events": [e.model_dump() for e in gs.social_events[-50:]],
        "court_analysis": (
            gs.court_analysis.model_dump()
            if (gs.court_analysis and gs.phase in ("reveal", "ended"))
            else None
        ),
    })


async def _send_trust_update(room: Room, gs: GameState):
    """Send trust data + trust_log, then clear the log and broadcast observatory update."""
    await broadcast_to_room(room, {
        "type": "trust_update",
        "trust_data": _build_trust_snapshot(gs),
        "trust_log": list(gs.trust_log),
        "agents": [a.model_dump() for a in gs.agents],
        "social_heat": [h.model_dump() for h in gs.social_heat],
        "influence_events": [i.model_dump() for i in gs.influence_events[-30:]],
        "contradictions": [c.model_dump() for c in gs.contradictions],
    })
    gs.trust_log.clear()
    await _send_observatory_update(room, gs)


# ---------------------------------------------------------------------------
# Disconnect Grace Period & AI Takeover
# ---------------------------------------------------------------------------
async def _start_disconnect_grace_period(room: Room, player_id: str):
    player = room.players.get(player_id)
    if not player:
        return

    player_name = player["name"]
    seat_id = player.get("seat_id")
    player["connected"] = False
    player["disconnect_time"] = time.time()
    room.connections.pop(player_id, None)

    if player_id not in room.missed_events:
        room.missed_events[player_id] = []

    # Immediate host transfer if host disconnected
    if player_id == room.host_player_id:
        connected_humans = [p for p in room.players.values() if p.get("connected", False)]
        if connected_humans:
            new_host = connected_humans[0]
            room.host_player_id = new_host["id"]
            new_host["is_host"] = True
            player["is_host"] = False
            await broadcast_to_room(room, {
                "type": "court_notice",
                "notice": f"Host status transferred to {new_host['name']}.",
                "level": "info",
            })
            await broadcast_to_room(room, get_room_state_dict(room))

    # If game is actively running:
    if room.started and room.game_state and seat_id:
        agent = next((a for a in room.game_state.agents if a.id == seat_id), None)
        if agent:
            agent.connection_status = "disconnected"
            await broadcast_to_room(room, {
                "type": "court_notice",
                "notice": f"{player_name} disconnected. Reconnecting ({DISCONNECT_GRACE_SECONDS}s grace)...",
                "level": "warning",
                "seat_id": seat_id,
                "character_name": agent.name,
                "player_name": player_name,
            })
            await broadcast_to_room(room, get_room_state_dict(room))

        # Wait for grace period
        try:
            await asyncio.sleep(DISCONNECT_GRACE_SECONDS)
        except asyncio.CancelledError:
            # Reconnected before grace period expired
            return

        # If still disconnected after grace period: AI Takeover!
        if not player.get("connected", False) and room.started and room.game_state and seat_id:
            if agent:
                agent.control_type = "ai"
                agent.controller_state = "ai_takeover"
                agent.connection_status = "disconnected"
                briefing = social_engine.generate_takeover_briefing(agent, room.game_state)
                agent.memory_ledger.takeover_briefing = briefing
                print(f"[ROOM] room={room.join_code} player={player_name} seat={seat_id} event=ai_takeover")

                # Record SEAT_CONTROLLER_CHANGED event
                room.game_state.social_events.append(SocialEvent(
                    event_id=f"evt_{uuid.uuid4().hex[:8]}",
                    timestamp=time.time(),
                    round_number=room.game_state.round_number,
                    phase=room.game_state.phase,
                    event_type="SEAT_CONTROLLER_CHANGED",
                    actor_id=seat_id,
                    actor_name=agent.name,
                    description=f"Seat Continuity: {agent.name}'s seat continued under AI control.",
                    public_visibility=True,
                ))

                await broadcast_to_room(room, {
                    "type": "court_notice",
                    "notice": f"Seat Continuity: {agent.name} has left the court. Her seat remains occupied under AI control.",
                    "level": "info",
                    "seat_id": seat_id,
                    "character_name": agent.name,
                    "player_name": player_name,
                })
                await broadcast_to_room(room, {
                    "type": "control_changed",
                    "seat_id": seat_id,
                    "control_type": "ai",
                    "character_name": agent.name,
                    "player_name": player_name,
                })
                await broadcast_to_room(room, get_room_state_dict(room))

                # Check if this resolves pending votes
                if room.game_state.phase == "voting":
                    await _check_and_resolve_votes(room)

        # Host transfer if host disconnected
        if player_id == room.host_player_id:
            connected_humans = [p for p in room.players.values() if p.get("connected", False)]
            if connected_humans:
                new_host = connected_humans[0]
                room.host_player_id = new_host["id"]
                new_host["is_host"] = True
                await broadcast_to_room(room, {
                    "type": "court_notice",
                    "notice": f"Host status transferred to {new_host['name']}.",
                    "level": "info",
                })
                await broadcast_to_room(room, get_room_state_dict(room))


async def _handle_player_reconnect(room: Room, player_id: str, ws: WebSocket):
    player = room.players.get(player_id)
    if not player:
        return

    player["connected"] = True
    room.connections[player_id] = ws

    # Cancel any pending grace timer
    if player_id in room.grace_tasks:
        room.grace_tasks[player_id].cancel()
        room.grace_tasks.pop(player_id, None)

    seat_id = player.get("seat_id")
    away_duration = int(time.time() - player.get("disconnect_time", time.time())) if player.get("disconnect_time") else 0
    missed = room.missed_events.pop(player_id, [])

    if room.started and room.game_state and seat_id:
        agent = next((a for a in room.game_state.agents if a.id == seat_id), None)
        if agent:
            agent.connection_status = "connected"
            agent.control_type = "human"
            agent.controller_state = "reclaimed"
            print(f"[ROOM] room={room.join_code} player={player['name']} seat={seat_id} event=player_reconnect")

            # Record SEAT_CONTROLLER_CHANGED event
            room.game_state.social_events.append(SocialEvent(
                event_id=f"evt_{uuid.uuid4().hex[:8]}",
                timestamp=time.time(),
                round_number=room.game_state.round_number,
                phase=room.game_state.phase,
                event_type="SEAT_CONTROLLER_CHANGED",
                actor_id=seat_id,
                actor_name=agent.name,
                description=f"Seat Reclaimed: {player['name']} ({agent.name}) has returned. AI control ended.",
                public_visibility=True,
            ))

            await broadcast_to_room(room, {
                "type": "court_notice",
                "notice": f"Seat Reclaimed: {player['name']} ({agent.name}) has returned. AI control ended. Your previous court history remains intact.",
                "level": "success",
                "seat_id": seat_id,
                "character_name": agent.name,
                "player_name": player["name"],
            })
            await broadcast_to_room(room, {
                "type": "control_changed",
                "seat_id": seat_id,
                "control_type": "human",
                "character_name": agent.name,
                "player_name": player["name"],
            })

    # Send state to this reconnecting client
    await ws.send_text(json.dumps(get_room_state_dict(room)))
    if room.started and room.game_state:
        await ws.send_text(json.dumps(_send_game_state(room.game_state)))
        if missed:
            await ws.send_text(json.dumps({
                "type": "catch_up",
                "away_duration": away_duration,
                "missed_events": missed,
            }))


# ---------------------------------------------------------------------------
# Multi-Human Voting Resolution
# ---------------------------------------------------------------------------
async def _check_and_resolve_votes(room: Room):
    async with room.game_lock:
        gs = room.game_state
        if not gs or gs.phase != "voting":
            return

        # Check which living agents are currently controlled by connected humans
        connected_human_voters = [
            a for a in gs.agents
            if a.is_alive and getattr(a, "control_type", "human" if a.is_human else "ai") == "human"
        ]

        all_voted = all(h.id in gs.votes for h in connected_human_voters)

        if not (all_voted or len(connected_human_voters) == 0):
            return

        # Atomic transition to resolving so duplicate calls cannot execute
        gs.phase = "resolving"
        if room.voting_timeout_task:
            room.voting_timeout_task.cancel()
            room.voting_timeout_task = None

    await broadcast_to_room(room, {"type": "processing"})

    # AI agents cast votes based on lowest trust
    gs = await asyncio.to_thread(engine.run_voting_round, gs)
    result = await asyncio.to_thread(engine.resolve_votes, gs)

    # Broadcast reveal
    await broadcast_to_room(room, {
        "type": "reveal",
        "eliminated": result.get("eliminated"),
        "eliminated_id": result.get("eliminated_id"),
        "true_role": result.get("true_role"),
        "votes_received": result.get("votes_received"),
        "vote_tally": result.get("vote_tally"),
        "trust_snapshot": result.get("trust_snapshot"),
        "agents": [a.model_dump() for a in gs.agents],
    })

    # Updated trust data
    await _send_trust_update(room, gs)

    # Check win condition
    win = engine.check_win_condition(gs)
    if win:
        gs.phase = "ended"
        await broadcast_to_room(room, {"type": "win", "result": win})
    else:
        gs.phase = "reveal"
        await broadcast_to_room(room, {
            "type": "phase_change",
            "phase": "reveal",
            "round_number": gs.round_number,
        })

    await broadcast_to_room(room, get_room_state_dict(room))



async def _voting_timeout_countdown(room: Room):
    try:
        await asyncio.sleep(VOTING_TIMEOUT_SECONDS)
        # Timeout expired: resolve with current votes
        print(f"[room {room.join_code}] Voting timeout expired ({VOTING_TIMEOUT_SECONDS}s). Resolving ballots.")
        await _check_and_resolve_votes(room)
    except asyncio.CancelledError:
        pass


# ---------------------------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}


@app.get("/api/observatory/dossier/{room_id}/{evaluator_id}/{target_id}")
async def api_get_dossier(room_id: str, evaluator_id: str, target_id: str):
    """Retrieve grounded causal evidence for why evaluator trusts/distrusts target."""
    room = rooms.get(room_id)
    if not room or not room.game_state:
        gs = legacy_games.get(room_id)
        if not gs:
            raise HTTPException(status_code=404, detail="Court session not found")
    else:
        gs = room.game_state

    dossier = social_engine.assemble_relationship_dossier(evaluator_id, target_id, gs)
    return {"dossier": dossier}


@app.get("/api/agent/dossier/{room_id}/{agent_id}")
async def api_get_agent_dossier(room_id: str, agent_id: str):
    """Retrieve public profile, strategic focus, and observable history for an agent."""
    room = rooms.get(room_id)
    if not room or not room.game_state:
        gs = legacy_games.get(room_id)
        if not gs:
            raise HTTPException(status_code=404, detail="Court session not found")
    else:
        gs = room.game_state

    agent = next((a for a in gs.agents if a.id == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found in court")

    allies = [
        {"id": rel.target_id, "name": rel.target_name, "trust": rel.current_trust, "alignment": rel.alignment_score}
        for rel in agent.memory_ledger.relationship_memories.values()
        if rel.current_trust >= 60
    ]
    adversaries = [
        {"id": rel.target_id, "name": rel.target_name, "trust": rel.current_trust, "alignment": rel.alignment_score}
        for rel in agent.memory_ledger.relationship_memories.values()
        if rel.current_trust < 50
    ]

    contras_count = sum(
        1 for c in gs.contradictions
        if c.speaker_a == agent.name or c.speaker_b == agent.name or c.target_name == agent.name
    )

    recent_stmts = [
        {"round": s.get("round_number", 1), "text": s.get("text", "")}
        for s in gs.transcript
        if s.get("speaker_id") == agent.id
    ][-4:]

    return {
        "dossier": {
            "agent_id": agent.id,
            "name": agent.name,
            "personality": agent.personality,
            "is_alive": agent.is_alive,
            "control_type": agent.control_type,
            "controller_state": agent.controller_state,
            "public_position": agent.strategic_state.public_position,
            "strategic_focus": agent.strategic_state.focus_agent_name or agent.strategic_state.focus_topic or "Observing court testimonies",
            "strategic_commitments": agent.memory_ledger.strategic_commitments[-3:],
            "allies": allies,
            "adversaries": adversaries,
            "accusations_made_count": len(agent.memory_ledger.accusations_made),
            "accusations_received_count": len(agent.memory_ledger.accusations_received),
            "defended_agents_count": len(agent.memory_ledger.defended_agents),
            "contradictions_count": contras_count,
            "recent_statements": recent_stmts,
            "human_profile": {
                "question_tendency": agent.memory_ledger.human_profile.question_tendency,
                "accusation_tendency": agent.memory_ledger.human_profile.accusation_tendency,
                "defense_tendency": agent.memory_ledger.human_profile.defense_tendency,
                "preferred_target": agent.memory_ledger.human_profile.preferred_target_name,
            } if (agent.is_human or agent.controller_state in ("human_active", "ai_takeover", "reclaimed")) else None,
        }
    }


@app.post("/api/rooms/create")
async def api_create_room(payload: dict):
    """Host creates a new court room."""
    court_size = int(payload.get("court_size", 5))
    court_size = max(4, min(6, court_size))
    game_mode = payload.get("game_mode", "traitor")
    player_name = payload.get("player_name", "Lord Chancellor").strip() or "Lord Chancellor"

    room_id = f"room_{uuid.uuid4().hex[:10]}"
    join_code = generate_join_code()
    player_id = f"player_{uuid.uuid4().hex[:8]}"
    player_token = f"tok_{uuid.uuid4().hex[:12]}"
    seat_id = "agent_0"

    room = Room(
        room_id=room_id,
        join_code=join_code,
        host_player_id=player_id,
        court_size=court_size,
        game_mode=game_mode,
    )

    room.players[player_id] = {
        "id": player_id,
        "name": player_name,
        "token": player_token,
        "seat_id": seat_id,
        "is_host": True,
        "connected": False,
        "disconnect_time": None,
    }

    rooms[room_id] = room
    rooms_by_code[join_code] = room_id

    print(f"[rooms] Created court room {room_id} (Code: {join_code}) by host {player_name}")
    return {
        "room_id": room_id,
        "join_code": join_code,
        "player_id": player_id,
        "player_token": player_token,
        "seat_id": seat_id,
        "is_host": True,
    }


@app.post("/api/rooms/join")
async def api_join_room(payload: dict):
    """Player joins an existing room using 5-character room code."""
    join_code = payload.get("join_code", "").strip().upper()
    player_name = payload.get("player_name", "Courtier").strip() or "Courtier"
    player_token = payload.get("player_token")

    room_id = rooms_by_code.get(join_code)
    if not room_id or room_id not in rooms:
        raise HTTPException(status_code=404, detail="COURT NOT FOUND")

    room = rooms[room_id]

    # Check for reconnect token match
    if player_token:
        existing_player = next((p for p in room.players.values() if p.get("token") == player_token), None)
        if existing_player:
            return {
                "room_id": room_id,
                "join_code": join_code,
                "player_id": existing_player["id"],
                "player_token": player_token,
                "seat_id": existing_player["seat_id"],
                "is_host": (existing_player["id"] == room.host_player_id),
                "is_reconnect": True,
            }

    # If game already started and no token match: cannot join new seat
    if room.started:
        raise HTTPException(status_code=400, detail="THIS COURT IS ALREADY IN SESSION")

    # If room is full
    if len(room.players) >= room.court_size:
        raise HTTPException(status_code=400, detail="THE COURT IS FULL")

    # Allocate next seat
    seat_id = f"agent_{len(room.players)}"
    player_id = f"player_{uuid.uuid4().hex[:8]}"
    new_token = f"tok_{uuid.uuid4().hex[:12]}"

    room.players[player_id] = {
        "id": player_id,
        "name": player_name,
        "token": new_token,
        "seat_id": seat_id,
        "is_host": False,
        "connected": False,
        "disconnect_time": None,
    }

    print(f"[rooms] Player {player_name} joined room {join_code} (Assigned seat {seat_id})")
    return {
        "room_id": room_id,
        "join_code": join_code,
        "player_id": player_id,
        "player_token": new_token,
        "seat_id": seat_id,
        "is_host": False,
        "is_reconnect": False,
    }


@app.get("/api/rooms/{join_code}")
async def api_get_room(join_code: str):
    """Retrieve public room status."""
    code = join_code.strip().upper()
    room_id = rooms_by_code.get(code)
    if not room_id or room_id not in rooms:
        raise HTTPException(status_code=404, detail="COURT NOT FOUND")

    room = rooms[room_id]
    return get_room_state_dict(room)


# ---------------------------------------------------------------------------
# Developer Telemetry & Audit Endpoints (Section 25)
# ---------------------------------------------------------------------------
@app.get("/api/debug/game/{game_id}/telemetry")
async def api_debug_game_telemetry(game_id: str):
    """Internal developer telemetry for a specific game."""
    telem = telemetry.get_game_telemetry(game_id)
    if not telem:
        raise HTTPException(status_code=404, detail="Game telemetry not found")
    return telem


@app.get("/api/debug/room/{room_id}/telemetry")
async def api_debug_room_telemetry(room_id: str):
    """Internal developer telemetry for a specific room."""
    telem = telemetry.get_room_telemetry(room_id)
    if not telem:
        raise HTTPException(status_code=404, detail="Room telemetry not found")
    return telem



# ---------------------------------------------------------------------------
# WebSocket Endpoint: /ws/room/{room_id}
# ---------------------------------------------------------------------------
@app.websocket("/ws/room/{room_id}")
async def room_websocket(websocket: WebSocket, room_id: str):
    await websocket.accept()

    # Query params for player auth
    player_id = websocket.query_params.get("player_id")
    token = websocket.query_params.get("token") or websocket.query_params.get("player_token")

    if room_id not in rooms:
        await websocket.send_text(json.dumps({"type": "error", "error": "COURT NOT FOUND"}))
        await websocket.close()
        return

    room = rooms[room_id]
    player = room.players.get(player_id) if player_id else None

    # Validate token if player is registered in room (Feature 20: AI Takeover Security)
    if player and player.get("token"):
        if not token or player.get("token") != token:
            await websocket.send_text(json.dumps({"type": "error", "error": "INVALID CREDENTIALS"}))
            await websocket.close()
            return

    # If spectator or unassigned player
    if not player:
        # Generate temporary spectator
        player_id = f"spec_{uuid.uuid4().hex[:6]}"
        player = {
            "id": player_id,
            "name": "Royal Spectator",
            "token": "",
            "seat_id": None,
            "is_host": False,
            "connected": True,
            "disconnect_time": None,
        }
        room.players[player_id] = player

    print(f"[ws] Player {player['name']} ({player_id}) connected to room {room.join_code}")

    # Check if this is a reconnect
    is_reconnect = player.get("disconnect_time") is not None
    await _handle_player_reconnect(room, player_id, websocket)

    # Broadcast updated room state
    await broadcast_to_room(room, get_room_state_dict(room))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")

            # ── 1. Host Starts Court from Lobby ──
            # ── 1. Host Starts Court from Lobby (Idempotent with Room Game Lock) ──
            if action in ("start_court", "start_game"):
                if player_id != room.host_player_id:
                    continue  # Only host can start

                async with room.game_lock:
                    if room.started or room.game_running:
                        await websocket.send_text(json.dumps({
                            "type": "court_notice",
                            "status": "already_running",
                            "notice": "Court is already started.",
                        }))
                        continue

                    room.started = True
                    # Initialize game with human seats + AI seats
                    num_humans = len([p for p in room.players.values() if p.get("seat_id")])
                    gs = engine.create_game(num_agents=room.court_size, num_humans=num_humans)

                    # Bind player seats to agents
                    for p in room.players.values():
                        sid = p.get("seat_id")
                        if sid:
                            ag = next((a for a in gs.agents if a.id == sid), None)
                            if ag:
                                ag.player_id = p["id"]
                                ag.player_name = p["name"]
                                ag.is_host = p.get("is_host", False)
                                ag.control_type = "human"
                                ag.controller_state = "human_active"
                                ag.connection_status = "connected" if p.get("connected") else "disconnected"

                    room.game_state = gs
                    print(f"[ROOM] room={room.join_code} player={player['name']} event=start_court humans={num_humans} total={room.court_size}")

                    await broadcast_to_room(room, {
                        "type": "court_started",
                        "round_number": gs.round_number,
                    })
                    await broadcast_to_room(room, _send_game_state(gs))
                    await broadcast_to_room(room, get_room_state_dict(room))

            # ── 2. Discussion Next Round (Idempotent Single Authoritative Loop) ──
            elif action == "next_round":
                gs = room.game_state
                if not gs:
                    continue

                async with room.game_lock:
                    if room.game_running:
                        await websocket.send_text(json.dumps({
                            "type": "court_notice",
                            "status": "already_running",
                            "notice": "Discussion round is currently active.",
                        }))
                        continue

                    if gs.phase not in ("discussion", "reveal"):
                        continue

                    room.game_running = True
                    await broadcast_to_room(room, {"type": "processing"})

                try:
                    gs.phase = "discussion"

                    # Run AI discussion round directly with bounded async engine
                    gs = await GameEngine.run_discussion_round_async(gs, room_id=room.room_id)
                    room.game_state = gs

                    current_round = gs.round_number - 1
                    await _send_round_statements(room, gs, current_round, delay=0.2)
                    await _send_trust_update(room, gs)

                    # Move to voting phase
                    gs.phase = "voting"
                    gs.votes.clear()
                    await broadcast_to_room(room, {
                        "type": "phase_change",
                        "phase": "voting",
                        "round_number": gs.round_number,
                    })
                    await broadcast_to_room(room, get_room_state_dict(room))

                    # Start 30s voting timeout
                    if room.voting_timeout_task:
                        room.voting_timeout_task.cancel()
                    room.voting_timeout_task = asyncio.create_task(_voting_timeout_countdown(room))
                finally:
                    async with room.game_lock:
                        room.game_running = False


            # ── 3. Player Action: Question ──
            elif action == "question":
                gs = room.game_state
                target_id = msg.get("target_id")
                question_text = (msg.get("question") or msg.get("text", "")).strip()
                seat_id = player.get("seat_id")

                if not gs:
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "Court is not in session.", "level": "warning"}))
                elif gs.phase != "discussion":
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "THE COURT IS IN DELIBERATION - Questioning only permitted during open discussion.", "level": "warning"}))
                elif not target_id:
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "SELECT A COURTIER FIRST - Target noble required.", "level": "warning"}))
                elif not question_text:
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "ENTER YOUR QUESTION - Council cannot record empty testimony.", "level": "warning"}))
                else:
                    human_agent = next((a for a in gs.agents if a.id == seat_id and a.is_alive), None)
                    target_agent = next((a for a in gs.agents if a.id == target_id and a.is_alive), None)
                    if not human_agent:
                        await websocket.send_text(json.dumps({"type": "court_notice", "notice": "YOU DO NOT CURRENTLY HAVE THE FLOOR - Living seat required.", "level": "warning"}))
                    elif not target_agent:
                        await websocket.send_text(json.dumps({"type": "court_notice", "notice": "CANNOT QUESTION ELIMINATED COURTIER - Dignitary is no longer at the council.", "level": "warning"}))
                    else:
                        h_name = player["name"]
                        social_engine.record_human_action(human_agent, "question", target_agent.id, question_text, gs)

                        # Broadcast question statement
                        await broadcast_to_room(room, {
                            "type": "statement",
                            "speaker_id": human_agent.id,
                            "speaker_name": f"{h_name} ({human_agent.name})",
                            "text": f"To {target_agent.name}: \"{question_text}\"",
                            "round_number": gs.round_number,
                            "tag": "QUESTION",
                            "target_name": target_agent.name,
                            "is_human": True,
                        })

                        # Show thinking
                        await broadcast_to_room(room, {
                            "type": "speaker_thinking",
                            "speaker_id": target_agent.id,
                            "speaker_name": target_agent.name,
                        })

                        # Target AI responds in character
                        game_context = (
                            f"Round {gs.round_number}, discussion phase. "
                            f"{h_name} ({human_agent.name}) has interrogated you in open court."
                        )
                        system_prompt = build_system_prompt(target_agent, game_context)
                        history = [{"role": "user", "content": m} for m in target_agent.memory[-8:]]
                        user_msg = (
                            f"{h_name} looks directly at you and asks: \"{question_text}\"\n"
                            f"Answer in-character directly to {h_name} in 1 to 2 concise sentences."
                        )

                        answer = await get_agent_response_async(
                            system_prompt=system_prompt,
                            conversation_history=history,
                            user_message=user_msg,
                            max_tokens=140,
                            game_id=gs.game_id,
                            room_id=room.room_id,
                            round_number=gs.round_number,
                            phase="discussion",
                            agent_id=target_agent.id,
                            agent_name=target_agent.name,
                            call_type="human_question_response",
                            trigger="human_question",
                        )

                        q_stmt_id = f"stmt_q_r{gs.round_number}_{target_agent.id}_{uuid.uuid4().hex[:6]}"
                        q_entry = {
                            "statement_id": q_stmt_id,
                            "game_id": gs.game_id,
                            "speaker_id": target_agent.id,
                            "speaker_name": target_agent.name,
                            "text": answer,
                            "round_number": gs.round_number,
                            "timestamp": time.time(),
                        }
                        gs.transcript.append(q_entry)

                        # Extract claims and record social events
                        new_claims = social_engine.extract_claims_from_statement(q_entry, gs.agents)
                        prior_claims = list(gs.claims)
                        gs.claims.extend(new_claims)

                        gs.social_events.append(SocialEvent(
                            event_id=f"evt_{uuid.uuid4().hex[:8]}",
                            timestamp=time.time(),
                            round_number=gs.round_number,
                            phase="discussion",
                            event_type="QUESTION",
                            actor_id=human_agent.id,
                            actor_name=h_name,
                            target_id=target_agent.id,
                            target_name=target_agent.name,
                            statement_id=q_stmt_id,
                            description=f"{h_name} interrogated {target_agent.name}: \"{question_text[:70]}...\"",
                            public_visibility=True,
                        ))

                        if prior_claims and new_claims:
                            new_contras = social_engine.detect_contradictions(prior_claims, new_claims, gs.round_number)
                            for ct in new_contras:
                                gs.contradictions.append(ct)
                                gs.social_events.append(SocialEvent(
                                    event_id=f"evt_{uuid.uuid4().hex[:8]}",
                                    timestamp=time.time(),
                                    round_number=gs.round_number,
                                    phase="discussion",
                                    event_type="CONTRADICTION",
                                    actor_id=target_agent.id,
                                    actor_name=target_agent.name,
                                    statement_id=q_stmt_id,
                                    description=f"Contradiction detected: {ct.description}",
                                    public_visibility=True,
                                ))

                        for other in gs.agents:
                            if other.is_alive:
                                other.memory.append(f"{h_name} asked {target_agent.name}: \"{question_text}\"")
                                other.memory.append(f"{target_agent.name} answered: \"{answer}\"")

                        await asyncio.sleep(0.4)
                        tag = "DEFENSE" if ("not" in answer.lower() or "never" in answer.lower() or "innocent" in answer.lower()) else "TESTIMONY"
                        await broadcast_to_room(room, {
                            "type": "statement",
                            "statement_id": q_stmt_id,
                            "speaker_id": target_agent.id,
                            "speaker_name": target_agent.name,
                            "text": answer,
                            "round_number": gs.round_number,
                            "tag": tag,
                        })
                        await _send_observatory_update(room, gs)


            # ── 4. Player Action: Accuse ──
            elif action == "accuse":
                gs = room.game_state
                target_id = msg.get("target_id")
                reason = (msg.get("reason") or msg.get("text") or "").strip()
                seat_id = player.get("seat_id")

                if not gs:
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "Court is not in session.", "level": "warning"}))
                elif gs.phase != "discussion":
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "THE COURT IS IN DELIBERATION - Accusations only permitted during open discussion.", "level": "warning"}))
                elif not target_id:
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "SELECT A DIGNITARY FIRST - Accusation target required.", "level": "warning"}))
                elif not reason:
                    await websocket.send_text(json.dumps({"type": "court_notice", "notice": "SPECIFY GROUNDS FOR ACCUSATION - Formal charges require explicit reason.", "level": "warning"}))
                else:
                    human_agent = next((a for a in gs.agents if a.id == seat_id and a.is_alive), None)
                    target_agent = next((a for a in gs.agents if a.id == target_id and a.is_alive), None)
                    if not human_agent:
                        await websocket.send_text(json.dumps({"type": "court_notice", "notice": "YOU DO NOT CURRENTLY HAVE THE FLOOR - Living seat required.", "level": "warning"}))
                    elif not target_agent:
                        await websocket.send_text(json.dumps({"type": "court_notice", "notice": "CANNOT ACCUSE ELIMINATED NOBLE - Suspect is no longer at the council.", "level": "warning"}))
                    else:
                        h_name = player["name"]
                        social_engine.record_human_action(human_agent, "accuse", target_agent.id, reason, gs)
                        accuse_text = f"I formally accuse {target_agent.name}. Reason: {reason}."
                        acc_stmt_id = f"stmt_acc_r{gs.round_number}_{human_agent.id}_{uuid.uuid4().hex[:6]}"
                        acc_entry = {
                            "statement_id": acc_stmt_id,
                            "game_id": gs.game_id,
                            "speaker_id": human_agent.id,
                            "speaker_name": f"{h_name} ({human_agent.name})",
                            "text": accuse_text,
                            "round_number": gs.round_number,
                            "timestamp": time.time(),
                        }
                        gs.transcript.append(acc_entry)

                        new_claims = social_engine.extract_claims_from_statement(acc_entry, gs.agents)
                        prior_claims = list(gs.claims)
                        gs.claims.extend(new_claims)

                        gs.social_events.append(SocialEvent(
                            event_id=f"evt_{uuid.uuid4().hex[:8]}",
                            timestamp=time.time(),
                            round_number=gs.round_number,
                            phase="discussion",
                            event_type="ACCUSATION",
                            actor_id=human_agent.id,
                            actor_name=h_name,
                            target_id=target_agent.id,
                            target_name=target_agent.name,
                            statement_id=acc_stmt_id,
                            description=f"{h_name} formally accused {target_agent.name} of treason",
                            public_visibility=True,
                        ))

                        if prior_claims and new_claims:
                            new_contras = social_engine.detect_contradictions(prior_claims, new_claims, gs.round_number)
                            for ct in new_contras:
                                gs.contradictions.append(ct)
                                gs.social_events.append(SocialEvent(
                                    event_id=f"evt_{uuid.uuid4().hex[:8]}",
                                    timestamp=time.time(),
                                    round_number=gs.round_number,
                                    phase="discussion",
                                    event_type="CONTRADICTION",
                                    actor_id=human_agent.id,
                                    actor_name=h_name,
                                    statement_id=acc_stmt_id,
                                    description=f"Contradiction detected: {ct.description}",
                                    public_visibility=True,
                                ))

                        for other in gs.agents:
                            if other.is_alive:
                                other.memory.append(f"{h_name} formally accused {target_agent.name} (Reason: {reason})")

                        await broadcast_to_room(room, {
                            "type": "statement",
                            "speaker_id": human_agent.id,
                            "speaker_name": f"{h_name} ({human_agent.name})",
                            "text": accuse_text,
                            "round_number": gs.round_number,
                            "tag": "ACCUSATION",
                            "target_name": target_agent.name,
                            "is_human": True,
                        })
                        await _send_observatory_update(room, gs)

            # ── 5. Player Action: Defend ──
            elif action == "defend":
                gs = room.game_state
                statement = msg.get("statement", "").strip()
                seat_id = player.get("seat_id")
                if gs and seat_id and statement:
                    human_agent = next((a for a in gs.agents if a.id == seat_id and a.is_alive), None)
                    if human_agent:
                        h_name = player["name"]
                        social_engine.record_human_action(human_agent, "defend", None, statement, gs)
                        def_stmt_id = f"stmt_def_r{gs.round_number}_{human_agent.id}_{uuid.uuid4().hex[:6]}"
                        def_entry = {
                            "statement_id": def_stmt_id,
                            "game_id": gs.game_id,
                            "speaker_id": human_agent.id,
                            "speaker_name": f"{h_name} ({human_agent.name})",
                            "text": statement,
                            "round_number": gs.round_number,
                            "timestamp": time.time(),
                        }
                        gs.transcript.append(def_entry)

                        new_claims = social_engine.extract_claims_from_statement(def_entry, gs.agents)
                        prior_claims = list(gs.claims)
                        gs.claims.extend(new_claims)

                        gs.social_events.append(SocialEvent(
                            event_id=f"evt_{uuid.uuid4().hex[:8]}",
                            timestamp=time.time(),
                            round_number=gs.round_number,
                            phase="discussion",
                            event_type="DEFENSE",
                            actor_id=human_agent.id,
                            actor_name=h_name,
                            statement_id=def_stmt_id,
                            description=f"{h_name} defended their standing before the council",
                            public_visibility=True,
                        ))

                        if prior_claims and new_claims:
                            new_contras = social_engine.detect_contradictions(prior_claims, new_claims, gs.round_number)
                            for ct in new_contras:
                                gs.contradictions.append(ct)
                                gs.social_events.append(SocialEvent(
                                    event_id=f"evt_{uuid.uuid4().hex[:8]}",
                                    timestamp=time.time(),
                                    round_number=gs.round_number,
                                    phase="discussion",
                                    event_type="CONTRADICTION",
                                    actor_id=human_agent.id,
                                    actor_name=h_name,
                                    statement_id=def_stmt_id,
                                    description=f"Contradiction detected: {ct.description}",
                                    public_visibility=True,
                                ))

                        for other in gs.agents:
                            if other.is_alive:
                                other.memory.append(f"{h_name} defended themselves: \"{statement}\"")

                        await broadcast_to_room(room, {
                            "type": "statement",
                            "speaker_id": human_agent.id,
                            "speaker_name": f"{h_name} ({human_agent.name})",
                            "text": statement,
                            "round_number": gs.round_number,
                            "tag": "DEFENSE",
                            "is_human": True,
                        })
                        await _send_observatory_update(room, gs)

            # ── 6. Player Action: Stay Silent ──
            elif action == "stay_silent":
                gs = room.game_state
                seat_id = player.get("seat_id")
                if gs and seat_id:
                    human_agent = next((a for a in gs.agents if a.id == seat_id and a.is_alive), None)
                    if human_agent:
                        h_name = player["name"]
                        social_engine.record_human_action(human_agent, "stay_silent", None, "", gs)
                        silence_text = f"{h_name} remained silent, observing the court's demeanor."
                        sil_id = f"stmt_sil_r{gs.round_number}_{human_agent.id}_{uuid.uuid4().hex[:6]}"
                        gs.transcript.append({"statement_id": sil_id, "speaker_id": human_agent.id, "text": silence_text, "round_number": gs.round_number})

                        gs.social_events.append(SocialEvent(
                            event_id=f"evt_{uuid.uuid4().hex[:8]}",
                            timestamp=time.time(),
                            round_number=gs.round_number,
                            phase="discussion",
                            event_type="STATEMENT",
                            actor_id=human_agent.id,
                            actor_name=h_name,
                            statement_id=sil_id,
                            description=f"{h_name} maintained silence to observe council demeanor",
                            public_visibility=True,
                        ))

                        await broadcast_to_room(room, {
                            "type": "statement",
                            "speaker_id": human_agent.id,
                            "speaker_name": f"{h_name} ({human_agent.name})",
                            "text": silence_text,
                            "round_number": gs.round_number,
                            "tag": "OBSERVATION",
                            "is_human": True,
                        })
                        await _send_observatory_update(room, gs)

            # ── 7. Player Action: Vote (Idempotent Vote Submission) ──
            elif action == "vote":
                gs = room.game_state
                accused_id = msg.get("accused_id")
                seat_id = player.get("seat_id")

                if gs and seat_id and accused_id and gs.phase == "voting":
                    # Enforce idempotency: ignore duplicate vote from the same seat in the same voting round
                    if seat_id in gs.votes:
                        print(f"[room {room.join_code}] Seat {seat_id} already voted. Ignoring duplicate ballot.")
                        await websocket.send_text(json.dumps({
                            "type": "court_notice",
                            "status": "already_voted",
                            "notice": "Your ballot has already been recorded.",
                        }))
                        continue

                    # Record this human's vote
                    gs.votes[seat_id] = accused_id
                    target_name = _id_to_name(gs, accused_id)
                    human_agent = next((a for a in gs.agents if a.id == seat_id), None)
                    if human_agent:
                        social_engine.record_human_action(human_agent, "vote", accused_id, f"Voted to banish {target_name}", gs)
                        if hasattr(human_agent, "memory_ledger") and human_agent.memory_ledger:
                            human_agent.memory_ledger.vote_history.append({
                                "round": gs.round_number,
                                "target_id": accused_id,
                                "target_name": target_name,
                                "score": 100.0,
                                "factors": ["Direct human ballot cast in council"],
                            })

                    print(f"[ROOM] room={room.join_code} player={player['name']} seat={seat_id} event=vote target={target_name}")

                    # Record social event for human vote
                    gs.social_events.append(SocialEvent(
                        event_id=f"evt_{uuid.uuid4().hex[:8]}",
                        timestamp=time.time(),
                        round_number=gs.round_number,
                        phase="voting",
                        event_type="VOTE",
                        actor_id=seat_id,
                        actor_name=player["name"],
                        target_id=accused_id,
                        target_name=target_name,
                        description=f"{player['name']} cast ballot to banish {target_name}",
                        public_visibility=True,
                    ))

                    # Broadcast progress
                    connected_voters = [
                        a for a in gs.agents
                        if a.is_alive and getattr(a, "control_type", "human" if a.is_human else "ai") == "human"
                    ]
                    votes_cast = sum(1 for a in connected_voters if a.id in gs.votes)

                    await broadcast_to_room(room, {
                        "type": "vote_progress",
                        "votes_cast": votes_cast,
                        "total_voters": len(connected_voters),
                        "voter_name": player["name"],
                    })

                    # Check if all connected humans have voted
                    await _check_and_resolve_votes(room)

            # ── 8. Observatory: Relationship Dossier ──
            elif action == "get_dossier":
                evaluator_id = msg.get("evaluator_id")
                target_id = msg.get("target_id")
                gs = room.game_state
                if gs and evaluator_id and target_id:
                    dossier = social_engine.assemble_relationship_dossier(evaluator_id, target_id, gs)
                    await websocket.send_text(json.dumps({
                        "type": "relationship_dossier",
                        "dossier": dossier,
                    }))
                continue

            # ── 8b. Living Agent Dossier (Master Prompt 06) ──
            elif action == "get_agent_dossier":
                target_agent_id = msg.get("agent_id")
                if room.game_state and target_agent_id:
                    dossier_res = await api_get_agent_dossier(room.room_id, target_agent_id)
                    await websocket.send_text(json.dumps({
                        "type": "agent_dossier",
                        **dossier_res,
                    }))
                continue

            # ── 8. Run Full Demo (Idempotent Single Authoritative Demo Loop) ──
            elif action == "run_demo":
                num_rounds = msg.get("rounds", 2)
                statement_delay = msg.get("delay", 1.5)

                gs = room.game_state
                if not gs:
                    continue

                async with room.game_lock:
                    if room.game_running:
                        print(f"[room {room.join_code}] Demo or round already active, rejecting duplicate run_demo.")
                        await websocket.send_text(json.dumps({
                            "type": "court_notice",
                            "status": "already_running",
                            "notice": "Demo or round is already in progress.",
                        }))
                        continue
                    room.game_running = True

                try:
                    await broadcast_to_room(room, {"type": "processing"})
                    print(f"[room {room.join_code}] Running automated demo ({num_rounds} rounds)")

                    for r in range(num_rounds):
                        if gs.phase == "ended":
                            break

                        gs.phase = "discussion"
                        gs = await GameEngine.run_discussion_round_async(gs, room_id=room.room_id)
                        room.game_state = gs

                        current_round = gs.round_number - 1
                        await broadcast_to_room(room, {
                            "type": "phase_change",
                            "phase": "discussion",
                            "round_number": current_round,
                        })
                        await asyncio.sleep(0.4)

                        await _send_round_statements(room, gs, current_round, delay=statement_delay)
                        await _send_trust_update(room, gs)
                        await asyncio.sleep(0.8)

                    if gs.phase != "ended":
                        gs.phase = "voting"
                        await broadcast_to_room(room, {
                            "type": "phase_change",
                            "phase": "voting",
                            "round_number": gs.round_number,
                        })
                        await asyncio.sleep(0.4)

                        # Auto-cast votes for all remaining living agents using deterministic social engine
                        for a in gs.agents:
                            if a.is_alive and a.id not in gs.votes:
                                target_id, rationale = social_engine.calculate_agent_vote_target(a, gs)
                                a.last_vote_rationale = rationale
                                if hasattr(a, "memory_ledger") and a.memory_ledger:
                                    a.memory_ledger.vote_history.append({
                                        "round": gs.round_number,
                                        "target_id": target_id,
                                        "target_name": _id_to_name(gs, target_id),
                                        "score": rationale.score,
                                        "factors": rationale.factors,
                                    })
                                gs.votes[a.id] = target_id
                                target_name = _id_to_name(gs, target_id)
                                gs.social_events.append(SocialEvent(
                                    event_id=f"evt_{uuid.uuid4().hex[:8]}",
                                    timestamp=time.time(),
                                    round_number=gs.round_number,
                                    phase="voting",
                                    event_type="VOTE",
                                    actor_id=a.id,
                                    actor_name=a.name,
                                    target_id=target_id,
                                    target_name=target_name,
                                    description=f"{a.name} cast ballot to banish {target_name}",
                                    metadata={"score": rationale.score, "factors": rationale.factors[:2]},
                                ))

                        await _check_and_resolve_votes(room)
                finally:
                    async with room.game_lock:
                        room.game_running = False


    except (WebSocketDisconnect, Exception) as e:
        print(f"[ws] Player {player['name']} disconnected from room {room.join_code}")
        # Start disconnect grace task
        task = asyncio.create_task(_start_disconnect_grace_period(room, player_id))
        room.grace_tasks[player_id] = task


# ---------------------------------------------------------------------------
# Backwards-compatible Endpoint: /ws/game/{game_id} (Preserves Play Solo / Demo)
# ---------------------------------------------------------------------------
@app.websocket("/ws/game/{game_id}")
async def legacy_game_websocket(websocket: WebSocket, game_id: str):
    """Adapts single-player / demo mode to the same room architecture seamlessly."""
    # Check if a room exists for this game_id or create a solo room
    if game_id not in rooms:
        try:
            req_agents = int(websocket.query_params.get("num_agents", 5))
            num_agents = max(4, min(6, req_agents))
        except (ValueError, TypeError):
            num_agents = 5

        try:
            req_humans = int(websocket.query_params.get("num_humans", 1))
            num_humans = max(0, min(num_agents, req_humans))
        except (ValueError, TypeError):
            num_humans = 1

        player_id = "solo_player"
        join_code = generate_join_code()

        room = Room(
            room_id=game_id,
            join_code=join_code,
            host_player_id=player_id,
            court_size=num_agents,
        )

        room.players[player_id] = {
            "id": player_id,
            "name": "You",
            "token": "solo_token",
            "seat_id": "agent_0" if num_humans > 0 else None,
            "is_host": True,
            "connected": True,
            "disconnect_time": None,
        }

        # Auto-start solo court
        room.started = True
        gs = engine.create_game(num_agents=num_agents, num_humans=num_humans)
        if num_humans > 0:
            gs.agents[0].player_id = player_id
            gs.agents[0].player_name = "You"
            gs.agents[0].is_host = True
            gs.agents[0].control_type = "human"

        room.game_state = gs
        rooms[game_id] = room
        rooms_by_code[join_code] = game_id

    # Route into room WebSocket logic
    websocket.query_params._dict["player_id"] = "solo_player"
    websocket.query_params._dict["token"] = "solo_token"
    await room_websocket(websocket, game_id)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)
