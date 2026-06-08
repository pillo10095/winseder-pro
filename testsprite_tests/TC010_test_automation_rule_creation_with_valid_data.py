import requests
import uuid

BASE_URL = "http://localhost:4000/api"
TIMEOUT = 30


def test_automation_rule_creation_with_valid_data():
    # Step 1: Register unique user (REQUIRES name field)
    unique_email = f"testuser_{uuid.uuid4()}@example.com"
    register_payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "TestPassword123!"
    }
    headers = {"Content-Type": "application/json"}
    try:
        register_response = requests.post(f"{BASE_URL}/auth/register", json=register_payload, headers=headers, timeout=TIMEOUT)
        assert register_response.status_code == 201, f"Expected 201 on register, got {register_response.status_code}: {register_response.text}"
    except requests.RequestException as e:
        assert False, f"Register request failed: {e}"

    # Step 2: Login (returns 201, NOT 200 — NestJS @Post default)
    login_payload = {
        "email": unique_email,
        "password": "TestPassword123!"
    }
    try:
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_payload, headers=headers, timeout=TIMEOUT)
        assert login_response.status_code == 201, f"Expected 201 on login, got {login_response.status_code}: {login_response.text}"
        login_data = login_response.json()
        # Token is nested inside response.data wrapper
        access_token = login_data["data"]["access_token"]
        assert access_token, "No access_token found in login response"
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    # Step 3: Create automation rule
    # NOTE: Endpoint is /api/automation-rules, NOT /api/chatbot/flows
    automation_url = f"{BASE_URL}/automation-rules"
    automation_payload = {
        "name": "Test Flow",
        "conditions": [
            {
                "field": "message.content",
                "operator": "contains",
                "value": "hi"
            }
        ],
        "actions": [
            {
                "type": "reply.text",
                "config": {
                    "message": "Hello!"
                }
            }
        ]
    }
    auth_headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    try:
        flow_response = requests.post(automation_url, json=automation_payload, headers=auth_headers, timeout=TIMEOUT)
        assert flow_response.status_code == 201, f"Expected 201 on automation rule creation, got {flow_response.status_code}: {flow_response.text}"
        flow_data = flow_response.json()
        # ID is at response.data.id
        flow_id = flow_data["data"]["id"]
        assert flow_id, "No 'id' found in automation rule creation response"
    except requests.RequestException as e:
        assert False, f"Automation rule creation request failed: {e}"


test_automation_rule_creation_with_valid_data()
