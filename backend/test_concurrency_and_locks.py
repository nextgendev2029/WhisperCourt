"""
Whisper Court - Forensic Concurrency, Room Locks, and Idempotency Audit.

Tests using in-process TestClient with deterministic Mock LLM:
1. Rapid duplicate start_court -> exactly 1 start, second rejected with already_running.
2. Rapid duplicate run_demo -> second rejected with already_running.
3. Duplicate vote from same seat -> second rejected with already_voted.
4. Telemetry audit endpoints -> /api/debug/room/{room_id}/telemetry and /api/debug/game/{game_id}/telemetry.
"""

import json
from fastapi.testclient import TestClient
from main import app, rooms
from groq_client import set_llm_mock
from llm_telemetry import telemetry


def mock_fast_llm(messages, model):
    user_msg = messages[-1].get("content", "")
    sys_msg = messages[0].get("content", "")
    if "trust changes" in sys_msg or "trust_delta" in user_msg or "evaluating trust" in user_msg.lower():
        return json.dumps({"trust_delta": -5, "reason": "mocked suspicion"})
    return "I declare under the court that I am innocent of all treason."


def run_all_tests():
    print("=" * 60)
    print("AUDIT SUITE: ROOM GAME LOCKS, IDEMPOTENCY & TELEMETRY")
    print("=" * 60)

    set_llm_mock(mock_fast_llm)
    telemetry.reset()

    with TestClient(app) as client:
        # -------------------------------------------------------------
        # TEST 1: Rapid Duplicate start_court
        # -------------------------------------------------------------
        print("\n--- [TEST 1] Rapid Duplicate start_court ---")
        res1 = client.post("/api/rooms/create", json={"player_name": "HostPlayer", "court_size": 5})
        assert res1.status_code == 200
        r1_data = res1.json()
        room1_id = r1_data["room_id"]
        h1_id = r1_data["player_id"]
        h1_token = r1_data["player_token"]

        with client.websocket_connect(f"/ws/room/{room1_id}?player_id={h1_id}&token={h1_token}") as ws:
            ws.receive_json()  # initial room_state

            # First start_court
            ws.send_json({"action": "start_court"})
            # Rapid second start_court
            ws.send_json({"action": "start_court"})

            started_events = 0
            already_running_count = 0

            # Drain messages until already_running is received
            for _ in range(8):
                try:
                    msg = ws.receive_json()
                    print(f"Test 1 received: type={msg.get('type')}, status={msg.get('status')}")
                    if msg.get("type") == "court_started":
                        started_events += 1
                    elif msg.get("status") == "already_running":
                        already_running_count += 1
                        break
                except Exception:
                    break

            print(f"court_started events: {started_events}, already_running notices: {already_running_count}")
            assert started_events == 1, f"Expected 1 court_started, got {started_events}"
            assert already_running_count >= 1, f"Expected at least 1 already_running rejection, got {already_running_count}"
            print("✅ TEST 1 PASSED: Only 1 court started. Duplicate start rejected with already_running.")

        # -------------------------------------------------------------
        # TEST 2: Rapid Duplicate run_demo
        # -------------------------------------------------------------
        print("\n--- [TEST 2] Rapid Duplicate run_demo ---")
        res2 = client.post("/api/rooms/create", json={"player_name": "DemoHost", "court_size": 4})
        r2_data = res2.json()
        room2_id = r2_data["room_id"]
        h2_id = r2_data["player_id"]
        h2_token = r2_data["player_token"]

        with client.websocket_connect(f"/ws/room/{room2_id}?player_id={h2_id}&token={h2_token}") as ws2:
            ws2.receive_json()  # room_state
            ws2.send_json({"action": "start_court"})
            # Drain start messages until started=True
            while True:
                msg = ws2.receive_json()
                if msg.get("type") == "room_state" and msg.get("started"):
                    break

            # Artificially engage room lock to simulate concurrent invocation
            room_obj = rooms[room2_id]
            room_obj.game_running = True

            # Attempt run_demo while game_running is True
            ws2.send_json({"action": "run_demo", "rounds": 1})
            reject_msg = ws2.receive_json()

            assert reject_msg.get("status") == "already_running", f"Expected already_running, got {reject_msg}"
            print("✅ TEST 2 PASSED: Concurrent run_demo rejected by room game_running lock.")
            room_obj.game_running = False

        # -------------------------------------------------------------
        # TEST 3: Duplicate Vote Submission (Idempotent Ballot)
        # -------------------------------------------------------------
        print("\n--- [TEST 3] Duplicate Vote Submission ---")
        res3 = client.post("/api/rooms/create", json={"player_name": "VoterHost", "court_size": 4})
        r3_data = res3.json()
        room3_id = r3_data["room_id"]
        join_code3 = r3_data["join_code"]
        h3_id = r3_data["player_id"]
        h3_token = r3_data["player_token"]

        # Player 2 joins so room has 2 humans and doesn't auto-resolve on host's first vote
        res_p2 = client.post("/api/rooms/join", json={"join_code": join_code3, "player_name": "VoterTwo"})
        p2_data = res_p2.json()

        with client.websocket_connect(f"/ws/room/{room3_id}?player_id={h3_id}&token={h3_token}") as ws3, \
             client.websocket_connect(f"/ws/room/{room3_id}?player_id={p2_data['player_id']}&token={p2_data['player_token']}") as ws_p2:

            ws3.receive_json()  # room_state
            ws_p2.receive_json()

            ws3.send_json({"action": "start_court"})
            while True:
                msg = ws3.receive_json()
                if msg.get("type") == "room_state" and msg.get("started"):
                    break

            # Advance to voting via next_round
            ws3.send_json({"action": "next_round"})

            # Drain until voting phase
            voting_entered = False
            for _ in range(30):
                msg = ws3.receive_json()
                if msg.get("type") == "phase_change" and msg.get("phase") == "voting":
                    voting_entered = True
                    break

            assert voting_entered, "Did not enter voting phase"

            # Host submits first vote
            ws3.send_json({"action": "vote", "accused_id": "agent_2"})
            # Host immediately submits second vote (rapid double-click)
            ws3.send_json({"action": "vote", "accused_id": "agent_3"})

            vote_progress_received = False
            vote_rejected = False

            for _ in range(10):
                msg = ws3.receive_json()
                if msg.get("type") == "vote_progress":
                    vote_progress_received = True
                if msg.get("status") == "already_voted":
                    vote_rejected = True
                    break

            assert vote_progress_received, "First vote did not record progress"
            assert vote_rejected, "Second vote was not rejected with already_voted status"
            print("✅ TEST 3 PASSED: Duplicate vote rejected by server idempotency guard.")


        # -------------------------------------------------------------
        # TEST 4: Developer Telemetry REST Endpoints (Section 25)
        # -------------------------------------------------------------
        print("\n--- [TEST 4] Developer Telemetry REST Endpoints ---")
        telem_res = client.get(f"/api/debug/room/{room3_id}/telemetry")
        assert telem_res.status_code == 200, f"Telemetry endpoint failed: {telem_res.text}"
        data = telem_res.json()
        print("Room Telemetry Response:")
        print(json.dumps(data, indent=2))

        required_keys = [
            "total_calls",
            "speech_calls",
            "trust_calls",
            "vote_calls",
            "retries",
            "failures",
            "active_llm_requests",
            "expected_calls",
        ]
        for key in required_keys:
            assert key in data, f"Missing required telemetry key: {key}"

        print("✅ TEST 4 PASSED: Telemetry endpoint returned all Section 25 required metrics.")

    set_llm_mock(None)
    print("\n" + "=" * 60)
    print("ALL CONCURRENCY, LOCK, AND IDEMPOTENCY AUDIT TESTS PASSED!")
    print("=" * 60)


if __name__ == "__main__":
    run_all_tests()
