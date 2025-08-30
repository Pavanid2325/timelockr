// apps/api/src/routes/capsules.router.ts
import type { Request, Response } from 'express';
import { Capsule } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const prisma = require('../prisma');
const { auth } = require('../middleware/auth');


const router = express.Router();

/** Narrow Request type that always has user */
type AuthedUser = { id: string; email?: string };
type AuthedRequest<P = any, B = any, Q = any> =
  Request<P, any, B, Q> & { user: AuthedUser };


/** Shared validation helper */
function checkValidation(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
}
/* ---------------------------------multer --------------------------------- */
// ensure uploads dir exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

// configure multer instance
// configure multer instance
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB
  fileFilter: (_req, file, cb: any) => {
  const ok = /^(image|audio|video)\//.test(file.mimetype);
  if (ok) {
    cb(null, true);
  } else {
    cb(new Error('Only images/audio/video allowed'), false);
  }
},

});

/* --------------------------------- CRUD --------------------------------- */

// POST /capsules
// POST /capsules
router.post(
  '/',
  auth,
  [
    body('title')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('title is required'),
    body('unlockAt')
      .isISO8601()
      .withMessage('unlockAt must be a valid ISO date'),
  ],
  async (
    req: AuthedRequest<{}, { title: string; unlockAt: string }>,
    res: Response
  ) => {
    if (!checkValidation(req, res)) return;

    try {
      const { title, unlockAt } = req.body;

      // Always infer ownerId from logged-in user
      const capsule = await prisma.capsule.create({
        data: {
          title,
          unlockAt: new Date(unlockAt),
          ownerId: req.user.id,
          isUnlocked: false, // system-controlled, not client-controlled
        },
      });

      res.status(201).json(capsule);
    } catch (e: any) {
      console.error('Error creating capsule:', e);
      res.status(500).json({
        error: 'Error creating capsule',
        details: e.message,
      });
    }
  }
);


// GET /capsules (list all for logged-in user)
router.get('/', auth, async (req: AuthedRequest, res: Response) => {
  try {
    const now = new Date();

    // Fetch only this user's capsules
    const capsules = await prisma.capsule.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { content: true, media: true, recipients: true },
    });

    // Derive unlock status dynamically
    const items = capsules.map((capsule: Capsule & {
  content: { message: string } | null;
  media: any[];
  recipients: any[];
}) => {
      const unlocked = capsule.isUnlocked || capsule.unlockAt <= now;
      return {
        ...capsule,
        isUnlocked: unlocked,
        message: unlocked
          ? capsule.content?.message ?? null
          : `🔒 Locked until ${capsule.unlockAt.toISOString()}`,
      };
    });

    res.json({ items, total: items.length });
  } catch (e: any) {
    res.status(500).json({ error: 'Error listing capsules', details: e.message });
  }
});



// GET /capsules/:id
router.get(
  '/:id',
  auth,
  [param('id').notEmpty()],
  async (req: AuthedRequest<{ id: string }>, res: Response) => {
    if (!checkValidation(req, res)) return;
    try {
      const cap = await prisma.capsule.findUnique({
        where: { id: req.params.id },
        include: { content: true, media: true, recipients: true },
      });
      if (!cap) return res.status(404).json({ error: 'Capsule not found' });

      const isOwner = cap.ownerId === req.user.id;
      const now = new Date();
      const isUnlocked = cap.status === 1 || !cap.unlockAt || cap.unlockAt <= now;

      let isRecipient = false;
      if (req.user.email && cap.recipients?.length) {
        const uEmail = req.user.email.toLowerCase();
        isRecipient = cap.recipients.some((r: any) => r.email?.toLowerCase() === uEmail);
      }

      if (isOwner) return res.json(cap);
      if ((isRecipient) && isUnlocked) return res.json(cap);

      return res.status(403).json({ error: 'Locked or unauthorized' });
    } catch (e: any) {
      res.status(500).json({ error: 'Error fetching capsule', details: e.message });
    }
  }
);


