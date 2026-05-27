# Investigación: Motor Anti-Ban para WhatsApp

## ⚠️ ADVERTENCIA
Esto NO es un feature que se resuelve con código. Es un área de investigación continua que requiere meses de pruebas y ajustes. Wisender existe porque tienen años de ingeniería inversa en anti-ban. No lo vamos a clonar en una fase.

## Factores que Detecta WhatsApp para Banear

### 1. Fingerprinting del Navegador (Baileys emula un navegador)
- ✅ User-Agent: debe rotarse y coincidir con un navegador real
- ✅ WebDriver: debe ocultarse (Baileys ya lo hace parcialmente)
- ✅ Canvas fingerprint: Baileys lo emula, pero WhatsApp puede detectar patrones
- ✅ Screen resolution, timezone, language: deben ser consistentes

### 2. Patrones de Envío
- ❌ Enviar mensajes a muchos contactos en segundos
- ❌ Mismos delays exactos entre mensajes
- ❌ Enviar 24/7 sin pausas nocturnas
- ❌ Muchos mensajes no respondidos (relación 1:10 outbound/inbound)

### 3. Comportamiento Humano
- ✅ Pausas aleatorias entre mensajes
- ✅ Diferentes tiempos de "escribiendo..." antes de enviar
- ✅ Horarios de actividad realistas (8am-10pm)
- ✅ Leer mensajes entrantes antes de responder

### 4. Reportes de Usuarios
- Los usuarios que reciben spam REPORTAN el número
- 3+ reportes en 24h = ban temporal
- Reincidencia = ban permanente

### 5. Límites NO Documentados (según la comunidad)
| Límite | Valor estimado |
|---|---|
| Mensajes/día/número nuevo | ~50 |
| Mensajes/día/número maduro (>30 días) | ~500-1000 |
| Nuevos contactos/día | ~50 |
| Broadcasts/día | ~5 (máx 50 contactos c/u) |
| Velocidad entre mensajes | 5-15 segundos mínimo |

## Estrategia Anti-Ban para Wisender Pro

### Capa 1: Configuración de Baileys
```typescript
interface AntiBanConfig {
  // User agent rotado
  userAgent: 'Mozilla/5.0 ...',
  // Fingerprint personalizado por sesión
  fingerprint: {
    hostname: string,
    appVersion: string,
    platform: 'win32' | 'darwin' | 'linux',
  },
  // Sincronización de contactos progresiva
  syncFullHistory: false,
  // Cache de auth durable
  authTimeout: 0, // no timeout
}
```

### Capa 2: Rate Limiting Inteligente
- **Por sesión de WhatsApp**: límites configurables por empresa
- **Por hora del día**: más lento de madrugada, más rápido en horario laboral
- **Por día de la semana**: más lento en fines de semana
- **Por antigüedad del número**: los números nuevos tienen límites más estrictos

### Capa 3: Humanización de Mensajes
- Delays aleatorios entre mensajes: `random(5000, 15000)` ms
- Pausas cada X mensajes: `random(60000, 180000)` ms (1-3 min)
- Variación de tiempo de "escribiendo..."
- Rotación de horarios de envío

### Capa 4: Monitoreo de Salud
```typescript
interface SessionHealth {
  status: 'green' | 'yellow' | 'red';
  messagesSentToday: number;
  messagesReceivedToday: number;
  reportsToday: number;
  qualityRating?: 'green' | 'yellow' | 'red'; // de WhatsApp
  lastBanCheck?: Date;
}
```

### Capa 5: Rotación y Respaldo
- Si una sesión se pone "yellow", reducir envíos automáticamente
- Si una sesión se pone "red" o baneada, activar respaldo automático
- Múltiples números por empresa recomendados (rotación)

## Lo que NO podemos hacer (pero Wisender SÍ)
- ✅ Rotación de IPs/proxies residenciales
- ✅ Clusters de números con balanceo
- ✅ Reconexión automática con reintentos con backoff
- ✅ Machine learning para detectar patrones de ban

## Plan de Implementación
1. **Fase 0 (investigación)**: Configurar Baileys con settings anti-ban, probar con cuentas reales
2. **Fase 1 (básico)**: Rate limiting por empresa + delays aleatorios
3. **Fase 2 (intermedio)**: Monitoreo de salud + reducción automática
4. **Fase 3 (avanzado)**: Rotación de números + proxies

**RECOMENDACIÓN**: No poner en producción sin al menos 2 semanas de pruebas con cuentas reales.
