import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { S3 } from "@/lib/s3-client";
import { validateVideoLinkAccessOrThrow, getRequestIp, getUserAgent } from "@/lib/video-links/validate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const validated = await validateVideoLinkAccessOrThrow(request, token);

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: validated.s3Key,
      ResponseContentType: validated.contentType,
    });

    const url = await getSignedUrl(S3, command, { expiresIn: 60 });

    await prisma.videoLinkEvent.create({
      data: {
        token,
        type: "play",
        ip: getRequestIp(request),
        userAgent: getUserAgent(request),
      },
    });

    return NextResponse.json({ url, expiresInSeconds: 60 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

