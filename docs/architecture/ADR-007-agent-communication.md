# ADR-007: Comunicación entre Agentes y Flujo de Trabajo

## Status
✅ **Decidido: Orquestación secuencial con artefactos compartidos**

## Contexto
En el plan original asumí que los agentes se "comunican entre sí". Esto no es técnicamente posible en OpenCode. Los sub-agentes (sdd-apply, sdd-explore, etc.) devuelven resultados al agente principal pero no tienen comunicación peer-to-peer.

## Modelo Real

```
                    ┌──────────────────────────────┐
                    │   AG1: YO (Orquestador)      │
                    │   Leo contratos, lanzo       │
                    │   agentes, integro resultados │
                    └────┬──────┬──────┬──────┬────┘
                         │      │      │      │
              ┌──────────┘      │      │      └──────────┐
              ▼                  ▼      ▼                  ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │  AG2 DB  │      │  AG3 API │      │  AG9 FE  │
        │  Schema  │      │  NestJS  │      │  Next.js │
        └────┬─────┘      └────┬─────┘      └────┬─────┘
             │                 │                  │
             └────────┬────────┘                  │
                      ▼                           │
              ┌──────────────┐                    │
              │  Contrato    │                    │
              │  (packages/  │◄───────────────────┘
              │   shared/)   │
              └──────────────┘
```

## Cómo se comunican REALMENTE

### 1. Contratos explícitos (paquete `packages/shared/`)
```typescript
// Todos los agentes importan de acá
// package: @wisender/shared
export interface IUser { ... }
export interface IContact { ... }
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | ...
```

### 2. Schema de base de datos
El schema define las entidades. Todos los módulos escriben contra el mismo modelo. Si AG2 define `contacts.phone VARCHAR(20) NOT NULL`, todos los demás confían en que existe.

### 3. Eventos internos (NestJS EventBus)
No entre agentes, sino entre módulos en tiempo de ejecución:
```typescript
// Módulo WhatsApp emite:
this.eventBus.emit(new MessageReceivedEvent(contactId, content));

// Módulo de Automations escucha:
@OnEvent(MessageReceivedEvent)
handle(event: MessageReceivedEvent) { ... }
```

### 4. Colas BullMQ
Para trabajo asíncrono. CampaignModule encola → CampaignWorker procesa.

### 5. WebSocket (Socket.io)
Backend notifica al frontend en tiempo real. Es el puente entre backend y frontend.

## Flujo de Trabajo por Fase

Cada fase sigue este patrón:

```
1. YO (AG1) reviso los entregables de la fase anterior
2. YO lanzo AG2 (DB) para migraciones si aplica
3. YO lanzo AG3/AG4 (Backend) en paralelo
4. Espero resultados → reviso → integro
5. YO lanzo AG9/AG10 (Frontend)
6. YO lanzo JUDGMENT DAY (review)
7. Si pasa → fase completada. Si no → corrijo y repito
```

**Importante**: En OpenCode, esto significa que en cada mensaje yo (el orquestador) decido qué agente lanzar. No hay automatización entre agentes sin mi intervención.
