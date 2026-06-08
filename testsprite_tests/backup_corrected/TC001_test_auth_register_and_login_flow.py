import requests
import uuid

BASE_URL = "http://localhost:4000/api"
TIMEOUT = 30
HEADERS = {"Content-Type": "application/json"}


def test_auth_register_and_login_flow():
    unique_email = f"testuser_{uuid.uuid4().hex}@example.com"
    register_url = f"{BASE_URL}/auth/register"
    login_url = f"{BASE_URL}/auth/login"

    register_payload = {
        "email": unique_email,
        "password": "TestPassword123!",
        "name": "Test User"
    }

    # Register user
    try:
        resp_register = requests.post(register_url, json=register_payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Registration request failed: {e}"

    assert resp_register.status_code == 201, f"Expected 201 Created on register, got {resp_register.status_code}"
    
    # Login user
    login_payload = {
        "email": unique_email,
        "password": "TestPassword123!"
    }
    try:
        resp_login = requests.post(login_url, json=login_payload, headers=HEADERS, timeout=TIMEOUT)
    except requests.RequestException as e:
        assert False, f"Login request failed: {e}"

    assert resp_login.status_code == 201, f"Expected 201 Created on login, got {resp_login.status_code}"
    
    json_login = None
    try:
        json_login = resp_login.json()
    except ValueError as e:
        assert False, f"Login response is not valid JSON: {e}"

    assert isinstance(json_login, dict), "Login response JSON is not a dict"
    assert "data" in json_login, "'data' key missing from login response"
    assert "meta" in json_login, "'meta' key missing from login response"

    data = json_login["data"]
    assert "access_token" in data, "'access_token' missing in response data"
    assert isinstance(data["access_token"], str) and data["access_token"], "Invalid 'access_token'"
    assert "refresh_token" in data, "'refresh_token' missing in response data"
    assert isinstance(data["refresh_token"], str) and data["refresh_token"], "Invalid 'refresh_token'"
    assert "user" in data, "'user' object missing in response data"
    assert isinstance(data["user"], dict), "'user' in response data is not an object"


test_auth_register_and_login_flow()