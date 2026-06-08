import requests
import uuid

BASE_URL = "http://localhost:4000/api"
TIMEOUT = 30

def test_session_creation_and_listing_with_authentication():
    # Step 1: Register unique user
    unique_email = f"testuser_{uuid.uuid4()}@example.com"
    register_payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "TestPass123!"
    }
    register_resp = requests.post(
        f"{BASE_URL}/auth/register",
        json=register_payload,
        timeout=TIMEOUT
    )
    assert register_resp.status_code == 201, f"Expected 201 on register, got {register_resp.status_code}: {register_resp.text}"

    # Step 2: Login (returns 201, NOT 200 — NestJS @Post default)
    login_payload = {
        "email": unique_email,
        "password": "TestPass123!"
    }
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_payload,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 201, f"Expected 201 on login, got {login_resp.status_code}: {login_resp.text}"
    login_data = login_resp.json()
    assert "data" in login_data and "access_token" in login_data["data"], "Missing access_token in login response data"
    access_token = login_data["data"]["access_token"]
    auth_headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

    # Step 3: Create session
    # NOTE: Endpoint is POST /api/whatsapp/sessions, NOT /api/sessions/create
    session_name = f"session_{uuid.uuid4()}"
    create_session_payload = {"session_name": session_name}
    create_session_resp = requests.post(
        f"{BASE_URL}/whatsapp/sessions",
        json=create_session_payload,
        headers=auth_headers,
        timeout=TIMEOUT
    )
    assert create_session_resp.status_code == 201, f"Expected 201 on session creation, got {create_session_resp.status_code}: {create_session_resp.text}"
    session_data = create_session_resp.json()
    assert "data" in session_data and "id" in session_data["data"], "Missing session id in create session response"
    session_id = session_data["data"]["id"]

    # Step 4: List sessions
    # NOTE: Endpoint is GET /api/whatsapp/sessions, NOT /api/sessions
    list_sessions_resp = requests.get(
        f"{BASE_URL}/whatsapp/sessions",
        headers=auth_headers,
        timeout=TIMEOUT
    )
    assert list_sessions_resp.status_code == 200, f"Expected 200 on list sessions, got {list_sessions_resp.status_code}: {list_sessions_resp.text}"
    list_data = list_sessions_resp.json()
    assert "data" in list_data and isinstance(list_data["data"], list), "Sessions list data missing or not a list"
    # Check created session is in list
    session_ids = [sess.get("id") for sess in list_data["data"] if "id" in sess]
    assert session_id in session_ids, f"Created session id {session_id} not found in session list"


test_session_creation_and_listing_with_authentication()
