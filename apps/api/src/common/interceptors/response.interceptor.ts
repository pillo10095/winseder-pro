import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, map } from 'rxjs';

export interface SuccessResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    path: string;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // If the response already has a standard shape, pass through
        if (data && typeof data === 'object' && ('data' in data || 'error' in data)) {
          return data as unknown as SuccessResponse<T>;
        }

        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
          },
        } as SuccessResponse<T>;
      }),
    );
  }
}
