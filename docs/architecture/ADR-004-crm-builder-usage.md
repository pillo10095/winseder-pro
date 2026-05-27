# ADR-004: Uso del Skill crm-builder

## Status
✅ **Decidido: Usar solo como referencia de patrones, NO para generar código**

## Contexto
El skill `crm-builder` ya está instalado en el proyecto (.agents/skills/crm-builder), pero está diseñado para el template **Customware SPA** (React Router, layouts específicos, MainLayout con SidebarProvider).

## Decisión
Usamos `crm-builder` como **referencia de patrones de CRM**, NO como generador de código.

### Qué TOMAMOS de crm-builder

| Patrón | Cómo lo aplicamos en Wisender |
|---|---|
| Entity → CRM Record Mapping | Contact → Contact, Company → Company, Deal → Deal |
| Pipeline stage defaults | Lead → Qualified → Proposal → Negotiation → Won/Lost |
| Activity timeline | Timeline en detalle de contacto/deal |
| "Everything links to everything" | Contactos linkean a deals, deals linkean a contactos |
| Status badges | Badge por etapa del pipeline (coloreado) |

### Qué REEMPLAZAMOS

| crm-builder (Customware) | Wisender Pro (Next.js + shadcn) |
|---|---|
| React Router + Outlet | Next.js App Router |
| MainLayout.tsx con SidebarProvider | Dashboard layout propio con sidebar de shadcn |
| Componentes genéricos | Componentes shadcn/ui (Table, Card, Badge, Kanban custom) |

## Conclusión
El skill sirve como checklist de funcionalidad CRM, pero TODO el código se escribe desde cero con Next.js App Router + shadcn/ui.
