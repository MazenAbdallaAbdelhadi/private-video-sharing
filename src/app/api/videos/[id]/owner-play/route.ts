import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { S3 } from "@/lib/s3-client";
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
      select: { s3Key: true, contentType: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: video.s3Key,
      ResponseContentType: video.contentType,
    });

    const url = await getSignedUrl(S3, command, { expiresIn: 60 });
    return NextResponse.json({ url, expiresInSeconds: 60 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

