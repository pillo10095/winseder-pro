# Wisender Pro - WhatsApp Business API Platform

## Overview
Wisender Pro is a comprehensive WhatsApp Business API platform that enables businesses to manage WhatsApp communications at scale. Built with NestJS and Next.js, it provides multi-agent inbox management, automated chatbot flows, session management, and media delivery.

## Core Features

### 1. WhatsApp Messaging
- Send text, media, and template messages via WhatsApp API
- Receive and process incoming webhook events
- Message status tracking (sent, delivered, read, failed)
- Rate limiting and queue management for high-volume sending

### 2. Session Management
- Create and manage WhatsApp device sessions via QR code
- Session state persistence across restarts
- Multi-device support
- Automatic reconnection on connection loss

### 3. Team Inbox
- Multi-agent conversation management
- Conversation assignment and routing
- Message history and search
- Customer context and notes
- Real-time updates via WebSockets

### 4. Chatbot Automation
- Visual flow builder for automated responses
- Keyword matching and NLP-based intent recognition
- Multi-step conversation workflows
- Integration with external APIs and webhooks

### 5. Outgoing Webhooks
- Event-driven webhook notifications
- Configurable event types (message_received, message_sent, session_status, etc.)
- Payload customization and transformation
- Retry logic with exponential backoff

### 6. Media CDN
- Image, video, document upload and delivery
- MinIO/S3-compatible storage
- URL-based media access with auth
- Thumbnail generation

### 7. Authentication & Authorization
- JWT-based authentication
- Role-based access control (admin, agent, api)
- API key management for programmatic access
- Rate limiting per user/role

## Technical Stack
- **Backend**: NestJS 10.3.0 with TypeScript
- **Database**: MySQL via TypeORM
- **Cache/Queue**: Redis
- **Storage**: MinIO (S3-compatible)
- **Frontend**: Next.js 14.2.3 with React 18
- **Monorepo**: TurboRepo with npm workspaces

## API Endpoints
- POST /api/auth/login - User login
- POST /api/auth/register - User registration
- POST /api/auth/refresh - Token refresh
- GET/POST /api/sessions - Session management
- POST /api/whatsapp/send - Send message
- POST /api/whatsapp/webhook - Webhook receiver
- GET/PUT /api/inbox/conversations - Inbox management
- GET/POST /api/chatbot/flows - Chatbot flows
- GET/POST /api/webhooks - Webhook config
- POST /api/media/upload - File upload
- GET /api/media/:id - File info
