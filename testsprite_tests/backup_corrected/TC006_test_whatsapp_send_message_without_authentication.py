import requests

def test_whatsapp_send_message_without_authentication():
    base_url = "http://localhost:4000/api"
    session_id = "test-id"
    url = f"{base_url}/whatsapp/sessions/{session_id}/messages"
    payload = {
        "type": "text",
        "content": "Hello",
        "conversation_id": "test"
    }
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"

test_whatsapp_send_message_without_authentication()