import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3 } from "@/lib/s3-client";

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
    const { title, description } = body;

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not found or forbidden" },
        { status: 404 },
      );
    }

    const updated = await prisma.video.update({
      where: { id },
      data: {
        title: title || null,
        description: description || null,
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

    const video = await prisma.video.findUnique({ where: { id } });
    if (!video || video.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not found or forbidden" },
        { status: 404 },
      );
    }

    // Delete from S3
    await S3.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: video.s3Key,
      }),
    );

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
