import requests

def test_team_inbox_conversations_listing_without_authentication():
    base_url = "http://localhost:4000/api"
    session_id = "test-session-id"
    url = f"{base_url}/inbox/{session_id}/conversations"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200
    json_resp = response.json()

    assert "data" in json_resp, "Response JSON missing 'data' key"
    data = json_resp["data"]
    assert isinstance(data, dict), "'data' should be a dict"

    assert "items" in data, "'data' missing 'items'"
    assert isinstance(data["items"], list), "'items' should be a list"

    assert "total" in data, "'data' missing 'total'"
    assert isinstance(data["total"], int), "'total' should be an integer"

    assert "meta" in json_resp, "Response JSON missing 'meta' key"
    assert isinstance(json_resp["meta"], dict), "'meta' should be a dict"

test_team_inbox_conversations_listing_without_authentication()