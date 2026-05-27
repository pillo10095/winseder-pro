import { TenancyMiddleware } from '@/common/middleware/tenancy.middleware';

describe('TenancyMiddleware', () => {
  let middleware: TenancyMiddleware;

  beforeEach(() => {
    middleware = new TenancyMiddleware();
  });

  function createMockReqRes(user?: { id: string; email: string; role: string; companyId: string }) {
    const req: any = { user };
    const res: any = {};
    const next = jest.fn();
    return { req, res, next };
  }

  describe('use', () => {
    it('should set companyId from user when user has companyId', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user-1',
        email: 'test@example.com',
        role: 'agent',
        companyId: 'company-1',
      });

      middleware.use(req, res, next);

      expect(req.companyId).toBe('company-1');
      expect(next).toHaveBeenCalled();
    });

    it('should not set companyId when user has no companyId', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user-1',
        email: 'test@example.com',
        role: 'agent',
        companyId: '',
      });

      middleware.use(req, res, next);

      expect(req.companyId).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not set companyId when there is no user', () => {
      const { req, res, next } = createMockReqRes(undefined);

      middleware.use(req, res, next);

      expect(req.companyId).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should call next regardless of user state', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user-2',
        email: 'admin@example.com',
        role: 'admin',
        companyId: 'company-2',
      });

      middleware.use(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
