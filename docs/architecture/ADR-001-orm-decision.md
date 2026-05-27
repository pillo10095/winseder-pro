# ADR-001: TypeORM vs Prisma para Wisender Pro

## Status
✅ **Decidido: TypeORM**

## Contexto
Necesitamos un ORM para MySQL que se integre nativamente con NestJS y soporte multi-tenancy (una DB compartida con `companyId`).

## Decisión

### ✅ TypeORM (ganador)
| Factor | Peso | Nota |
|---|---|---|
| Integración NestJS `@nestjs/typeorm` | Crítico | ✅ Nativa, mantenida por el equipo de NestJS |
| Multi-tenancy (composite keys, scopes) | Crítico | ✅ `@Entity()`, query scopes, migrations |
| MySQL support | Crítico | ✅ Maduro, probado en producción |
| Migraciones | Alto | ✅ CLI propia, soporte para seeds |
| Type Safety | Medio | ⚠️ Generación de tipos manual |
| Rendimiento | Alto | ✅ Sin overhead adicional |
| Documentación | Medio | ✅ Abundante, comunidad grande |

### ❌ Prisma (descartado)
- El módulo `@nestjs/prisma` no es oficial de NestJS
- Overhead de rendimiento (capa de Rust entre Node y MySQL)
- Migraciones más lentas en esquemas grandes (300+ columnas)
- No tan probado con multi-tenancy a nivel de fila

## Conclusión
Usamos **TypeORM** con patrón **Data Mapper** (repositorios separados). Esto nos da:
- Migraciones automáticas con `typeorm migration:generate`
- Seeds para datos de prueba
- `@nestjs/typeorm` 100% compatible
- Multi-tenancy vía `@CheckCompany()` decorator custom

## Tradeoffs
- Más boilerplate que Prisma (hay que escribir entidades a mano)
- TypeORM ya no es "trendy", pero es el caballo de batalla probado de NestJS
