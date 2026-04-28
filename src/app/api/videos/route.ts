import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";

const createVideoSchema = z.object({
  s3Key: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  durationSeconds: z.number().int().positive().optional(),
  thumbnailS3Key: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const ownerId = session.user?.id;

    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videos = await prisma.video.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        contentType: true,
        size: true,
        s3Key: true,
        durationSeconds: true,
        _count: { select: { links: true } },
      },
    });

    return NextResponse.json({ videos });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);
    const ownerId = session.user?.id;

    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createVideoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const video = await prisma.video.create({
      data: {
        ownerId,
        s3Key: parsed.data.s3Key,
        contentType: parsed.data.contentType,
        size: parsed.data.size,
        durationSeconds: parsed.data.durationSeconds,
        thumbnailS3Key: parsed.data.thumbnailS3Key ?? undefined,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ videoId: video.id, createdAt: video.createdAt });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
