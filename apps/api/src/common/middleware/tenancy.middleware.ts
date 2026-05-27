import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      companyId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
        companyId: string;
      };
    }
  }
}

@Injectable()
export class TenancyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.user && req.user.companyId) {
      req.companyId = req.user.companyId;
    }

    next();
  }
}
