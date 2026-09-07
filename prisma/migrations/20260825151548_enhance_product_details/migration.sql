-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "additionalDetails" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "fit" TEXT;

-- CreateTable
CREATE TABLE "ProductSimilar" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "similarProductId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSimilar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "customerId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSimilar_productId_idx" ON "ProductSimilar"("productId");

-- CreateIndex
CREATE INDEX "ProductSimilar_similarProductId_idx" ON "ProductSimilar"("similarProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSimilar_productId_similarProductId_key" ON "ProductSimilar"("productId", "similarProductId");

-- CreateIndex
CREATE INDEX "ProductReview_productId_idx" ON "ProductReview"("productId");

-- CreateIndex
CREATE INDEX "ProductReview_customerId_idx" ON "ProductReview"("customerId");

-- CreateIndex
CREATE INDEX "ProductReview_isApproved_idx" ON "ProductReview"("isApproved");

-- AddForeignKey
ALTER TABLE "ProductSimilar" ADD CONSTRAINT "ProductSimilar_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSimilar" ADD CONSTRAINT "ProductSimilar_similarProductId_fkey" FOREIGN KEY ("similarProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
