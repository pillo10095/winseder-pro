import requests
import uuid

BASE_URL = "http://localhost:4000/api"
TIMEOUT = 30

def test_team_inbox_conversations_listing_with_authentication():
    headers = {"Content-Type": "application/json"}
    user_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    user_password = "TestPass123!"

    # Step 1: Register unique user
    register_payload = {
        "email": user_email,
        "password": user_password,
        "name": "Test User"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=register_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 201, f"Register failed: {resp.status_code} {resp.text}"

    # Step 2: Login user
    login_payload = {
        "email": user_email,
        "password": user_password
    }
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload, headers=headers, timeout=TIMEOUT)
    assert resp.status_code == 201, f"Login failed: {resp.status_code} {resp.text}"
    login_data = resp.json()
    assert "data" in login_data and "access_token" in login_data["data"], "No access_token in login response"
    access_token = login_data["data"]["access_token"]
    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    session_id = None
    try:
        # Step 3: Create session
        session_payload = {"session_name": "test"}
        resp = requests.post(f"{BASE_URL}/whatsapp/sessions", json=session_payload, headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 201, f"Create session failed: {resp.status_code} {resp.text}"
        session_data = resp.json()
        assert "data" in session_data and "id" in session_data["data"], "No session ID in create session response"
        session_id = session_data["data"]["id"]

        # Step 4: GET /api/inbox/{sessionId}/conversations with auth header
        resp = requests.get(f"{BASE_URL}/inbox/{session_id}/conversations", headers=auth_headers, timeout=TIMEOUT)
        assert resp.status_code == 200, f"Listing conversations failed: {resp.status_code} {resp.text}"
        resp_data = resp.json()
        assert "data" in resp_data and "items" in resp_data["data"] and "total" in resp_data["data"], \
            "Response missing expected keys in data"
        # items should be a list
        assert isinstance(resp_data["data"]["items"], list), "Items is not a list"
        # total should be int and >=0
        assert isinstance(resp_data["data"]["total"], int) and resp_data["data"]["total"] >= 0
        # meta can be any dict but should be present
        assert "meta" in resp_data and isinstance(resp_data["meta"], dict)

    finally:
        # Cleanup: if session created, delete session to clean up
        if session_id:
            # Assuming DELETE /api/whatsapp/sessions/{sessionId} to delete session is available and requires auth
            try:
                requests.delete(f"{BASE_URL}/whatsapp/sessions/{session_id}", headers=auth_headers, timeout=TIMEOUT)
            except Exception:
                pass

test_team_inbox_conversations_listing_with_authentication()