# ADR-006: Estrategia de Hosting

## Status
✅ **Decidido: Desarrollo 100% local (Docker Compose) → El usuario decide producción después**

## Significado de "Sin hosting"
Según lo conversado:
- **Desarrollo**: Local (tu máquina) con Docker Compose
- **Infraestructura local**: MySQL, Redis, MinIO corren en contenedores
- **Frontend/Backend**: Hot-reload local (Next.js dev + NestJS dev)
- **Sin cloud**: No vamos a AWS/DigitalOcean/Vercel por ahora
- **Producción**: Se decide después, pero diseñamos para migrar fácil

## Stack para desarrollo local
```
Servicio       | Puerto  | Docker | Persistencia
─────────────────────────────────────────────────
MySQL 8        | 3306    | ✅     | Volumen ./data/mysql
Redis Stack    | 6379    | ✅     | Volumen ./data/redis
MinIO (API)    | 9000    | ✅     | Volumen ./data/minio
MinIO (Console)| 9001    | ✅     | (web UI para ver archivos)
Nginx          | 80      | ✅     | Proxy reverso
API (NestJS)   | 4000    | ❌     | Hot-reload directo
Web (Next.js)  | 3000    | ❌     | Hot-reload directo
Workers        | -       | ❌     | Procesos Node separados
```

## Estrategia para futura producción (cuando se decida)
- **API + Web** → Cambiar a Docker en producción (Dockerfile.api + Dockerfile.web)
- **DB** → MySQL manejado o RDS (DigitalOcean Managed DB)
- **Redis** → Redis Cloud o Upstash
- **Storage** → DigitalOcean Spaces (mismo API que MinIO = 0 cambios de código)
- **Nginx** → Caddy o Nginx en VPS
- **Workers** → Mismos procesos en background

## Lo que NO bloquea
- No necesitamos dominio
- No necesitamos SSL
- No necesitamos DNS
- No necesitamos backups automatizados (aún)
