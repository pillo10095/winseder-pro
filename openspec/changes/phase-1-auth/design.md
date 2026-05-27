# Design: Phase 1 — Registro y Login

## Architecture

### Backend — Auth Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Client     │────▶│ AuthController│────▶│ AuthService  │
│ (Next.js)   │     │              │     │              │
└─────────────┘     │ POST /login  │     │ - register() │
                    │ POST /register│     │ - login()    │
                    │ POST /refresh │     │ - logout()   │
                    │ POST /logout  │     └──────┬───────┘
                    │ GET  /me      │            │
                    └──────┬───────┘            │
                           │                    ▼
                           │           ┌─────────────────┐
                           │           │   JwtService     │
                           │           │ - generateAccess │
                           │           │ - generateRefresh│
                           │           │ - verifyToken()  │
                           │           │ - blacklistToken │
                           │           └─────────────────┘
                           │                    │
                           ▼                    ▼
                    ┌──────────────┐   ┌──────────────────┐
                    │ JwtAuthGuard │   │ TokenBlacklist    │
                    │ RolesGuard   │   │ (Redis)           │
                    └──────────────┘   └──────────────────┘
```

### Token Flow

```
Access Token (JWT):
  payload: { sub: userId, email, role, companyId }
  expiry: 15 min
  signed: HS256 con JWT_SECRET

Refresh Token (JWT):
  payload: { sub: userId, jti: uuid }
  expiry: 7 días
  signed: HS256 con REFRESH_SECRET
  stored: Redis con expiry 7d (para revocación)
  rotation: cada refresh → invalida anterior → emite nuevo par

Token Blacklist:
  key: blacklist:{jti}
  ttl: match access token expiry
  checked: en JwtAuthGuard.canActivate()

sessionId (Redis):
  key: session:{userId}
  value: { jti, refreshJti, createdAt, lastActivity }
  checked: en refresh para verificar sesión activa
```

### Tenancy Middleware

```
Request ─▶ TenancyMiddleware ─▶ Controller
                │
                ▼
         req.companyId = user.companyId
         (del JWT payload)
```

### Frontend — Auth Store + Routes

```
┌─────────────────────────────────────┐
│  Zustand AuthStore                   │
│  - token: string | null              │
│  - refreshToken: string | null       │
│  - user: User | null                 │
│  - isAuthenticated: boolean          │
│  - login(email, pw) → Promise        │
│  - register(name, email, pw) → Promise│
│  - logout() → void                   │
│  - refreshToken() → Promise          │
│  - fetchUser() → Promise             │
└──────────┬──────────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
use-auth.ts    use-current-user.ts
(hook)          (hook)
```

### Route Protection

```
Next.js Middleware (middleware.ts):
  /login, /register          → si hay token → redirect /
  /dashboard, /settings, /*  → si NO hay token → redirect /login
  /api/*                     → pasa (manejado por backend)
```

## Data Model Changes

### New: Refresh Token (Redis, no SQL)
```
Key: refresh:{jti}
Value: { userId, companyId, createdAt, expiresAt }
TTL: 7 días
```

### New: Token Blacklist (Redis, no SQL)
```
Key: blacklist:{jti}
Value: true
TTL: hasta expiry del access token
```

### Existing Entities (no changes needed)
- User: id, companyId, email, name, password_hash, role, is_active, last_login
- Company: id, name, slug, settings, is_active
- Plan: id, name, code, price, features
- Subscription: id, companyId, planId, status, dates

## File Structure Changes

### New files (backend)
```
apps/api/src/auth/services/jwt.service.ts
apps/api/src/auth/services/refresh-token.service.ts
apps/api/src/auth/services/token-blacklist.service.ts
apps/api/src/auth/dto/refresh-token.dto.ts
apps/api/src/auth/dto/auth-response.dto.ts
apps/api/src/common/guards/jwt-auth.guard.ts
apps/api/src/common/guards/roles.guard.ts
apps/api/src/common/decorators/current-user.decorator.ts
apps/api/src/common/decorators/roles.decorator.ts
apps/api/src/common/middleware/tenancy.middleware.ts
apps/api/src/modules/tenancy/dto/company.dto.ts
```

### Modified files (backend)
```
apps/api/src/modules/auth/auth.service.ts (refactor: extraer JWT)
apps/api/src/modules/auth/auth.controller.ts (add refresh, logout, me)
apps/api/src/modules/auth/auth.module.ts (add new providers)
apps/api/src/app.module.ts (register guards globally)
apps/api/src/main.ts (CORS, global pipes)
```

### New files (frontend)
```
apps/web/src/app/(auth)/register/page.tsx
apps/web/src/app/(auth)/forgot-password/page.tsx
apps/web/src/app/(dashboard)/settings/page.tsx
apps/web/src/components/auth/register-form.tsx
apps/web/src/hooks/use-auth.ts
apps/web/src/hooks/use-current-user.ts
apps/web/src/stores/auth-store.ts
apps/web/src/middleware.ts
apps/web/src/components/layout/user-menu.tsx
```

### Modified files (frontend)
```
apps/web/src/lib/api.ts (add register, refresh, logout)
apps/web/src/app/(auth)/login/page.tsx (use auth store)
apps/web/src/components/layouts/dashboard-shell.tsx (user menu)
```

## Tech Decisions

1. **Redis para refresh tokens + blacklist** en vez de SQL: más rápido, TTL nativo, no schema overhead
2. **Zustand** para auth store (ya es dependencia, consistente con el stack)
3. **Next.js middleware** para route protection en vez de HOC: más simple, no render blocking
4. **Roles enum** en shared package: UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.AGENT
5. **Decorators** en lugar de inline checks: reutilizable, declarativo
