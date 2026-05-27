# Outgoing Webhooks Specification

## Purpose

Event-driven HTTP callouts to external systems when specific events occur in the platform.

## Requirements

### Requirement: Webhook Configuration

Admins MUST be able to register webhook endpoints per company. Each webhook config MUST specify: URL, subscribed events list, and optional HMAC secret.

#### Scenario: Create webhook configuration

- GIVEN an authenticated admin user
- WHEN they POST a webhook config with url `https://my-crm.com/webhook`, events `["message.received"]`, and secret `abc123`
- THEN the config MUST be saved to `webhook_configs` table
- AND it MUST be active by default

#### Scenario: Deactivate webhook

- GIVEN an existing webhook config
- WHEN the admin sets `is_active = false`
- THEN no further events MUST be delivered to that URL

### Requirement: Supported Events

The system MUST support at minimum these events: `message.received` (inbound), `message.sent` (outbound), `conversation.assigned`, and `conversation.state_changed`.

#### Scenario: message.received event

- GIVEN an active webhook subscribed to `message.received`
- WHEN a new inbound WhatsApp message is processed
- THEN a POST MUST be made to the webhook URL with payload containing: message_id, conversation_id, contact_jid, content, type, timestamp

#### Scenario: conversation.assigned event

- GIVEN an active webhook subscribed to `conversation.assigned`
- WHEN a conversation is assigned to an agent
- THEN a POST MUST be made with: conversation_id, assigned_to (agent_id), assigned_by, timestamp

### Requirement: Delivery with Retry

Webhook delivery MUST include retry logic with exponential backoff on failure.

#### Scenario: Successful delivery

- GIVEN an event triggers
- WHEN the webhook endpoint responds with HTTP 200
- THEN the delivery is considered successful
- AND no retry is performed

#### Scenario: Failed delivery with retry

- GIVEN an event triggers
- WHEN the webhook endpoint responds with HTTP 5xx or times out
- THEN the delivery MUST be retried up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 16s)
- AND if all retries fail, a log entry MUST record the final failure

#### Scenario: Invalid webhook URL

- GIVEN an event triggers
- WHEN the webhook URL returns HTTP 410 Gone
- THEN the webhook config MUST be automatically deactivated
- AND an alert MUST be logged

### Requirement: HMAC Signature

If a webhook config has a `secret`, every POST MUST include an HMAC-SHA256 signature header for payload verification.

#### Scenario: Signed webhook delivery

- GIVEN a webhook config with secret `abc123`
- WHEN a delivery is made
- THEN the request MUST include header `X-Webhook-Signature: sha256=<HMAC of body>`
- AND the body MUST be the raw JSON payload

### Requirement: Event Bus

The system MUST use an internal event emitter (NestJS EventEmitter) to decouple event producers from webhook delivery.

#### Scenario: Event published to bus

- GIVEN a new message is received in `MessageRelayService`
- WHEN the message is saved to DB
- THEN an event `message.received` MUST be emitted to the event bus with full payload
- AND the webhook delivery service MUST pick it up asynchronously
