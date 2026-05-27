# Workers de Wisender Pro

Este directorio agrupa los procesos asíncronos que se comunican con BullMQ. Cada worker se publica como
workspace independiente dentro del monorepo para facilitar el escalado horizontal.

- `campaigns`: Orquesta campañas masivas respetando las ventanas anti-ban.
- `messages`: Entrega de mensajes uno a uno con control de tasa por sesión de WhatsApp.

Ambos workers comparten la configuración de TypeScript y dependen de Redis para conectarse a las colas
definidas en el backend.
