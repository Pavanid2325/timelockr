import 'express';

declare global {
  namespace Express {
    interface UserIdentity {
      id: string;
      email?: string;
    }

    interface Request {
      user?: UserIdentity;
    }
  }
}

export {};
