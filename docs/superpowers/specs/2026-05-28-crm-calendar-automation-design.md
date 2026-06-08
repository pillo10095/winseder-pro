# CRM Calendario + Automatización — Wisender Pro

## Resumen

Calendario de actividades integrado al pipeline de ventas que permite
programar citas, mensajes automáticos, y reglas de automatización
disparadas por cambios de etapa o tiempo sin actividad.

## Stack

- **Frontend:** Next.js 14 App Router, Tailwind CSS, shadcn/ui
- **Estado:** Zustand (calendar-store, automation-store, schedule-store)
- **Calendario:** date-fns + implementación propia (sin librería de calendario externa)
- **Drag & Drop:** @dnd-kit (eventos arrastrables en calendario)
- **Estilo:** Constructivismo Literário Experimental (consistente con Fase 1)
- **API:** NestJS endpoints existentes

## Secciones

### 1. Calendario (Calendar Core + Event Manager)

**Vistas:**
- **Mensual:** Grilla de 7 columnas × 5-6 filas. Cada celda muestra eventos del día.
- **Semanal:** Línea de tiempo horizontal con horas. Eventos como bloques en la hora correspondiente.
- **Toggle** entre vista mensual y semanal.

**Eventos:**
- **Citas:** Tienen contacto, fecha/hora, duración, notas. Color distintivo.
- **Mensajes programados:** Tienen contacto, plantilla, fecha/hora de envío, estado (pendiente/enviado/fallido).
- **Recordatorios:** Notas con fecha. Sin hora fija.

**Comportamiento:**
- Click en celda del calendario → crear evento en esa fecha
- Click en evento → ver/editar detalle
- Los eventos se muestran como badges/cards dentro de cada celda
- Tooltip con detalle al hover

### 2. Reglas de Automatización (Automation Rules)

**Tipos de reglas:**

| Tipo | Trigger | Acción |
|------|---------|--------|
| Por etapa | Lead llega a etapa X | Enviar plantilla Y al contacto |
| Por tiempo | Pasaron N días sin actividad | Enviar recordatorio |
| Por etapa + tiempo | Lead en etapa X por más de N días | Enviar seguimiento |

**Configuración:**
- Nombre de la regla
- Trigger: etapa + días de espera (opcional)
- Acción: plantilla de mensaje a enviar
- Activo/Inactivo (toggle)
- Última ejecución + próxima ejecución

**Engine:**
- Evalúa reglas cuando `lead:moved` se dispara
- Corre en frontend por ahora (consultas a API)
- Muestra en calendario las próximas ejecuciones programadas

### 3. Mensajes Programados (Message Scheduler)

**Flujo:**
1. Seleccionar contacto (desde pipeline o buscar)
2. Seleccionar plantilla (desde listado existente)
3. Elegir fecha y hora de envío
4. Confirmar → se agenda en API

**Lista de programados:**
- Pendientes → fecha futura, se puede cancelar
- Enviados → marca de tiempo real
- Fallidos → motivo del error, opción de reintentar

### 4. WhatsApp Sync

**Importar contacto al pipeline:**
- Botón "Importar desde WhatsApp" en NewLeadDialog
- Lista de conversaciones activas de WhatsApp
- Click → crea lead con nombre, teléfono, origen=whatsapp

## API Endpoints

| Método | Endpoint | Uso |
|--------|----------|-----|
| GET | `/crm/activities` | Listar actividades (filtro por fecha, contacto) |
| POST | `/crm/activities` | Crear actividad |
| PATCH | `/crm/activities/:id` | Actualizar actividad |
| DELETE | `/crm/activities/:id` | Eliminar actividad |
| GET | `/chatbot/automation-rule` | Listar reglas |
| POST | `/chatbot/automation-rule` | Crear regla |
| PATCH | `/chatbot/automation-rule/:id` | Actualizar regla |
| DELETE | `/chatbot/automation-rule/:id` | Eliminar regla |
| POST | `/whatsapp/sessions/:id/messages` | Enviar mensaje |
| GET | `/campaigns/templates` | Listar plantillas |
| GET | `/whatsapp/sessions/:id/conversations` | Listar conversaciones |

## Estilo

Mismo constructivismo que Fase 1:
- `geometric-frame`, `card-constructivist`, `divider-constructivist`
- Paleta: primary rojo, secondary ocre
- rounded-sm, sombras constructivist
- PT Sans + Merriweather
