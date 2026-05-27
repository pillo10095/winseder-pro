# Fase 0 — Setup & Fundación

Este documento describe el estado del entregable de la Fase 0 para Wisender Pro.

## ✅ Componentes incluidos

- **Monorepo Turborepo** con workspaces para `apps/*`, `packages/*` y `workers/*`.
- **Backend NestJS** (`apps/api`) con configuración tipada de variables, TypeORM y BullMQ.
- **Frontend Next.js (App Router)** (`apps/web`) con Tailwind CSS, shadcn/ui base y layouts para dashboard y auth.
- **Workers BullMQ** para campañas y mensajes con configuración compartida.
- **Docker Compose** para MySQL 8, Redis, MinIO, API, Web y Nginx reverse proxy.
- **Dockerfiles** independientes para API y Web con build multi-stage.

## 🚀 Cómo levantar el entorno

```bash
npm install
cp .env.example .env
# editar las variables según el entorno local

docker compose up -d

# Comprobar servicios
curl http://localhost:4000/api/health      # → { status: "ok", ... }
open http://localhost:3000                 # → Frontend Next.js
```

> Recordá que el frontend depende del backend corriendo para consumir el healthcheck.

## 📁 Estructura relevante

```
apps/
  api/            → NestJS base con módulo Health
  web/            → Next.js App Router + shadcn/ui
packages/
  shared/         → Constantes y tipos compartidos
workers/
  campaigns/      → Worker para campañas (BullMQ)
  messages/       → Worker para dispatch por sesión
docker/
  Dockerfile.api  → Imagen de la API
  Dockerfile.web  → Imagen del frontend
docs/
  fase-0.md       → Este documento
```

## 🔧 Variables de entorno

Las variables requeridas se documentan en `.env.example`. Completar al menos:

- `API_PORT`, `API_GLOBAL_PREFIX`
- `MYSQL_HOST`, `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER` (por defecto `root`)
- `MYSQL_PASSWORD` (por defecto `carlos12`)
- `REDIS_*`
- `MINIO_*`

Los workers utilizan `BULLMQ_CAMPAIGN_QUEUE` y `BULLMQ_MESSAGE_QUEUE`, con valores por defecto para desarrollo.

## 📋 Próximos pasos (Fase 1)

1. Implementar módulo de autenticación (register/login + multi tenant).
2. Crear migraciones iniciales en `apps/api` y ejecutar `migration:run`.
3. Conectar el frontend con la API vía fetch con `@wisender/shared` como contrato común.

Con esto la Fase 0 queda lista: clonar + instalar + `docker compose up` levanta todo el stack base.
