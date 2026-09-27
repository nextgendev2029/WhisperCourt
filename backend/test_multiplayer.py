import asyncio
import json
import websockets
import httpx

BACKEND_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000"

async def test_full_multiplayer_flow():
    print("--- [TEST 1] Creating Room ---")
    async with httpx.AsyncClient() as client:
        res = await client.post(f"{BACKEND_URL}/api/rooms/create", json={
            "court_size": 5,
            "player_name": "Host Lady Vane"
        })
        assert res.status_code == 200, f"Create failed: {res.text}"
        host_data = res.json()
        room_id = host_data["room_id"]
        join_code = host_data["join_code"]
        host_pid = host_data["player_id"]
        host_token = host_data["player_token"]
        print(f"Room created: {room_id}, Code: {join_code}, Host: {host_pid}")

        print("\n--- [TEST 2] Second Player Joins ---")
        res2 = await client.post(f"{BACKEND_URL}/api/rooms/join", json={
            "join_code": join_code,
            "player_name": "Count Arjun"
        })
        assert res2.status_code == 200, f"Join failed: {res2.text}"
        p2_data = res2.json()
        p2_pid = p2_data["player_id"]
        p2_token = p2_data["player_token"]
        print(f"Player 2 joined: {p2_pid}, Seat: {p2_data['seat_id']}")

        print("\n--- [TEST 3] Third Player Joins ---")
        res3 = await client.post(f"{BACKEND_URL}/api/rooms/join", json={
            "join_code": join_code,
            "player_name": "Duchess Priya"
        })
        assert res3.status_code == 200
        p3_data = res3.json()
        p3_pid = p3_data["player_id"]
        p3_token = p3_data["player_token"]
        print(f"Player 3 joined: {p3_pid}, Seat: {p3_data['seat_id']}")

        print("\n--- [TEST Invalid Code] ---")
        res_inv = await client.post(f"{BACKEND_URL}/api/rooms/join", json={
            "join_code": "XXXXX",
            "player_name": "Intruder"
        })
        assert res_inv.status_code == 404
        assert res_inv.json()["detail"] == "COURT NOT FOUND"
        print("Invalid code correctly rejected with 404 COURT NOT FOUND")

        # Check Room State via GET
        room_info_res = await client.get(f"{BACKEND_URL}/api/rooms/{join_code}")
        room_info = room_info_res.json()
        print(f"Room status: {len(room_info['players'])} players, {len(room_info['seats'])} seats")
        assert len(room_info["seats"]) == 5

    print("\n--- [TEST 4 & 5] Connecting WebSockets for Host, Player 2, and Player 3 ---")
    host_ws_url = f"{WS_URL}/ws/room/{room_id}?player_id={host_pid}&player_token={host_token}"
    p2_ws_url = f"{WS_URL}/ws/room/{room_id}?player_id={p2_pid}&player_token={p2_token}"
    p3_ws_url = f"{WS_URL}/ws/room/{room_id}?player_id={p3_pid}&player_token={p3_token}"

    ws_host = await websockets.connect(host_ws_url)
    ws_p2 = await websockets.connect(p2_ws_url)
    ws_p3 = await websockets.connect(p3_ws_url)

    try:
        # Drain initial room_state messages
        msg_h = json.loads(await ws_host.recv())
        msg_2 = json.loads(await ws_p2.recv())
        msg_3 = json.loads(await ws_p3.recv())
        print(f"All 3 players connected to WebSocket! Received type: {msg_h.get('type')}")

        print("\n--- [TEST Host Starts Court] ---")
        await ws_host.send(json.dumps({"action": "start_court"}))

        # Wait for court_started / game_state on all 3 clients
        started_h = False
        started_2 = False
        started_3 = False

        for _ in range(5):
            msg = json.loads(await ws_host.recv())
            if msg.get("type") in ("court_started", "room_state", "game_state"):
                started_h = True
                break

        for _ in range(5):
            msg = json.loads(await ws_p2.recv())
            if msg.get("type") in ("court_started", "room_state", "game_state"):
                started_2 = True
                break

        for _ in range(5):
            msg = json.loads(await ws_p3.recv())
            if msg.get("type") in ("court_started", "room_state", "game_state"):
                started_3 = True
                break

        assert started_h and started_2 and started_3, "Court start not received by all clients"
        print("All clients received synchronized start!")

        print("\n--- [TEST Human Player Performs Actions] ---")
        # Player 2 asks a question
        await ws_p2.send(json.dumps({
            "action": "question",
            "target_id": "agent_0",
            "question": "Lord Ashwick, can you explain your silence during the first decree?"
        }))
        print("Player 2 sent question action successfully")

        # Player 3 levels accusation
        await ws_p3.send(json.dumps({
            "action": "accuse",
            "target_id": "agent_3",
            "reason": "Repeatedly contradicts earlier statements"
        }))
        print("Player 3 sent accusation action successfully")

        print("\n--- [TEST Disconnect & AI Takeover] ---")
        # Drain any already-buffered statements on host
        while True:
            try:
                await asyncio.wait_for(ws_host.recv(), timeout=0.2)
            except asyncio.TimeoutError:
                break

        # Player 3 disconnects!
        print("Closing Player 3's WebSocket connection...")
        await ws_p3.close()

        print("Host listening for disconnect notice and 15s grace period countdown...")
        takeover_observed = False
        start_time = asyncio.get_event_loop().time()

        # Listen for court notice of AI takeover (grace period is 15s)
        while asyncio.get_event_loop().time() - start_time < 30:
            try:
                raw = await asyncio.wait_for(ws_host.recv(), timeout=20.0)
                msg = json.loads(raw)
                print("  Host received msg:", msg.get("type"), "| notice:", msg.get("notice", ""), "| control:", msg.get("control_type", ""))
                if msg.get("type") == "court_notice" and "AI control assumed" in msg.get("notice", ""):
                    takeover_observed = True
                    break
                elif msg.get("type") == "control_changed" and msg.get("control_type") == "ai":
                    takeover_observed = True
                    break
            except asyncio.TimeoutError:
                break

        assert takeover_observed, "AI Takeover notice not observed after grace period!"
        print("SUCCESS: Disconnected player seat was seamlessly assumed by AI!")

        print("\n--- [TEST Human Reconnects with Same Token] ---")
        # Player 3 reconnects using their player_token
        ws_p3_re = await websockets.connect(p3_ws_url)
        try:
            re_msg = json.loads(await ws_p3_re.recv())
            print("Player 3 reconnected, received:", re_msg.get("type"))
            
            # Check for player_returned or control_changed to human
            restored = False
            for _ in range(5):
                raw = await ws_p3_re.recv()
                msg = json.loads(raw)
                print("  Post-reconnect msg:", msg.get("type"))
                if msg.get("type") == "player_returned" or (msg.get("type") == "control_changed" and msg.get("control_type") == "human"):
                    restored = True
                    break
                if msg.get("type") == "room_state":
                    # Check seat control_type
                    seat3 = next((s for s in msg.get("seats", []) if s.get("player_id") == p3_pid), None)
                    if seat3 and seat3.get("control_type") == "human":
                        restored = True
                        break

            assert restored, "Human control was not restored upon reconnect!"
            print("SUCCESS: Human control restored to the exact same seat and character!")
        finally:
            await ws_p3_re.close()

    finally:
        await ws_host.close()
        await ws_p2.close()

    print("\nALL BACKEND MULTIPLAYER SCENARIOS PASSED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_full_multiplayer_flow())
