declare namespace Express {
  interface User {
    id: string;
    email: string;
    role: string;
    companyId: string;
  }

  interface Request {
    user?: User;
    companyId?: string;
  }
}
