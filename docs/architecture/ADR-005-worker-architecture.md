# ADR-005: Arquitectura de Workers BullMQ

## Status
✅ **Decidido: Workers separados + Dead Letter Queue + Rate Limiting por empresa**

## Arquitectura

```
                    ┌──────────────────────┐
                    │     NestJS API        │
                    │   (productor)         │
                    └─────────┬────────────┘
                              │
                    ┌─────────▼────────┐
                    │     Redis        │
                    │  (BullMQ Queue)  │
                    └─────────┬────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Campaign Worker │ │  Message Worker │ │ Automation Wkr  │
│  (1 proceso)    │ │  (N procesos)   │ │  (1 proceso)    │
│ Procesa cola    │ │  Envía msgs     │ │  Evalúa reglas  │
│ de campañas     │ │  Límite por ses │ │  Dispara flujos │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Dead Letter Q   │
                    │ (mensajes falli) │
                    └──────────────────┘
```

## Workers

### 1. Campaign Worker (`campaign.worker.ts`)
- **Cola**: `campaign-queue`
- **Concurrencia**: 1 (procesa una campaña a la vez, pero dentro de ella envía N mensajes)
- **Función**: Toma una campaña → itera `campaign_contacts` → por cada contacto, encola en `message-queue`
- **Reintentos**: 3 con backoff exponencial (5s, 30s, 5min)
- **Reporte**: Emite eventos via WebSocket cada `campaign_contacts.status` change

### 2. Message Worker (`message.worker.ts`)
- **Cola**: `message-queue`
- **Concurrencia**: configurable por sesión WhatsApp (default: 1 msg cada 5-15s)
- **Función**: Envía el mensaje real vía Baileys
- **Rate Limiting**: POR SESIÓN de WhatsApp (no global)
- **Reintentos**: 5 con backoff exponencial (10s, 30s, 2min, 10min, 30min)
- **Dead Letter**: después de 5 reintentos → a `message-dlq`

### 3. Automation Worker (`automation.worker.ts`)
- **Cola**: `automation-queue`
- **Concurrencia**: 5 (varias reglas en paralelo)
- **Función**: Escucha eventos internos → evalúa reglas → ejecuta acciones
- **Eventos que escucha**: `message.received`, `deal.stage_changed`, `contact.created`

## Rate Limiting por Sesión de WhatsApp

```typescript
interface MessageRateLimit {
  sessionId: string;
  companyId: string;
  messagesSentToday: number;
  lastMessageAt: Date;
  // Configurable por empresa/sesión
  config: {
    minDelay: number;       // 5000ms default
    maxDelay: number;       // 15000ms default
    dailyLimit: number;     // 500 default
    hourlyLimit: number;    // 50 default
    pauseAfter: number;     // 50 messages
    pauseDuration: number;  // 120000ms (2 min)
    quietHoursStart: string; // "23:00"
    quietHoursEnd: string;   // "08:00"
  }
}
```

## Escalabilidad
- Workers son procesos Node.js separados (pueden correr en múltiples servidores)
- Redis es el bottleneck → Redis Cluster si escalamos
- Cada worker tiene su propia conexión a Redis + DB

## Monitoreo
- BullMQ Dashboard (interfaz web para ver colas)
- Métricas exportadas vía `/metrics` (Prometheus)
- Alertas si la DLQ supera X mensajes en Y minutos
