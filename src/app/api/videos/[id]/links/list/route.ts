import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession(request);
    const ownerId = session.user?.id;

    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: videoId } = await params;

    const video = await prisma.video.findFirst({
      where: { id: videoId, ownerId },
      select: { id: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const links = await prisma.videoLink.findMany({
      where: { videoId, ownerId },
      orderBy: { createdAt: "desc" },
      select: {
        token: true,
        createdAt: true,
        expiresAt: true,
        status: true,
        revokedAt: true,
        lockedIp: true,
        consumed: true,
        _count: { select: { events: true } },
      },
    });

    return NextResponse.json({ links });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

