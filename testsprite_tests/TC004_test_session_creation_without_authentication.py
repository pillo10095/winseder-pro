import requests

def test_session_creation_without_authentication():
    base_url = "http://localhost:4000/api"
    url = f"{base_url}/whatsapp/sessions"
    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "session_name": "test_session_without_auth"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    
    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"

test_session_creation_without_authentication()