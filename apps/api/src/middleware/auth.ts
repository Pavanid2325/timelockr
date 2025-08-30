import type { Request, Response, NextFunction } from 'express';

function auth(req: Request, res: Response, next: NextFunction) {
  // TEMP: read acting user from headers (replace with JWT later)
  const id = (req.headers['x-user-id'] as string) || '';
  const email = (req.headers['x-user-email'] as string) || undefined;
  if (!id) return res.status(401).json({ error: 'Unauthorized (send x-user-id header for now)' });
  (req as any).user = { id, email };
  next();
}

module.exports = { auth };
