-- CreateTable
CREATE TABLE "VideoFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoFavorite_userId_idx" ON "VideoFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoFavorite_userId_relativePath_key" ON "VideoFavorite"("userId", "relativePath");

-- AddForeignKey
ALTER TABLE "VideoFavorite" ADD CONSTRAINT "VideoFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
