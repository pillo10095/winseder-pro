# Team Inbox Specification

## Purpose

Multi-agent conversation management: assignment, states, internal notes, and team views on top of existing WhatsApp conversations.

## Requirements

### Requirement: Conversation Assignment

A conversation MAY be assigned to one agent (user) at a time. An unassigned conversation MUST be visible to all agents in the company.

#### Scenario: Assign conversation to agent

- GIVEN an unassigned conversation
- WHEN an agent calls `POST /api/inbox/assign` with conversation ID and target agent ID
- THEN the conversation's `assigned_to` MUST be set to the target agent
- AND a WebSocket event `conversation:assigned` MUST be emitted to all connected agents

#### Scenario: Reassign conversation

- GIVEN a conversation assigned to Agent A
- WHEN an admin reassigns it to Agent B
- THEN Agent A MUST receive a `conversation:unassigned` WS event
- AND Agent B MUST receive a `conversation:assigned` WS event

#### Scenario: View my conversations

- GIVEN an authenticated agent
- WHEN they request `GET /api/inbox/mine`
- THEN ONLY conversations where `assigned_to = agent_id` MUST be returned

### Requirement: Conversation States

A conversation MUST have one of three states: `OPEN` (active), `PENDING` (waiting for external reply), `CLOSED` (resolved).

#### Scenario: Open new conversation

- GIVEN a new inbound message from a contact
- WHEN the conversation is created/upserted
- THEN its status MUST default to `OPEN`

#### Scenario: Close conversation

- GIVEN an OPEN conversation
- WHEN an agent sets status to `CLOSED`
- THEN the conversation MUST NOT appear in the default "open" inbox view
- AND new inbound messages from the same contact MUST reopen it (status → OPEN)

#### Scenario: Filter by status

- GIVEN conversations in various states
- WHEN an agent requests `GET /api/inbox?status=OPEN`
- THEN ONLY conversations with status OPEN MUST be returned

### Requirement: Internal Notes

Agents MAY add internal notes to any conversation. Notes MUST be visible to all agents in the company, NOT to the WhatsApp contact.

#### Scenario: Add note to conversation

- GIVEN an authenticated agent viewing a conversation
- WHEN they submit an internal note
- THEN the note MUST be saved with conversation_id, author_id, content, and timestamp
- AND a WS event `conversation:note` MUST notify other agents viewing the same conversation

#### Scenario: View conversation notes

- GIVEN a conversation with 3 notes from different agents
- WHEN an agent requests notes for that conversation
- THEN all 3 notes MUST be returned ordered by created_at DESC

### Requirement: Team Inbox View

The chat sidebar MUST show all conversations with assignment info, filterable by: "My conversations", "Unassigned", "All open".

#### Scenario: Sidebar shows assignment

- GIVEN conversations with various assignments
- WHEN the sidebar renders
- THEN each conversation item MUST show a badge/indicator with the assigned agent's name or "Unassigned"

#### Scenario: Filter tabs

- GIVEN conversations assigned to Agent A and others unassigned
- WHEN Agent A selects "My conversations" filter
- THEN only conversations assigned to Agent A MUST appear
