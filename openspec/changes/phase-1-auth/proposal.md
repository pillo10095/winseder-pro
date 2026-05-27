# Proposal: Phase 1 — Registro y Login

## Intent
Que un usuario pueda registrarse, iniciar sesión, mantener sesión activa (refresh tokens), y ver un dashboard con su perfil. Base para toda la funcionalidad multi-tenant del sistema.

## Business Value
- Primer contacto del usuario con la plataforma
- Base de seguridad para todas las fases siguientes
- Diferenciación Free vs Planes pagos desde el registro

## Scope

### IN
- Register con auto-creación de empresa gratuita (plan Free)
- Login con JWT + refresh tokens
- Logout con blacklist de tokens
- Protección de rutas (backend + frontend)
- Dashboard post-login con datos del usuario
- Perfil y settings básicos
- Tenancy middleware (companyId en cada request)
- Roles: superadmin, admin, agent

### OUT
- 2FA / TOTP (postergado a Fase 9)
- OAuth social (Google, Facebook)
- Verificación de email
- Password reset completo (solo página, sin lógica)
- Onboarding wizard post-registro

## Technical Approach
1. Extraer JWT logic de `auth.service.ts` a `jwt.service.ts` dedicado
2. Implementar refresh tokens con tabla `refresh_tokens` o en memoria con Redis
3. Blacklist de tokens en Redis para logout
4. Guards: `JwtAuthGuard` (valida token) + `RolesGuard` (valida rol)
5. Decorators: `@CurrentUser()`, `@Roles()`
6. Tenancy middleware: extrae `companyId` del usuario autenticado y lo inyecta en `request.companyId`
7. Frontend: register page, auth store (Zustand), hooks, middleware de Next.js

## Risks
- **Breaking change**: El refactor de auth.service puede romper login existente si no se hace con cuidado
- **JWT Secret**: Debe estar en variable de entorno, no hardcodeado
- **Refresh token rotation**: Implementar rotation para evitar replay attacks
- **TypeORM sync vs migrations**: Pasar de `synchronize: true` a migrations controladas

## Delivery
Estimación: ~32 nano-agentes nuevos/refactor. ~1200 líneas totales.
Recomendación: Dividir en 2 PRs si supera 400 líneas.
- PR 1: Backend (JWT service, guards, decorators, tenancy middleware, controller mejoras)
- PR 2: Frontend (register, hooks, middleware, settings)

## Dependencies
- Fase 0 completa (✅)
- Docker MySQL + Redis corriendo
- OpenSpec configurado con strict TDD
