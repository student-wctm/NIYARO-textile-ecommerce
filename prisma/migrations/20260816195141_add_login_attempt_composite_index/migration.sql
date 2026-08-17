-- CreateIndex
CREATE INDEX "AdminLoginAttempt_email_lockedUntil_idx" ON "AdminLoginAttempt"("email", "lockedUntil");
