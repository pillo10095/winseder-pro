# Tasks: Phase 1 — Registro y Login

**Delivery strategy:** single-pr-default (dividir si >400 líneas)
**Chain strategy:** stacked-to-main
**Review workload forecast:** ~1200 lines estimated → 400-line budget risk: HIGH → STOP for approval before apply

---

## Task Organization

Organizado en 12 micro-agentes (AG1-01 a AG1-12), cada uno con sus nano-agentes.

---

### Batch 1 — DB + Seeds (día 1, paralelo)

#### ✅ AG1-01: DB Migrations Auth
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-01M | `apps/api/src/database/migrations/001-create-users.ts` | Crear | nestjs-best-practices | ✅ |
| AG1-01M2 | `apps/api/src/database/migrations/002-create-permissions.ts` | Crear | nestjs-best-practices | ✅ |

#### ✅ AG1-02: DB Migrations Tenancy
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-02M | `apps/api/src/database/migrations/003-create-companies.ts` | Crear | nestjs-best-practices | ✅ |
| AG1-02M2 | `apps/api/src/database/migrations/004-create-plans.ts` | Crear | nestjs-best-practices | ✅ |
| AG1-02M3 | `apps/api/src/database/migrations/005-create-subscriptions.ts` | Crear | nestjs-best-practices | ✅ |

#### ✅ AG1-07: Seeds Actualizados
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-07S | `apps/api/src/seeds/seed.plans.ts` | Refactor | nestjs-best-practices | ✅ |
| AG1-07S2 | `apps/api/src/seeds/seed.admin.ts` | Refactor | nestjs-best-practices | ✅ |

---

### ✅ Batch 2 — Backend Services

#### ✅ AG1-03: JWT Service + Refresh
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-03S | `apps/api/src/modules/auth/services/jwt.service.ts` | Crear | nestjs-best-practices, api-authentication | ✅ |
| AG1-03S2 | `apps/api/src/modules/auth/services/refresh-token.service.ts` | Crear | nestjs-best-practices, api-authentication | ✅ |
| AG1-03S3 | `apps/api/src/modules/auth/services/token-blacklist.service.ts` | Crear | nestjs-best-practices | ✅ |
| AG1-08D | `apps/api/src/modules/auth/dto/refresh-token.dto.ts` | Crear | nestjs-best-practices | ✅ |
| AG1-08D2 | `apps/api/src/modules/auth/dto/auth-response.dto.ts` | Crear | nestjs-best-practices | ✅ |

#### ✅ AG1-05: Tenancy Middleware
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-21M | `apps/api/src/common/middleware/tenancy.middleware.ts` | Crear | nestjs-best-practices | ✅ |
| AG1-20D | `apps/api/src/modules/tenancy/dto/company.dto.ts` | Crear | nestjs-best-practices | ✅ |

#### ✅ AG1-06: Auth Controller Mejoras
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-13C | `apps/api/src/modules/auth/auth.controller.ts` | Refactor | nestjs-best-practices, api-authentication | ✅ |
| AG1-10S | `apps/api/src/modules/auth/auth.service.ts` | Refactor | nestjs-best-practices | ✅ |
| AG1-16N | `apps/api/src/modules/auth/auth.module.ts` | Refactor | nestjs-best-practices | ✅ |

---

### ✅ Batch 3 — Guards + Decorators + Register Page

#### ✅ AG1-04: Auth Guards + Decorators
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-04G | `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` | Crear | api-authentication | ✅ |
| AG1-04G2 | `apps/api/src/modules/auth/guards/roles.guard.ts` | Crear | api-authentication | ✅ |
| AG1-04D | `apps/api/src/common/decorators/current-user.decorator.ts` | Crear | nestjs-best-practices | ✅ |
| AG1-04D2 | `apps/api/src/common/decorators/roles.decorator.ts` | Crear | nestjs-best-practices | ✅ |

#### ✅ AG1-09: Register Page
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-24P | `apps/web/src/app/(auth)/register/page.tsx` | Crear | shadcn | ✅ |
| AG1-27X | `apps/web/src/components/auth/register-form.tsx` | Crear | shadcn | ✅ |
| AG1-25P | `apps/web/src/app/(auth)/forgot-password/page.tsx` | Crear | shadcn | ✅ |

---

### ✅ Batch 4 — Frontend + Tests (COMPLETED)

#### ✅ AG1-10: Auth Hooks + Stores
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-29K | `apps/web/src/hooks/use-auth.ts` | Crear | shadcn | ✅ |
| AG1-30K | `apps/web/src/hooks/use-current-user.ts` | Crear | shadcn | ✅ |
| AG1-10Z | `apps/web/src/stores/auth-store.ts` | Crear | shadcn | ✅ |
| AG1-10Z2 | `apps/web/src/lib/api.ts` | Refactor | shadcn | ✅ |
| AG1-26X | `apps/web/src/app/(auth)/login/page.tsx` | Refactor | shadcn | ✅ |

#### ✅ AG1-11: Route Protection + Settings
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-11M | `apps/web/src/middleware.ts` | Crear | api-authentication | ✅ |
| AG1-32P | `apps/web/src/app/(dashboard)/settings/page.tsx` | Crear | shadcn | ✅ |
| AG1-11X2 | `apps/web/src/components/layout/user-menu.tsx` | Crear | shadcn | ✅ |
| AG1-11X3 | `apps/web/components/layouts/dashboard-shell.tsx` | Refactor | shadcn | ✅ |

#### ✅ AG1-12: Tests
| Nano | Archivo | Acción | Skill | Estado |
|---|---|---|---|---|
| AG1-12T | `apps/api/test/auth/auth.service.spec.ts` | Crear | jest | ✅ |
| AG1-12T2 | `apps/api/test/auth/auth.controller.spec.ts` | Crear | jest | ✅ |
| AG1-12T3 | `apps/api/test/auth/jwt.guard.spec.ts` | Crear | jest | ✅ |
| AG1-12T4 | `apps/api/test/auth/tenancy.middleware.spec.ts` | Crear | jest | ✅ |

---

## Dependencies Graph

```
Batch 1 (paralelo):
  AG1-01 ──┐
  AG1-02 ──┤
  AG1-07 ──┘

Batch 2 (paralelo, depende de Batch 1):
  AG1-03 ──┐
  AG1-05 ──┤
           └── (paralelo entre sí)

Batch 3 (paralelo, depende de Batch 2):
  AG1-04 ──┐
  AG1-06 ──┤
  AG1-09 ──┘

Batch 4 (paralelo, depende de Batch 3):
  AG1-10 ──┐
  AG1-11 ──┤
  AG1-12 ──┘
```

## Verification
- Cada micro-agente: compilar sin errores (`npm run build`)
- Cada batch: turbo lint pasa
- Al final: test suite completa
- Strict TDD: tests antes de implementar

## Review Workload Forecast
- Total estimated: ~1200 lines changed
- 400-line budget risk: HIGH
- Chained PRs recommended: Yes
- Decision needed before apply: Yes
