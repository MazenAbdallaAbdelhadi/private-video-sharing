import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";

const createLinkSchema = z.object({
  expiresAt: z.string().datetime(),
});

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

    const body = await request.json();
    const parsed = createLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const expiresAt = new Date(parsed.data.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 });
    }
    if (expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "expiresAt must be in the future" }, { status: 400 });
    }

    const video = await prisma.video.findFirst({
      where: { id: videoId, ownerId },
      select: { id: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const token = generateToken();

    await prisma.videoLink.create({
      data: {
        token,
        videoId,
        ownerId,
        expiresAt,
      },
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

