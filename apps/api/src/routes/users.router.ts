import type { Request, Response } from 'express';

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const prisma = require('../prisma');

const router = express.Router();

/**
 * Helper: return 400 if validation errors exist
 */
function checkValidation(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}

//------- USERS CRUD ------------
/**
 * GET /users
 * - Lists all users (for now). In production you’d typically restrict this.
 * - Removes passwordHash from the response.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    const safe = users.map((user: { passwordHash: string; [key: string]: any }) => {
      const { passwordHash, ...rest } = user;
      return rest;
    });
    res.json(safe);
  } catch (e: any) {
    res.status(500).json({ error: 'Error fetching users', details: e.message });
  }
});

/**
 * POST /users
 * - Creates a user.
 * - Validates email and password length (>= 8).
 * - Hashes password before saving.
 * - Returns the created user WITHOUT passwordHash.
 */
type CreateUserBody = { email: string; passwordHash: string };
router.post(
  '/',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('passwordHash').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req: Request<{}, {}, CreateUserBody>, res: Response) => {
    if (!checkValidation(req, res)) return;

    const { email, passwordHash } = req.body;

    try {
      const hashed = await bcrypt.hash(passwordHash, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash: hashed },
      });
      const { passwordHash: _, ...safe } = user;
      res.status(201).json(safe);
    } catch (e: any) {
      // Prisma unique-constraint error → 409 Conflict
      if (e?.code === 'P2002' && e?.meta?.target?.includes?.('email')) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      res.status(500).json({ error: 'Error creating user', details: e.message });
    }
  }
);

/**
 * GET /users/:id
 * - Returns one user by id (if exists).
 * - Validates :id not empty.
 * - Removes passwordHash from response.
 */
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('id is required')],
  async (req: Request<{ id: string }>, res: Response) => {
    if (!checkValidation(req, res)) return;

    try {
      const user = await prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      const { passwordHash, ...safe } = user;
      res.json(safe);
    } catch (e: any) {
      res.status(500).json({ error: 'Error fetching user', details: e.message });
    }
  }
);

/**
 * PATCH /users/:id
 * - Optional: allow updating email or password (re-hash).
 * - Validates inputs only if present.
 * - Returns updated user without passwordHash.
 */
type UpdateUserBody = { email?: string; passwordHash?: string };
router.patch(
  '/:id',
  [
    param('id').notEmpty().withMessage('id is required'),
    body('email').optional().isEmail().withMessage('email must be valid'),
    body('passwordHash').optional().isLength({ min: 8 }).withMessage('password must be >= 8 chars'),
  ],
  async (req: Request<{ id: string }, {}, UpdateUserBody>, res: Response) => {
    if (!checkValidation(req, res)) return;

    const { email, passwordHash } = req.body;

    try {
      const data: any = {};
      if (email) data.email = email;
      if (passwordHash) data.passwordHash = await bcrypt.hash(passwordHash, 10);

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data,
      });

      const { passwordHash: _, ...safe } = updated;
      res.json(safe);
    } catch (e: any) {
      if (e?.code === 'P2002' && e?.meta?.target?.includes?.('email')) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      if (e?.code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Error updating user', details: e.message });
    }
  }
);

/**
 * DELETE /users/:id
 * - Deletes a user by id.
 * - Validates :id not empty.
 */
router.delete(
  '/:id',
  [param('id').notEmpty().withMessage('id is required')],
  async (req: Request<{ id: string }>, res: Response) => {
    if (!checkValidation(req, res)) return;

    try {
      await prisma.user.delete({ where: { id: req.params.id } });
      res.json({ message: 'User deleted successfully' });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: 'Error deleting user', details: e.message });
    }
  }
);

export default router;