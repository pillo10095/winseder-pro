# Chatbot / Automation Specification

## Purpose

Rule-based automation engine that triggers actions (auto-reply, webhook, AI hook) when inbound WhatsApp messages match defined conditions.

## Requirements

### Requirement: Rule CRUD

Users with admin role MUST be able to create, read, update, and delete automation rules per company.

#### Scenario: Create a keyword rule

- GIVEN an authenticated admin user
- WHEN they create a rule with condition `message.content CONTAINS "horario"` and action `reply.text "Nuestro horario es..."`
- THEN the rule MUST be saved to the `automation_rules` table
- AND the rule MUST be active by default

#### Scenario: Deactivate a rule

- GIVEN an existing active rule
- WHEN the user sets `is_active = false`
- THEN the rule MUST NOT match any incoming messages until reactivated

### Requirement: Condition Matching

The rule engine MUST evaluate ALL active rules (ordered by priority) against each inbound message and execute the FIRST matching rule's actions.

#### Scenario: Keyword match triggers reply

- GIVEN an active rule with condition `message.content CONTAINS "precio"`
- WHEN an inbound message contains "Cuál es el precio?"
- THEN the rule engine MUST match this rule
- AND execute the configured action (send auto-reply)

#### Scenario: Multiple rules, priority order

- GIVEN Rule A (priority 10): condition CONTAINS "urge"
- AND Rule B (priority 5): condition CONTAINS "hola"
- WHEN a message contains both "hola" and "urge"
- THEN Rule A MUST execute (higher priority wins)
- AND Rule B MUST NOT execute for this message

#### Scenario: No rule matches

- GIVEN no active rules match the inbound message
- WHEN the rule engine evaluates
- THEN the message MUST pass through unmodified (no action taken)

#### Scenario: Rules are company-scoped

- GIVEN Company A has rule "hola" and Company B has no rules
- WHEN a message arrives for Company B's session
- THEN Company A's rules MUST NOT be evaluated

### Requirement: Condition Types

The system MUST support at minimum these condition types: `contains` (text in content), `equals` (exact match), `starts_with`, `regex`, and `sender_jid` (specific contact).

#### Scenario: Regex condition

- GIVEN a rule with condition `message.content REGEX "^\\d{10}$"`
- WHEN an inbound message is "11234567890"
- THEN the rule MUST match

#### Scenario: Sender condition

- GIVEN a rule with condition `message.sender_jid EQUALS "5511999999999@s.whatsapp.net"`
- WHEN a message arrives from that exact JID
- THEN the rule MUST match

### Requirement: Action Types

The system MUST support at minimum: `reply.text` (send text), `reply.image` (send image from media library), `webhook` (call external URL), and `ai_hook` (call external AI endpoint and use response).

#### Scenario: Auto-reply text

- GIVEN a matched rule with action `reply.text "Gracias por contactarnos"`
- WHEN the action executes
- THEN the message MUST be sent to the same conversation via Baileys
- AND the reply MUST be marked as `from_me: true`

#### Scenario: AI hook

- GIVEN a matched rule with action `ai_hook` pointing to `https://my-ai.example.com/chat`
- WHEN the action executes
- THEN the inbound message content MUST be POSTed to the AI endpoint
- AND the AI response MUST be sent as the auto-reply
- AND if the AI endpoint fails/timeouts, no reply MUST be sent (fail gracefully)

### Requirement: Execution Logging

Every rule match and action execution MUST be logged for audit and debugging.

#### Scenario: Rule match logged

- GIVEN a rule matches an inbound message
- WHEN the action executes
- THEN a log entry MUST be created with: rule_id, message_id, matched_conditions, action_executed, success/failure
