-- AlterTable
ALTER TABLE "uploads" ALTER COLUMN "userId" DROP NOT NULL,
ADD COLUMN "guestId" TEXT;

-- CreateIndex
CREATE INDEX "uploads_guestId_idx" ON "uploads"("guestId");
