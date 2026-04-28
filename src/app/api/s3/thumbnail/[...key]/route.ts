import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

import { S3 } from "@/lib/s3-client";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  try {
    await requireSession(request);

    const { key } = await params;
    const objectKey = key.join("/");

    if (!objectKey) {
      return NextResponse.json(
        { error: "Thumbnail key is required" },
        { status: 400 },
      );
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: objectKey,
    });

    const url = await getSignedUrl(S3, command, { expiresIn: 60 });
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Unable to fetch thumbnail" },
      { status: 500 },
    );
  }
}
