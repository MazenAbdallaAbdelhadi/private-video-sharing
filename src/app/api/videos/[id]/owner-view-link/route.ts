import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";

function generateToken() {
  return randomBytes(32).toString("base64url");
}

export async function POST(
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

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h owner view link

    await prisma.videoLink.create({
      data: { token, videoId, ownerId, expiresAt },
      select: { token: true },
    });

    const origin = request.nextUrl.origin;
    const shareUrl = `${origin}/v/${token}`;
    return NextResponse.json({ token, shareUrl, expiresAt });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

