# Wisender Pro

Automatización de WhatsApp con CRM multi-tenant, chatbot inteligente y panel web.

## Stack

| Capa | Tecnología |
|------|-----------|
| **Backend** | NestJS 10 + TypeORM + MySQL 8 |
| **Frontend** | Next.js 14 (App Router) + shadcn/ui + Tailwind CSS |
| **WhatsApp** | @whiskeysockets/baileys v7 + BuilderBot |
| **Auth** | JWT + refresh tokens + roles multi-tenant |
| **Queue** | BullMQ (Redis) |
| **Storage** | S3-compatible (MinIO) |
| **AI** | OpenAI + Ollama |
| **Infra** | Docker Compose, Turborepo |

## Estructura del proyecto

```
wisender-pro/
├── apps/
│   ├── api/              # NestJS backend (port 4000)
│   │   ├── src/
│   │   │   ├── modules/  # auth, whatsapp, crm, campaigns, ai, etc.
│   │   │   ├── common/   # guards, decorators, middleware
│   │   │   ├── database/ # migrations + seeds
│   │   │   └── test/     # Jest tests
│   │   └── ...
│   └── web/              # Next.js frontend (port 3000)
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   ├── components/ # UI components
│       │   ├── hooks/    # Custom hooks
│       │   ├── stores/   # Zustand stores
│       │   └── lib/      # API client, utilities
│       └── components/   # Root-level components (legacy)
├── packages/
│   └── shared/           # Shared types, enums, constants
├── workers/
│   └── campaigns/        # BullMQ workers (campaign dispatch)
├── openspec/             # SDD artifacts (spec-driven development)
│   ├── specs/            # Feature specifications
│   └── changes/          # Active/archived changes
└── docker-compose.yml    # MySQL + Redis + MinIO
```

## Requisitos

- Node.js 20+
- Docker Desktop
- npm 10+

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install --legacy-peer-deps

# 2. Variables de entorno
cp .env.example .env

# 3. Iniciar infraestructura (MySQL + Redis + MinIO)
docker compose up -d

# 4. Migraciones
npm run migration:run -w apps/api

# 5. Seeds (opcional)
npm run seed -w apps/api

# 6. Iniciar dev (API + Web simultáneo)
npm run dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:4000
- **API Docs:** http://localhost:4000/api/docs (Swagger)
- **MinIO Console:** http://localhost:9001

## Scripts principales

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Levanta API + Web en modo dev |
| `npm run build` | Build de producción (todo el monorepo) |
| `npm run test` | Tests (TurboRepo) |
| `npm run lint` | ESLint |
| `docker compose up -d` | Infraestructura (MySQL, Redis, MinIO) |

### Por workspace

```bash
npm run dev -w apps/api          # API standalone
npm run dev -w apps/web          # Web standalone
npm run build -w apps/api        # Build API
npm run build -w apps/web        # Build Web
npm run migration:run -w apps/api # Correr migrations
npm run seed -w apps/api         # Seeds
```

## Módulos del backend

| Módulo | Descripción |
|--------|-------------|
| **Auth** | Registro, login, JWT, refresh tokens, roles (superadmin/admin/agent) |
| **WhatsApp** | Sesiones Baileys, QR, mensajes, contacto-sync, anti-ban |
| **CRM** | Pipeline kanban, contactos, actividades, calendario, etiquetas |
| **Campaigns** | Campañas de marketing con dispatch vía BullMQ |
| **Automation** | Reglas automatizadas + mapeo de etiquetas WhatsApp → pipeline |
| **AI** | Integración OpenAI/Ollama para sugerencias y clasificación |
| **Media** | Subida/descarga de archivos (S3/MinIO) con thumbnails |
| **Chatbot** | Configuración de chatbot + reglas de respuesta automática |
| **Inbox** | Bandeja de entrada de mensajes con asignación |
| **Webhooks** | Webhooks salientes con firma HMAC |
| **Anti-ban** | Estrategias de rotación de IPs y delays para evitar baneo |
| **Admin** | Superadmin: planes, empresas, billing, audit logs |

## Frontend — Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/login` | Inicio de sesión |
| `/register` | Registro con creación de empresa |
| `/whatsapp` | Sesiones WhatsApp + QR |
| `/chats` | Bandeja de entrada de conversaciones |
| `/crm/pipeline` | Kanban de pipeline de ventas |
| `/crm/contacts` | Gestión de contactos |
| `/crm/activities` | Timeline de actividades |
| `/crm/calendar` | Calendario de eventos |
| `/crm/automation` | Reglas de automatización |
| `/campaigns` | Campañas de marketing |
| `/settings` | Perfil y configuración |
| `/superadmin` | Panel de administración |

## Testing

```bash
# Todos los tests
npm test

# Tests por workspace
npm test -w apps/api

# Con coverage
npm test -- --coverage -w apps/api
```

**Strict TDD activo** — los tests se escriben antes que la implementación. Ver `openspec/config.yaml`.

## Arquitectura

### Flujo de autenticación

```
Register/Login → AuthController → AuthService → JwtService (JWT)
                                                     ↓
                                              RefreshTokenService (Redis)
                                                     ↓
                                              TokenBlacklistService (Redis)
```

### Flujo de WhatsApp

```
BuilderBotProvider → Baileys (WebSocket) → SessionManager
                                              ↓
                                       MessageHandler
                                        ↙         ↘
                              ContactSync      AI Suggestion
                              CampaignDispatch  Chatbot
```

### Multi-tenancy

Cada request pasa por `TenancyMiddleware` que extrae el `companyId` del JWT. Todas las queries se filtran por empresa automáticamente.

## Variables de entorno clave

| Variable | Default | Descripción |
|----------|---------|-------------|
| `DB_HOST` | localhost | MySQL host |
| `REDIS_HOST` | localhost | Redis host |
| `JWT_SECRET` | — | Secreto para firmar JWT |
| `JWT_EXPIRATION` | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRATION` | 7d | Refresh token TTL |
| `OPENAI_API_KEY` | — | API key de OpenAI |
| `CONEKTA_PRIVATE_KEY` | — | API key de Conekta (pagos MX) |

Ver `.env.example` para lista completa.

## Licencia

Privado — uso interno.
