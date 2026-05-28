import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configure Swagger/OpenAPI documentation for the API.
 * Requires @nestjs/swagger to be installed.
 *
 * Usage in main.ts:
 *   import { setupSwagger } from './swagger-setup';
 *   setupSwagger(app);
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Wisender Pro API')
    .setDescription('API de automatización de WhatsApp con gestión multi-tenant')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Autenticación y registro')
    .addTag('whatsapp', 'Sesiones y mensajes WhatsApp')
    .addTag('campaigns', 'Campañas de marketing')
    .addTag('crm', 'Gestión de clientes y pipeline')
    .addTag('automations', 'Reglas de automatización')
    .addTag('ai', 'Inteligencia artificial')
    .addTag('anti-ban', 'Protección anti-ban')
    .addTag('admin', 'Administración superadmin')
    .addTag('webhooks', 'Webhooks salientes')
    .addTag('inbox', 'Bandeja de entrada')
    .addTag('health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });
}
