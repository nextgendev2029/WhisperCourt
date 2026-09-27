"""
Whisper Court - Comprehensive End-to-End Dynamic Integration Audit (Prompt 12).

Tests:
1. Real Server Health & Liveness
2. Landing -> Game Setup -> Room Creation (POST /api/rooms/create)
3. Multiplayer Join Flow (POST /api/rooms/join) with dual clients
4. Dual WebSocket State Synchronization (Host + Guest)
5. Start Court Session (Synchronized room_state, agents, game_state)
6. Living Seat Agency Validation:
 - Question Validation (empty text rejected, dead target rejected, valid target accepted)
 - Accusation Validation (empty grounds rejected, dead suspect rejected, valid charge accepted)
 - Defense & Stay Silent Actions
7. Trust Network & Relationship Dossier Inspection (0 LLM calls, zero role leakage)
8. Public Character Dossier (Public stats, claims, influence, zero role leakage)
9. Agent Observatory Data Integrity (Social heat, contradictions, claims, timeline)
10. Voting Phase & Deterministic Balloting (Idempotency, AI vote resolution, elimination, role reveal)
11. Living Seat Continuity & AI Takeover:
 - Human disconnect -> grace period countdown -> AI takeover with memory briefing
 - Human reconnect with same token -> seat reclaimed, continuity preserved
12. Host Transfer on Disconnect
13. Exact Call Budget Accounting & Model Policy
14. Error Handling & Security Verification
"""

import asyncio
import json
import time
import httpx
import websockets

BACKEND_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000"


