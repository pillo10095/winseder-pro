import requests

def test_auth_login_with_invalid_credentials():
    base_url = "http://localhost:4000/api"
    url = f"{base_url}/auth/login"
    headers = {
        "Content-Type": "application/json"
    }
    invalid_credentials = {
        "email": "invalid_user@example.com",
        "password": "wrong_password"
    }
    try:
        response = requests.post(url, json=invalid_credentials, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    
    assert response.status_code == 401, f"Expected status code 401, got {response.status_code}"

test_auth_login_with_invalid_credentials()
