# ADR-003: Pricing en Pesos Mexicanos (MXN)

## Status
✅ **Decidido: MXN con centavos, gateway Conekta (MX)**

## Moneda
- Código: **MXN**
- Almacenamiento: centavos (integer) → `price_cents INTEGER`
- Display frontend: formateador `$1,234.56 MXN`
- Símbolo: `$` o `$ MXN` según contexto

## Gateways de Pago para México

| Gateway | Tarifa | Ideal para |
|---|---|---|
| **Conekta** | 2.9% + $3 MXN | SaaS mexicano, facturación CFDI, tarjeta + OXXO + SPEI |
| **Clip** | 3.6% + IVA | Negocios pequeños, terminal físico |
| **Mercado Pago** | 3.39% + $4 MXN | Más conocido, pero menos flexible para SaaS recurrente |

### Recomendación: Conekta
- ✅ Facturación CFDI (requisito legal en México para B2B)
- ✅ Suscripciones recurrentes nativas
- ✅ OXXO, SPEI, tarjetas
- ✅ Dashboard de gestión de suscripciones
- API REST moderna con webhooks

## Planes Sugeridos (en MXN)

| Plan | Precio/mes | Contactos | Sesiones WA | Campañas | IA |
|---|---|---|---|---|---|
| Gratis | $0 | 50 | 1 | 0 | No |
| Básico | $299 | 1,000 | 2 | 5 | No |
| Profesional | $699 | 5,000 | 5 | Ilimitadas | Sí |
| Enterprise | $1,499 | Ilimitados | 20 | Ilimitadas | Sí + API |

## Cambios en el Schema
```sql
ALTER TABLE plans 
  ALTER COLUMN monthly_price_cents TYPE INTEGER;
-- El schema actual usa 'BRL' como default, cambiarlo a 'MXN'
```
