import { Module } from '@nestjs/common';

import { TenancyMiddleware } from './middleware/tenancy.middleware';

@Module({
  providers: [TenancyMiddleware],
  exports: [TenancyMiddleware],
})
export class CommonModule {}
