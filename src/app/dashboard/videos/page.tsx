import { headers } from "next/headers";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { UploadWidget } from "@/features/dashboard/upload-widget";
import { VideoGrid } from "@/features/dashboard/videos/video-grid";

export default async function VideosPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect("/login");
  }

  const videos = await prisma.video.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      contentType: true,
      size: true,
      s3Key: true,
      title: true,
      description: true,
      thumbnailS3Key: true,
      durationSeconds: true,
      _count: { select: { clientPages: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Video Library</h1>
        <p className="text-muted-foreground">
          Upload and manage your video assets to use in client pages.
        </p>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-medium">Upload Video</h2>
          <p className="text-sm text-muted-foreground">
            Upload a video file (MP4 preferred). Best results under 2GB.
          </p>
        </div>
        <UploadWidget />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Your Videos</h2>
        <VideoGrid
          videos={videos.map((v) => ({
            ...v,
            createdAt: v.createdAt.toISOString(),
            clientPagesCount: v._count.clientPages,
          }))}
        />
      </div>
    </div>
  );
}
