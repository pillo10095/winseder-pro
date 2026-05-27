import { ConfigService } from '@nestjs/config';

export interface Environment {
  isProduction: boolean;
  isDevelopment: boolean;
}

export const getEnvironment = (configService: ConfigService): Environment => {
  const nodeEnv = configService.get<string>('app.environment', 'development');

  return {
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv !== 'production'
  };
};
