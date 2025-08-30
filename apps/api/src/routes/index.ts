// src/routes/index.ts
import { Express } from 'express';
import usersRouter from './users.router';
import capsulesRouter from './capsules.router';

export function registerRoutes(app: Express) {
  app.use('/users', usersRouter);
  app.use('/capsules', capsulesRouter);
}
