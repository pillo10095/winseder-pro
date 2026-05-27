import * as Joi from 'joi';

const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  API_PORT: Joi.number().default(4000),
  API_GLOBAL_PREFIX: Joi.string().default('api'),
  MYSQL_HOST: Joi.string().hostname().default('localhost'),
  MYSQL_PORT: Joi.number().default(3306),
  MYSQL_DATABASE: Joi.string().default('wisender_pro'),
  MYSQL_USER: Joi.string().default('wisender'),
  MYSQL_PASSWORD: Joi.string().allow('').default('wisender_secret_2026'),
  TYPEORM_LOGGING: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_USERNAME: Joi.string().allow('', null),
  REDIS_PASSWORD: Joi.string().allow('', null),
  REDIS_TLS: Joi.boolean().default(false),
  JWT_SECRET: Joi.string().default('wisender-jwt-secret-dev'),
  JWT_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().default('wisender-jwt-refresh-secret-dev'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
});

export default validationSchema;
