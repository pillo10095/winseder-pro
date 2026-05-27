# Spec: Phase 1 — Registro y Login

## Functional Requirements

### FR-1: Registro de usuario
- `POST /api/auth/register` con name, email, password
- Validar email único
- Hashear password con scrypt (ya implementado)
- Crear empresa automáticamente con plan Free
- Asignar rol `admin` al primer usuario de la empresa
- Retornar access_token + refresh_token + user

### FR-2: Inicio de sesión
- `POST /api/auth/login` con email, password
- Verificar credenciales con timingSafeEqual
- Verificar is_active
- Actualizar last_login_at
- Retornar access_token + refresh_token + user

### FR-3: Refresh token
- `POST /api/auth/refresh` con refresh_token
- Validar refresh_token (firma + expiry + no revocado)
- Rotar: invalidar viejo, generar nuevo par
- Retornar nuevos access_token + refresh_token

### FR-4: Logout
- `POST /api/auth/logout` con access_token (Auth header)
- Agregar access_token a blacklist hasta su expiry
- Eliminar/revocar refresh_token asociado

### FR-5: Perfil de usuario
- `GET /api/auth/me` - retorna usuario actual (protegido con JWT)
- `PATCH /api/auth/me` - actualizar name, email

### FR-6: Protección de rutas (backend)
- `JwtAuthGuard`: valida Bearer token, verifica blacklist, inyecta user en request
- `RolesGuard`: verifica que el rol del usuario esté en los roles permitidos
- Decorador `@CurrentUser()`: extrae usuario del request
- Decorador `@Roles('admin', 'agent')`: marca rutas con roles permitidos

### FR-7: Tenancy middleware
- Extraer `companyId` del usuario autenticado (del JWT)
- Inyectar en `request.companyId`
- Decorador `@CompanyId()` para acceso en controladores

### FR-8: Frontend — Register
- Página `/register` con formulario (name, email, password, confirm password)
- Validación client-side con zod
- Submit → llama API → guarda tokens → redirige a dashboard
- Link a login si ya tiene cuenta

### FR-9: Frontend — Login (mejoras)
- Refactor existing login page para usar auth store + hook
- Manejar errores (credenciales inválidas, usuario inactivo)

### FR-10: Frontend — Auth store + hooks
- Zustand store: token, user, isAuthenticated, login(), register(), logout(), refresh()
- `use-auth` hook: expone store + auto-refresh en intervalo
- `use-current-user` hook: fetch /api/auth/me, cache en store

### FR-11: Frontend — Route protection
- Next.js middleware: redirige a `/login` si no hay token
- Redirige a `/` si ya hay token y está en login/register

### FR-12: Frontend — Settings
- Página `/settings` con perfil (name, email)
- Cerrar sesión desde header

## Non-functional Requirements
- NFR-1: Passwords hasheados con scrypt (salt 16 bytes)
- NFR-2: Access token expiry: 15 minutos
- NFR-3: Refresh token expiry: 7 días
- NFR-4: Rate limiting en login: 5 intentos por minuto por IP
- NFR-5: Strict TDD: tests unitarios antes de implementar

## Scenarios

### Happy path: Registro → Login → Dashboard
```
1. GET  /register              → ve formulario
2. POST /api/auth/register     → 201, { access_token, refresh_token, user }
3. Redirect a /dashboard       → ve dashboard con su nombre
4. POST /api/auth/refresh      → 200, nuevos tokens (cuando expira access)
5. GET  /api/auth/me           → 200, user data
6. POST /api/auth/logout       → 200, token blacklisted
7. Redirect a /login           → ve login
```

### Error path: Credenciales inválidas
```
1. POST /api/auth/login con email incorrecto → 401 "Invalid credentials"
2. POST /api/auth/login con password incorrecto → 401 "Invalid credentials"
3. POST /api/auth/register con email duplicado → 409 "Email already registered"
```

### Security path: Token inválido
```
1. GET /api/auth/me sin token → 401
2. GET /api/auth/me con token expirado → 401
3. GET /api/auth/me con token blacklisted → 401
4. POST /api/auth/refresh con refresh inválido → 401
```
