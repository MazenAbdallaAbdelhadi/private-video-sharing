import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import * as z from "zod";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "@/lib/s3-client";

const updateVideoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  thumbnailS3Key: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateVideoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { title, description, thumbnailS3Key } = parsed.data;

    const video = await prisma.video.findUnique({
      where: { id },
      select: { ownerId: true, thumbnailS3Key: true },
    });
    if (!video || video.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not found or forbidden" },
        { status: 404 },
      );
    }

    if (
      thumbnailS3Key !== undefined &&
      video.thumbnailS3Key &&
      thumbnailS3Key !== video.thumbnailS3Key
    ) {
      await S3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: video.thumbnailS3Key,
        }),
      );
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        title: title || null,
        description: description || null,
        thumbnailS3Key:
          thumbnailS3Key === undefined ? undefined : thumbnailS3Key,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/videos/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const video = await prisma.video.findUnique({
      where: { id },
      select: { ownerId: true, s3Key: true, thumbnailS3Key: true },
    });
    if (!video || video.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not found or forbidden" },
        { status: 404 },
      );
    }

    const keysToDelete = [video.s3Key, video.thumbnailS3Key].filter(
      Boolean,
    ) as string[];

    for (const key of keysToDelete) {
      await S3.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: key,
        }),
      );
    }

    // Delete from DB
    await prisma.video.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/videos/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
