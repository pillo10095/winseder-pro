import requests
import uuid

BASE_URL = "http://localhost:4000/api"
TIMEOUT = 30

def test_chatbot_flow_creation_with_valid_data():
    # Generate unique user credentials
    unique_suffix = str(uuid.uuid4())[:8]
    email = f"chatflow_{unique_suffix}@example.com"
    password = "TestPass123!"
    name = f"chatflow_{unique_suffix}"

    # Register new user
    register_resp = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": email, "password": password, "name": name},
        timeout=TIMEOUT
    )
    assert register_resp.status_code == 201, f"Register failed: {register_resp.text}"

    # Login to get JWT token
    login_resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 201, f"Login failed: {login_resp.text}"
    login_data = login_resp.json().get("data", login_resp.json())
    assert "access_token" in login_data, "Authentication token not found in response"
    token = login_data["access_token"]

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create an automation rule (chatbot flow equivalent)
    rule_name = f"Test Flow {uuid.uuid4()}"
    rule_payload = {
        "name": rule_name,
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
                    "message": "Hello! How can I assist you today?"
                }
            }
        ]
    }

    response = None
    created_rule_id = None
    try:
        response = requests.post(
            f"{BASE_URL}/automation-rules",
            headers=headers,
            json=rule_payload,
            timeout=TIMEOUT
        )
        assert response.status_code == 201, f"Expected status code 201 but got {response.status_code}"
        json_data = response.json()
        rule_data = json_data.get("data", json_data)
        assert "id" in rule_data, "Response does not contain 'id'"
        assert rule_data.get("name") == rule_name, "Rule name in response does not match request"
        created_rule_id = rule_data["id"]
    finally:
        # Cleanup created rule if created
        if created_rule_id:
            try:
                requests.delete(
                    f"{BASE_URL}/automation-rules/{created_rule_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

test_chatbot_flow_creation_with_valid_data()
