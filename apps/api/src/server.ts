import type { Request, Response } from 'express';

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching users', details: error.message });
  }
});

app.post('/users', async (req: Request, res: Response) => {
  const { email, passwordHash } = req.body;

  if (!email || !passwordHash) {
    return res.status(400).json({ error: 'Email and passwordHash are required' });
  }

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Error creating user', details: error.message });
  }
});

app.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching user', details: error.message });
  }
});

app.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error deleting user', details: error.message });
  }
});

async function logInitialData() {
  console.log('Users:', await prisma.user.findMany());
  console.log('Capsules:', await prisma.capsule.findMany());
  console.log('Capsule Content:', await prisma.capsuleContent.findMany());
}
logInitialData();


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


