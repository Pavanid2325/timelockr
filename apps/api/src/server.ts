
import express from 'express';
import { registerRoutes } from './routes';

const app = express();

app.use(express.json());
registerRoutes(app);

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});


// app.get('/users', async (req: Request, res: Response) => {
//   try {
//     const users = await prisma.user.findMany();
//     const usersWithoutPasswords = users.map((user: { passwordHash: string;[key: string]: any }) => {
//       const { passwordHash, ...rest } = user;
//       return rest;
//     });
//     res.json(usersWithoutPasswords);
//   } catch (error: any) {
//     res.status(500).json({ error: 'Error fetching users', details: error.message });
//   }
// });

// app.post('/users', async (req: Request, res: Response) => {
//   const { email, passwordHash } = req.body;

//   if (!email || !passwordHash) {
//     return res.status(400).json({ error: 'Email and passwordHash are required' });
//   }

//   try {
//     const hashedPassword = await bcrypt.hash(passwordHash, 10);
//     const user = await prisma.user.create({
//       data: { email, passwordHash: hashedPassword },
//     });
//     const { passwordHash: _, ...userWithoutPassword } = user;
//     res.status(201).json(userWithoutPassword);
//   } catch (error: any) {
//     res.status(500).json({ error: 'Error creating user', details: error.message });
//   }
// });

// app.get('/users/:id', async (req: Request, res: Response) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: req.params.id },
//     });

//     if (!user) return res.status(404).json({ error: 'User not found' });

//     const { passwordHash, ...userWithoutPassword } = user;
//     res.json(userWithoutPassword);
//   } catch (error: any) {
//     res.status(500).json({ error: 'Error fetching user', details: error.message });
//   }
// });

// app.delete('/users/:id', async (req: Request, res: Response) => {
//   try {
//     await prisma.user.delete({
//       where: { id: req.params.id },
//     });
//     res.json({ message: 'User deleted successfully' });
//   } catch (error: any) {
//     res.status(500).json({ error: 'Error deleting user', details: error.message });
//   }
// });
// Uncomment the following lines to use user routes

// async function logInitialData() {
//   console.log('Users:', await prisma.user.findMany());
//   console.log('Capsules:', await prisma.capsule.findMany());
//   console.log('Capsule Content:', await prisma.capsuleContent.findMany());
// }
// logInitialData();


