import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { PageBuilder } from "@/features/dashboard/page-builder/page-builder";

export default async function ClientPageBuilderRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const page = await prisma.clientPage.findFirst({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      clientName: true,
      clientEmail: true,
      videos: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          videoId: true,
          sortOrder: true,
          video: {
            select: {
              id: true,
              title: true,
              durationSeconds: true,
              thumbnailS3Key: true,
            },
          },
        },
      },
    },
  });

  if (!page || page.ownerId !== session.user.id) {
    notFound();
  }

  // Also fetch all user videos so they can select them
  const allVideos = await prisma.video.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      durationSeconds: true,
      thumbnailS3Key: true,
    },
  });

  return (
    <div className="min-h-screen -mx-4 -my-4 lg:-mx-6 lg:-my-6 flex flex-col">
      <PageBuilder
        key={`${page.id}-${page.clientName ?? ""}-${page.clientEmail ?? ""}-${page.videos.length}`}
        initialData={page}
        allVideos={allVideos}
      />
    </div>
  );
}
