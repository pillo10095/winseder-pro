# ADR-002: Estrategia de Almacenamiento de Archivos

## Status
✅ **Decidido: MinIO (desarrollo) → S3-Compatible (producción)**

## Contexto
WhatsApp envía imágenes, PDFs, audios y videos. Necesitamos almacenarlos de forma segura y accesible.

## Decisión

### Arquitectura

```
WhatsApp (Baileys) → Recibe mensaje → Descarga media → 
  Sube a MinIO/S3 → Guarda URL en DB (messages.media_url)
```

### Desarrollo Local
- **MinIO** en Docker (S3-compatible, mismo API que AWS S3)
- Puerto: 9000 (API) + 9001 (Console)
- Buckets: `wisender-media`, `wisender-temp`
- URL local: `http://minio:9000/wisender-media/{uuid}.{ext}`

### Producción
- **DigitalOcean Spaces** o **AWS S3**
- Misma API, cero cambios de código
- CDN: DigitalOcean CDN o CloudFront

### Formato de URLs
```
media_url = "{bucket}/{company_id}/{session_id}/{uuid}.{ext}"
Ejemplo: "wisender-media/abc123/sess_1/a1b2c3d4.jpg"
```

### Políticas
- Archivos temporales se eliminan después de 7 días (temp bucket)
- Los archivos de mensajes se sirven con URLs prefirmadas (expiración 24h)
- No servir archivos públicos sin autenticación

## Tradeoffs
- MinIO agrega un contenedor más al Docker Compose
- Ventaja: mismo código para dev y prod, cero vendor lock-in