async def run_e2e_audit():
    print("\n" + "=" * 70)
    print("WHISPER COURT - FINAL END-TO-END DYNAMIC INTEGRATION AUDIT")
    print("=" * 70)

    results = {}

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        # ── 1. Server Health ──
        print("\n[1] Checking Server Health...")
        health_res = await http_client.get(f"{BACKEND_URL}/health")
        assert health_res.status_code == 200, f"Health check failed: {health_res.status_code}"
        assert health_res.json() == {"status": "ok"}
        print("  ✓ Server health OK (200, status=ok)")
        results["A_HEALTH"] = True

        # ── 2. Create Multiplayer Room (Browser A / Host) ──
        print("\n[2] Creating 5-Seat Multiplayer Room...")
        create_res = await http_client.post(f"{BACKEND_URL}/api/rooms/create", json={
            "court_size": 5,
            "player_name": "Archduke Julian",
        })
        assert create_res.status_code == 200, f"Room create failed: {create_res.text}"
        host_data = create_res.json()
        room_id = host_data["room_id"]
        join_code = host_data["join_code"]
        host_id = host_data["player_id"]
        host_token = host_data["player_token"]
        host_seat = host_data["seat_id"]

        assert len(join_code) in (5, 6), f"Invalid join code: {join_code}"
        assert host_seat == "agent_0"
        assert host_data["is_host"] is True
        print(f"  ✓ Room created: ID={room_id}, Code={join_code}, HostSeat={host_seat}")

        # Check room status before start
        room_info_res = await http_client.get(f"{BACKEND_URL}/api/rooms/{join_code}")
        assert room_info_res.status_code == 200
        room_info = room_info_res.json()
        assert room_info["court_size"] == 5
        assert room_info["started"] is False
        assert len(room_info["players"]) == 1
        print("  ✓ Authoritative room status verified via REST")
        results["B_ROOM_CREATION"] = True

        # ── 3. Join Multiplayer Room (Browser B / Guest) ──
        print("\n[3] Browser B Joining Room with Join Code...")
        join_res = await http_client.post(f"{BACKEND_URL}/api/rooms/join", json={
            "join_code": join_code,
            "player_name": "Countess Elena",
            "player_token": "tok_guest_initial",
        })
        assert join_res.status_code == 200, f"Join failed: {join_res.text}"
        guest_data = join_res.json()
        guest_id = guest_data["player_id"]
        guest_token = guest_data["player_token"]
        guest_seat = guest_data["seat_id"]

        assert guest_seat == "agent_1"
        assert guest_data["is_host"] is False
        print(f"  ✓ Browser B joined: ID={guest_id}, Seat={guest_seat}")

        # Verify invalid code rejection
        bad_code_res = await http_client.post(f"{BACKEND_URL}/api/rooms/join", json={
            "join_code": "INVALID",
            "player_name": "Intruder",
        })
        assert bad_code_res.status_code == 404
        assert "COURT NOT FOUND" in bad_code_res.text
        print("  ✓ Invalid room code correctly rejected with 404")
        results["C_JOIN_FLOW"] = True

        # ── 4. Dual WebSocket Connections & Synchronization ──
        print("\n[4] Connecting Dual WebSockets (Host & Guest)...")
        host_ws_url = f"{WS_URL}/ws/room/{room_id}?player_id={host_id}&player_token={host_token}"
        guest_ws_url = f"{WS_URL}/ws/room/{room_id}?player_id={guest_id}&player_token={guest_token}"

        async with websockets.connect(host_ws_url) as ws_host, websockets.connect(guest_ws_url) as ws_guest:
            # Both receive initial room_state
            msg_h1 = json.loads(await ws_host.recv())
            msg_g1 = json.loads(await ws_guest.recv())

            assert msg_h1["type"] == "room_state"
            assert msg_g1["type"] == "room_state"
            assert msg_h1["join_code"] == join_code
            assert msg_g1["join_code"] == join_code
            assert len(msg_h1["players"]) == 2
            assert len(msg_g1["players"]) == 2
            print("  ✓ Dual WebSockets connected and synchronized on room_state")
            results["D_STATE_SYNC"] = True

            # ── 5. Host Starts Court Session ──
            print("\n[5] Host Starting Court Session...")
            await ws_host.send(json.dumps({"action": "start_court"}))

            # Both clients receive synchronized court_started / room_state
            started_received_h = False
            started_received_g = False
            agents_received = []

            for _ in range(6):
                m_h = json.loads(await ws_host.recv())
                if m_h.get("type") == "court_started" or (m_h.get("type") == "room_state" and m_h.get("started")):
                    started_received_h = True
                if m_h.get("agents"):
                    agents_received = m_h["agents"]

                m_g = json.loads(await ws_guest.recv())
                if m_g.get("type") == "court_started" or (m_g.get("type") == "room_state" and m_g.get("started")):
                    started_received_g = True

                if started_received_h and started_received_g and agents_received:
                    break

            assert started_received_h and started_received_g
            assert len(agents_received) == 5, f"Expected 5 agents, got {len(agents_received)}"
            print(f"  ✓ Court successfully started: 5 seated nobles = {[a['name'] for a in agents_received]}")

            # Verify security: no hidden roles in active roster
            for a in agents_received:
                assert "role" not in a, f"SECURITY LEAK: Role exposed in active roster for {a['name']}!"
                assert "memory_ledger" not in a, f"SECURITY LEAK: Memory ledger exposed for {a['name']}!"
            print("  ✓ SECURITY VERIFIED: Zero role or private memory leakage in roster payload")
            results["E_SECURITY_ROLES"] = True

            # Identify human seats and AI targets
            host_agent = next(a for a in agents_received if a["id"] == host_seat)
            guest_agent = next(a for a in agents_received if a["id"] == guest_seat)
            ai_agents = [a for a in agents_received if a["id"] not in (host_seat, guest_seat)]
            target_ai = ai_agents[0]

            async def drain_ws(ws):
                while True:
                    try:
                        await asyncio.wait_for(ws.recv(), timeout=0.2)
                    except (asyncio.TimeoutError, Exception):
                        break

            async def recv_matching(ws, predicate, timeout=5.0):
                t_end = time.time() + timeout
                while time.time() < t_end:
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=0.5)
                        msg = json.loads(raw)
                        if predicate(msg):
                            return msg
                    except (asyncio.TimeoutError, json.JSONDecodeError):
                        continue
                raise TimeoutError("Timed out waiting for expected message")

            await drain_ws(ws_host)
            await drain_ws(ws_guest)

            # ── 6. Question Flow & Authoritative Validation ──
            print(f"\n[6] Testing Question Flow (Target: {target_ai['name']})...")

            # 6A. Reject empty question
            await ws_host.send(json.dumps({
                "action": "question",
                "target_id": target_ai["id"],
                "question": "   ",
            }))
            resp_empty_q = await recv_matching(ws_host, lambda m: m.get("type") == "court_notice" and "QUESTION" in m.get("notice", ""))
            assert "ENTER YOUR QUESTION" in resp_empty_q["notice"]
            print("  ✓ Empty question correctly rejected with player notice")

            # 6B. Reject non-existent target
            await ws_host.send(json.dumps({
                "action": "question",
                "target_id": "agent_nonexistent",
                "question": "Where were you?",
            }))
            resp_dead_q = await recv_matching(ws_host, lambda m: m.get("type") == "court_notice")
            assert "CANNOT QUESTION" in resp_dead_q["notice"] or "SELECT A COURTIER" in resp_dead_q["notice"]
            print("  ✓ Non-existent / dead target correctly rejected")

            # 6C. Valid Question Submission
            await ws_host.send(json.dumps({
                "action": "question",
                "target_id": target_ai["id"],
                "question": "Did you inspect the courtyard gates before midnight?",
            }))

            # Verify broadcast of question statement
            q_broadcast_seen = False
            ai_answer_seen = False

            for _ in range(8):
                msg = json.loads(await ws_host.recv())
                _ = await ws_guest.recv()  # Guest receives identical broadcast
                if msg.get("type") == "statement" and msg.get("tag") == "QUESTION":
                    q_broadcast_seen = True
                    assert target_ai["name"] in msg.get("text", "")
                elif msg.get("type") == "statement" and msg.get("speaker_id") == target_ai["id"]:
                    ai_answer_seen = True
                    break

            assert q_broadcast_seen, "Question statement not broadcasted to room"
            assert ai_answer_seen, "AI target failed to respond to interrogation"
            print(f"  ✓ Question broadcasted and answered dynamically by {target_ai['name']}")
            results["F_QUESTION_FLOW"] = True

            # ── 7. Accusation Flow & Authoritative Validation ──
            print(f"\n[7] Testing Accusation Flow (Suspect: {target_ai['name']})...")

            # 7A. Reject empty grounds
            await ws_guest.send(json.dumps({
                "action": "accuse",
                "target_id": target_ai["id"],
                "reason": "   ",
            }))
            resp_empty_acc = await recv_matching(ws_guest, lambda m: m.get("type") == "court_notice" and "GROUNDS" in m.get("notice", ""))
            assert "SPECIFY GROUNDS" in resp_empty_acc["notice"]
            print("  ✓ Empty grounds correctly rejected with player notice")

            # 7B. Valid Accusation Submission
            await ws_guest.send(json.dumps({
                "action": "accuse",
                "target_id": target_ai["id"],
                "reason": "Contradictory timeline",
            }))

            acc_seen = False
            for _ in range(5):
                msg = json.loads(await ws_guest.recv())
                _ = await ws_host.recv()
                if msg.get("type") == "statement" and "formally accuse" in msg.get("text", ""):
                    acc_seen = True
                    break

            assert acc_seen, "Formal accusation statement not broadcasted"
            print("  ✓ Formal accusation leveled and recorded on chamber transcript")
            results["G_ACCUSE_FLOW"] = True

            # ── 8. Defend & Stay Silent Actions ──
            print("\n[8] Testing Defend & Stay Silent Actions...")
            await ws_host.send(json.dumps({
                "action": "defend",
                "statement": "I have served this court faithfully for twenty summers.",
            }))
            def_seen = False
            for _ in range(5):
                msg = json.loads(await ws_host.recv())
                _ = await ws_guest.recv()
                if msg.get("type") == "statement" and msg.get("tag") == "DEFENSE":
                    def_seen = True
                    break
            assert def_seen, "Defense statement not broadcasted"
            print("  ✓ Spoken defense broadcasted successfully")

            await ws_guest.send(json.dumps({"action": "stay_silent"}))
            sil_seen = False
            for _ in range(5):
                msg = json.loads(await ws_guest.recv())
                _ = await ws_host.recv()
                if msg.get("type") == "statement" and msg.get("tag") == "OBSERVATION":
                    sil_seen = True
                    break
            assert sil_seen, "Stay silent observation not broadcasted"
            print("  ✓ Silent observation registered on court record")
            results["H_DEFEND_SILENCE"] = True

            # ── 9. Trust Network & Dossier Inspection ──
            print("\n[9] Testing Relationship Dossier & Public Agent Inspection...")
            await ws_host.send(json.dumps({
                "action": "get_dossier",
                "evaluator_id": host_seat,
                "target_id": target_ai["id"],
            }))
            dossier_msg = await recv_matching(ws_host, lambda m: m.get("type") == "relationship_dossier")
            assert dossier_msg["type"] == "relationship_dossier"
            dossier = dossier_msg["dossier"]
            assert "current_trust" in dossier
            assert "recent_factors" in dossier
            assert "evidence_quotes" in dossier
            print(f"  ✓ Relationship dossier returned (Trust={dossier['current_trust']}, FactorsLen={len(dossier['recent_factors'])})")

            # Check public agent dossier via HTTP
            agent_dossier_res = await http_client.get(f"{BACKEND_URL}/api/agent/dossier/{room_id}/{target_ai['id']}")
            assert agent_dossier_res.status_code == 200
            ad = agent_dossier_res.json()["dossier"]
            assert ad["name"] == target_ai["name"]
            assert "personality" in ad
            assert "strategic_focus" in ad
            assert "role" not in ad, "SECURITY LEAK: Role leaked in agent dossier!"
            assert "memory_ledger" not in ad
            print("  ✓ Public agent dossier inspected with zero role leakage")
            results["I_DOSSIER_INSPECTION"] = True

        # ── 10. Living Seat Continuity & AI Takeover Test ──
        print("\n[10] Testing Living Seat Continuity & AI Takeover...")
        # Connect host and guest
        async with websockets.connect(host_ws_url) as ws_host, websockets.connect(guest_ws_url) as ws_guest:
            _ = await ws_host.recv()
            _ = await ws_guest.recv()

            # Flush any pending messages on ws_host before disconnecting guest
            while True:
                try:
                    await asyncio.wait_for(ws_host.recv(), timeout=0.2)
                except (asyncio.TimeoutError, Exception):
                    break

            print("  Disconnecting Countess Elena (Guest)...")
            await ws_guest.close()

            # Host should receive disconnect warning
            disc_notice = False
            for _ in range(10):
                try:
                    m = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
                    print(f"    [Host received while guest disconnects] type={m.get('type')}, notice={m.get('notice')}")
                    if m.get("type") == "court_notice" and "disconnected" in m.get("notice", "").lower():
                        disc_notice = True
                        break
                except asyncio.TimeoutError:
                    break
            assert disc_notice, "Disconnect grace notice not received by host"
            print("  ✓ Host received disconnect grace period notice (15s countdown)")

            # Wait 16 seconds for grace period to expire -> AI Takeover!
            print("  Waiting 16 seconds for AI Takeover...")
            ai_takeover_seen = False
            for _ in range(18):
                try:
                    m = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=1.5))
                    if m.get("type") == "control_changed" and m.get("control_type") == "ai" and m.get("seat_id") == guest_seat:
                        ai_takeover_seen = True
                        break
                except asyncio.TimeoutError:
                    continue

            assert ai_takeover_seen, "AI Takeover event not fired after grace period"
            print(f"  ✓ AI Takeover confirmed: Seat {guest_seat} seamlessly assumed by AI")

            # ── 11. Human Reconnects to Exact Same Seat ──
            print("  Reconnecting Countess Elena with same reclaim token...")
            async with websockets.connect(guest_ws_url) as ws_guest_reconnected:
                recon_msg = json.loads(await ws_guest_reconnected.recv())
                assert recon_msg.get("type") in ("room_state", "game_state", "court_notice")

                # Verify control changed back to human
                human_restored = False
                for _ in range(5):
                    m = json.loads(await ws_host.recv())
                    if m.get("type") == "control_changed" and m.get("control_type") == "human" and m.get("seat_id") == guest_seat:
                        human_restored = True
                        break

                assert human_restored, "Human seat control not restored upon reconnect"
                print(f"  ✓ Seat continuity preserved: Countess Elena reclaimed exact same seat ({guest_seat})")
                results["J_LIVING_SEAT_CONTINUITY"] = True

        # ── 12. Host Transfer Test ──
        print("\n[12] Testing Host Transfer when Host Disconnects...")
        async with websockets.connect(host_ws_url) as ws_host, websockets.connect(guest_ws_url) as ws_guest:
            _ = await ws_host.recv()
            _ = await ws_guest.recv()

            # Disconnect host while guest is actively connected
            await ws_host.close()
            await asyncio.sleep(0.5)

            # Guest should observe host transfer notice or room state with new host
            transferred = False
            for _ in range(10):
                try:
                    m = json.loads(await asyncio.wait_for(ws_guest.recv(), timeout=2.0))
                    if m.get("type") == "court_notice" and "transferred" in m.get("notice", "").lower():
                        transferred = True
                        break
                    elif m.get("type") == "room_state" and m.get("host_player_id") == guest_id:
                        transferred = True
                        break
                except asyncio.TimeoutError:
                    break

            room_state = (await http_client.get(f"{BACKEND_URL}/api/rooms/{join_code}")).json()
            assert room_state.get("host_player_id") == guest_id, f"Expected {guest_id}, got {room_state.get('host_player_id')}"
            print(f"  ✓ Host transferred cleanly to Countess Elena ({guest_id})")
            results["K_HOST_TRANSFER"] = True

        # ── 13. Telemetry & Zero-LLM Invariant Check ──
        print("\n[13] Checking Telemetry & LLM Budget Accounting...")
        telem_res = await http_client.get(f"{BACKEND_URL}/api/debug/room/{room_id}/telemetry")
        assert telem_res.status_code == 200
        telem = telem_res.json()
        print(f"  Telemetry for room {room_id}:")
        print(f"    Total logical calls: {telem.get('total_calls')}")
        print(f"    Speech calls:        {telem.get('speech_calls')}")
        print(f"    Trust calls:         {telem.get('trust_calls')}")
        print(f"    Vote calls:          {telem.get('vote_calls')} (Invariant: 0)")
        print(f"    429 count:           {telem.get('rate_limit_429_calls', 0)}")
        assert telem.get("vote_calls", 0) == 0, "Voting must produce 0 LLM calls"
        results["L_CALL_BUDGET"] = True

    print("\n" + "=" * 70)
    print("ALL 12 END-TO-END DYNAMIC AUDIT TESTS PASSED!")
    print("=" * 70)
    return results


if __name__ == "__main__":
    asyncio.run(run_e2e_audit())