// PATCH /capsules/:id  (update title/unlockAt only)
router.patch(
  '/:id',
  auth,
  [
    param('id').notEmpty(),
    body('title').optional().isString().trim().notEmpty(),
    body('unlockAt').optional().isISO8601().withMessage('unlockAt must be ISO date'),
  ],
  async (
    req: AuthedRequest<{ id: string }, { title?: string; unlockAt?: string }>,
    res: Response
  ) => {
    if (!checkValidation(req, res)) return;

    try {
      const existing = await prisma.capsule.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Capsule not found' });
      if (existing.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      const data: Record<string, any> = {};
      if (req.body.title !== undefined) data.title = req.body.title;
      if (req.body.unlockAt !== undefined) data.unlockAt = new Date(req.body.unlockAt);

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No fields to update. Provide title and/or unlockAt.' });
      }

      // Persist update
      const updated = await prisma.capsule.update({
        where: { id: req.params.id },
        data,
        include: { content: true, media: true, recipients: true },
      });

      // Derive unlocked flag on the fly for response
      const now = new Date();
      const isUnlocked = updated.isUnlocked || updated.unlockAt <= now;

      res.json({
        ...updated,
        isUnlocked,
        message: isUnlocked
          ? updated.content?.message ?? null
          : `🔒 Locked until ${updated.unlockAt.toISOString()}`,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Error updating capsule', details: e.message });
    }
  }
);

// DELETE /capsules/:id
router.delete(
  '/:id',
  auth,
  [param('id').notEmpty()],
  async (req: AuthedRequest<{ id: string }>, res: Response) => {
    if (!checkValidation(req, res)) return;
    try {
      const cap = await prisma.capsule.findUnique({ where: { id: req.params.id } });
      if (!cap) return res.status(404).json({ error: 'Capsule not found' });
      if (cap.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      await prisma.$transaction([
        prisma.capsuleContent.deleteMany({ where: { capsuleId: req.params.id } }),
        prisma.capsuleMedia.deleteMany({ where: { capsuleId: req.params.id } }),
        prisma.capsuleRecipient.deleteMany({ where: { capsuleId: req.params.id } }),
        prisma.capsule.delete({ where: { id: req.params.id } }),
      ]);
      res.json({ message: 'Capsule deleted' });
    } catch (e: any) {
      res.status(500).json({ error: 'Error deleting capsule', details: e.message });
    }
  }
);

/* --------------------------------- CONTENT --------------------------------- */

// POST /capsules/:id/content (create or update content)
router.post(
  '/:id/content',
  auth,
  [
    param('id').notEmpty(),
    body('message').isString().trim().notEmpty(),
    body('contentType').optional().isString().trim(),
  ],
  async (
    req: AuthedRequest<{ id: string }, { message: string; contentType?: string }>,
    res: Response
  ) => {
    if (!checkValidation(req, res)) return;

    try {
      const cap = await prisma.capsule.findUnique({ where: { id: req.params.id } });
      if (!cap) return res.status(404).json({ error: 'Capsule not found' });
      if (cap.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      const upserted = await prisma.capsuleContent.upsert({
        where: { capsuleId: req.params.id },
        update: {
          message: req.body.message,
          contentType: req.body.contentType ?? 'text/markdown',
        },
        create: {
          capsuleId: req.params.id,
          message: req.body.message,
          contentType: req.body.contentType ?? 'text/markdown',
        },
      });

      res.status(201).json(upserted);
    } catch (e: any) {
      res.status(500).json({
        error: 'Error upserting capsule content',
        details: e.message,
      });
    }
  }
);



/* ---------------------------------- MEDIA ---------------------------------- */

// POST /capsules/:id/media
router.post(
  '/:id/media',
  auth,
  [param('id').notEmpty()],
  upload.single('file'), // field name must be "file"
  async (req: AuthedRequest<{ id: string }>, res: Response) => {
    if (!checkValidation(req, res)) return;

    try {
      const cap = await prisma.capsule.findUnique({ where: { id: req.params.id } });
      if (!cap) return res.status(404).json({ error: 'Capsule not found' });
      if (cap.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      // Build accessible URL (server will serve /uploads dir)
      const fileUrl = `/uploads/${req.file.filename}`;

      const media = await prisma.capsuleMedia.create({
        data: {
          capsuleId: req.params.id,
          fileUrl,
          fileType: req.file.mimetype,
          size: req.file.size,
        },
      });

      res.status(201).json(media);
    } catch (e: any) {
      res.status(500).json({ error: 'Error saving media', details: e.message });
    }
  }
);




/* ------------------------------- RECIPIENTS -------------------------------- */

// ⚠️ Make sure in your Prisma schema you add:
// @@unique([capsuleId, email], name: "capsuleId_email")

// POST /capsules/:id/recipients
router.post(
  '/:id/recipients',
  auth,
  [
    param('id').notEmpty(),
    body('recipients').isArray({ min: 1 }),
    body('recipients.*.email').isEmail(),
  ],
  async (
    req: AuthedRequest<{ id: string }, { recipients: { email: string }[] }>,
    res: Response
  ) => {
    if (!checkValidation(req, res)) return;
    try {
      const cap = await prisma.capsule.findUnique({ where: { id: req.params.id } });
      if (!cap) return res.status(404).json({ error: 'Capsule not found' });
      if (cap.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      const ops = req.body.recipients.map((r) =>
        prisma.capsuleRecipient.upsert({
          where: { capsuleId_email: { capsuleId: req.params.id, email: r.email } },
          update: {},
          create: { capsuleId: req.params.id, email: r.email },
        })
      );
      const created = await prisma.$transaction(ops);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ error: 'Error adding recipients', details: e.message });
    }
  }
);

// DELETE /capsules/:id/recipients/:recipientId
router.delete(
  '/:id/recipients/:recipientId',
  auth,
  [param('id').notEmpty(), param('recipientId').notEmpty()],
  async (req: AuthedRequest<{ id: string; recipientId: string }>, res: Response) => {
    if (!checkValidation(req, res)) return;
    try {
      const cap = await prisma.capsule.findUnique({ where: { id: req.params.id } });
      if (!cap) return res.status(404).json({ error: 'Capsule not found' });
      if (cap.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

      await prisma.capsuleRecipient.delete({ where: { id: req.params.recipientId } });
      res.json({ message: 'Recipient deleted' });
    } catch (e: any) {
      res.status(500).json({ error: 'Error deleting recipient', details: e.message });
    }
  }
);


export default router;