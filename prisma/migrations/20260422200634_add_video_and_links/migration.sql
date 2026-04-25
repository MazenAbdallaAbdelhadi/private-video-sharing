-- CreateEnum
CREATE TYPE "VideoLinkStatus" AS ENUM ('active', 'expired', 'revoked');

-- CreateEnum
CREATE TYPE "VideoLinkEventType" AS ENUM ('first_access', 'init', 'play', 'expired', 'revoked', 'ip_mismatch', 'session_mismatch', 'visibility_hidden', 'window_blur', 'fullscreen_exit');

-- CreateTable
CREATE TABLE "video" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "s3Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "durationSeconds" INTEGER,

    CONSTRAINT "video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_link" (
    "token" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lockedIp" TEXT,
    "sessionId" TEXT,
    "status" "VideoLinkStatus" NOT NULL DEFAULT 'active',
    "revokedAt" TIMESTAMP(3),
    "consumed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "video_link_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "video_link_event" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "VideoLinkEventType" NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "details" JSONB,

    CONSTRAINT "video_link_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_ownerId_idx" ON "video"("ownerId");

-- CreateIndex
CREATE INDEX "video_link_videoId_idx" ON "video_link"("videoId");

-- CreateIndex
CREATE INDEX "video_link_ownerId_idx" ON "video_link"("ownerId");

-- CreateIndex
CREATE INDEX "video_link_expiresAt_idx" ON "video_link"("expiresAt");

-- CreateIndex
CREATE INDEX "video_link_event_token_idx" ON "video_link_event"("token");

-- CreateIndex
CREATE INDEX "video_link_event_createdAt_idx" ON "video_link_event"("createdAt");

-- AddForeignKey
ALTER TABLE "video" ADD CONSTRAINT "video_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_link" ADD CONSTRAINT "video_link_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_link" ADD CONSTRAINT "video_link_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_link_event" ADD CONSTRAINT "video_link_event_token_fkey" FOREIGN KEY ("token") REFERENCES "video_link"("token") ON DELETE CASCADE ON UPDATE CASCADE;
