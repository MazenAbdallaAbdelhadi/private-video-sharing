import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { S3 } from "@/lib/s3-client";
import { validateClientLinkAccessOrThrow, getRequestIp, getUserAgent } from "@/lib/video-links/validate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; videoId: string }> },
) {
  try {
    const { token, videoId } = await params;
    const validated = await validateClientLinkAccessOrThrow(request, token);

    // Ensure the requested video is actually on the client's page
    const pageVideo = await prisma.clientPageVideo.findUnique({
      where: {
        clientPageId_videoId: {
          clientPageId: validated.clientPageId,
          videoId: videoId,
        }
      },
      include: { video: true }
    });

    if (!pageVideo) {
      return NextResponse.json({ error: "Video not found on this page" }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: pageVideo.video.s3Key,
      ResponseContentType: pageVideo.video.contentType,
    });

    const url = await getSignedUrl(S3, command, { expiresIn: 60 });

    await prisma.clientLinkEvent.create({
      data: {
        token,
        type: "video_start",
        videoId,
        ip: getRequestIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return NextResponse.json({ url, expiresInSeconds: 60 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[PLAY_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
