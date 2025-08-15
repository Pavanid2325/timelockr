-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Capsule" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unlockAt" TIMESTAMP(3) NOT NULL,
    "isUnlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Capsule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapsuleContent" (
    "id" TEXT NOT NULL,
    "capsuleId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text/markdown',

    CONSTRAINT "CapsuleContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapsuleMedia" (
    "id" TEXT NOT NULL,
    "capsuleId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapsuleMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapsuleRecipient" (
    "id" TEXT NOT NULL,
    "capsuleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hasViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),

    CONSTRAINT "CapsuleRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CapsuleContent_capsuleId_key" ON "CapsuleContent"("capsuleId");

-- AddForeignKey
ALTER TABLE "Capsule" ADD CONSTRAINT "Capsule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapsuleContent" ADD CONSTRAINT "CapsuleContent_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "Capsule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapsuleMedia" ADD CONSTRAINT "CapsuleMedia_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "Capsule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapsuleRecipient" ADD CONSTRAINT "CapsuleRecipient_capsuleId_fkey" FOREIGN KEY ("capsuleId") REFERENCES "Capsule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
