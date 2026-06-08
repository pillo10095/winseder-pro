import requests

def test_whatsapp_webhook_receiver():
    base_url = "http://localhost:4000/api"
    url = f"{base_url}/whatsapp/webhook"
    timeout = 30

    # Example valid webhook payload, typical structure for WhatsApp webhook events
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "1234567890",
                                    "id": "wamid.ID",
                                    "timestamp": "1626105600",
                                    "text": {
                                        "body": "Hello World"
                                    },
                                    "type": "text"
                                }
                            ],
                            "metadata": {
                                "display_phone_number": "PHONE_NUMBER",
                                "phone_number_id": "WHATSAPP_PHONE_NUMBER_ID"
                            }
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 201, f"Expected status code 201, got {response.status_code}"

    try:
        resp_json = response.json()
    except ValueError:
        assert False, "Response is not JSON"

    # Validate response body structure and content
    assert "data" in resp_json, "Response JSON missing 'data' key"
    assert isinstance(resp_json["data"], dict), "'data' should be a dictionary"
    assert resp_json["data"].get("status") == "ok", "Expected data.status to be 'ok'"
    assert "meta" in resp_json, "Response JSON missing 'meta' key"

test_whatsapp_webhook_receiver()