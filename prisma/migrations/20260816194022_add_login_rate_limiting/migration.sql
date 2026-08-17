-- CreateTable
CREATE TABLE "AdminLoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_email_idx" ON "AdminLoginAttempt"("email");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_ip_idx" ON "AdminLoginAttempt"("ip");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_lockedUntil_idx" ON "AdminLoginAttempt"("lockedUntil");
