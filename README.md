# Wisender Pro

WhatsApp CRM con autenticación OAuth, multi-tenant, y panel web.

## Stack

- **Backend:** NestJS + TypeORM + MySQL + Redis (BullMQ)
- **Frontend:** Next.js + shadcn/ui + Tailwind
- **WhatsApp:** @whiskeysockets/baileys v7
- **Auth:** OAuth 2.0 + JWT
- **Infra:** Docker Compose, Turborepo

## Módulos

- Autenticación OAuth (Google, Microsoft)
- Gestión de suscripciones + multi-tenant
- Sesiones WhatsApp con QR, anti-ban, reconexión
- Chatbot con reglas automatizadas (texto, imágenes, AI hook)
- Team Inbox (asignación, estados, notas internas)
- Almacenamiento de media (S3/MinIO + thumbnails sharp)
- Webhooks salientes con firma HMAC

## Requisitos

- Node.js 20+
- Docker Compose (MySQL + Redis)
- npm / pnpm

## Inicio rápido

```bash
# Clonar e instalar
npm install

# Variables de entorno
cp .env.example .env

# Iniciar infraestructura
docker compose up -d

# Migraciones
npm run migration:run -w apps/api

# Iniciar dev
npm run dev
```

## Licencia

Privado — uso interno.
