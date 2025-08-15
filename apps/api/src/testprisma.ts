import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  //create a test user
  const newUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: 'hashed_password_123'
    }
  });
  
  // Replace `User` with the actual model name from schema.prisma
  const allUsers = await prisma.user.findMany();
  console.log("Users:", allUsers);

  const allCapsules = await prisma.capsule.findMany();
  console.log("Capsules:", allCapsules);

  const allCapsuleContent = await prisma.capsuleContent.findMany();
  console.log("Capsule Content:", allCapsuleContent);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
