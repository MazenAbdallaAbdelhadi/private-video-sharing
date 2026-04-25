import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: clientPageId } = await params;
    const { videoId } = await request.json();

    const page = await prisma.clientPage.findUnique({ where: { id: clientPageId } });
    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Get current max sort order
    const maxSort = await prisma.clientPageVideo.aggregate({
      where: { clientPageId },
      _max: { sortOrder: true },
    });

    const newSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const pageVideo = await prisma.clientPageVideo.create({
      data: {
        clientPageId,
        videoId,
        sortOrder: newSortOrder,
      },
      include: { video: true },
    });

    return NextResponse.json(pageVideo);
  } catch (error) {
    console.error("POST /api/client-pages/[id]/videos error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: clientPageId } = await params;
    const url = new URL(request.url);
    const videoId = url.searchParams.get("videoId");

    if (!videoId) return NextResponse.json({ error: "Missing videoId" }, { status: 400 });

    const page = await prisma.clientPage.findUnique({ where: { id: clientPageId } });
    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.clientPageVideo.delete({
      where: {
        clientPageId_videoId: {
          clientPageId,
          videoId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/client-pages/[id]/videos error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: clientPageId } = await params;
    const { videoOrders } = await request.json() as { videoOrders: { videoId: string, sortOrder: number }[] };

    const page = await prisma.clientPage.findUnique({ where: { id: clientPageId } });
    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Prisma doesn't have a bulk update for multiple rows with different values, so we use a transaction
    const transactions = videoOrders.map((vo) => 
      prisma.clientPageVideo.update({
        where: {
          clientPageId_videoId: {
            clientPageId,
            videoId: vo.videoId,
          }
        },
        data: { sortOrder: vo.sortOrder }
      })
    );

    await prisma.$transaction(transactions);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/client-pages/[id]/videos error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
