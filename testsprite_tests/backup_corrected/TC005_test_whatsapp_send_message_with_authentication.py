import requests
import uuid

BASE_URL = "http://localhost:4000/api"
TIMEOUT = 30

def test_whatsapp_send_message_with_authentication():
    headers = {"Content-Type": "application/json"}

    # Step 1: Register unique user
    unique_email = f"user_{uuid.uuid4()}@example.com"
    register_payload = {
        "email": unique_email,
        "password": "TestPass123!",
        "name": f"User {uuid.uuid4().hex}"
    }
    register_resp = requests.post(
        f"{BASE_URL}/auth/register",
        json=register_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert register_resp.status_code == 201, f"Register failed: {register_resp.text}"

    # Step 2: Login (returns 201, NOT 200 — NestJS @Post default)
    login_payload = {
        "email": unique_email,
        "password": "TestPass123!"
    }
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 201, f"Login failed: {login_resp.text}"
    login_data = login_resp.json()
    access_token = login_data.get("data", {}).get("access_token")
    assert access_token, "Access token not found in login response"

    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    session_id = None
    try:
        # Step 3: Create session
        # NOTE: Endpoint is POST /api/whatsapp/sessions, NOT /api/sessions/create
        session_payload = {"session_name": "test"}
        session_resp = requests.post(
            f"{BASE_URL}/whatsapp/sessions",
            json=session_payload,
            headers=auth_headers,
            timeout=TIMEOUT
        )
        assert session_resp.status_code == 201, f"Session creation failed: {session_resp.text}"
        session_data = session_resp.json()
        session_id = session_data.get("data", {}).get("id")
        assert session_id, "Session ID not found in session creation response"

        # Step 4: Send message
        # NOTE: Endpoint is POST /api/whatsapp/sessions/{sessionId}/messages, NOT /api/whatsapp/send
        message_payload = {
            "type": "text",
            "content": "Hello"
        }
        message_resp = requests.post(
            f"{BASE_URL}/whatsapp/sessions/{session_id}/messages",
            json=message_payload,
            headers=auth_headers,
            timeout=TIMEOUT
        )
        assert message_resp.status_code == 201, f"Send message failed with status {message_resp.status_code}: {message_resp.text}"
    finally:
        if session_id:
            try:
                requests.delete(
                    f"{BASE_URL}/whatsapp/sessions/{session_id}",
                    headers=auth_headers,
                    timeout=TIMEOUT
                )
            except Exception:
                pass  # Ignore cleanup errors

test_whatsapp_send_message_with_authentication()
