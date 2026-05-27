import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ companyId?: string }>();
    return request.companyId;
  },
);
