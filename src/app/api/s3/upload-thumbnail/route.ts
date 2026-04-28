import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { nanoid } from "nanoid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { S3 } from "@/lib/s3-client";
import { requireSession } from "@/lib/auth/require-session";

const uploadThumbnailSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    await requireSession(request);
    const body = await request.json();
    const validation = uploadThumbnailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { fileName, contentType, size } = validation.data;

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Thumbnail must be an image file" },
        { status: 400 },
      );
    }

    if (size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Thumbnail must be 5MB or smaller" },
        { status: 400 },
      );
    }

    const uniqueKey = `${nanoid()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: uniqueKey,
      ContentType: contentType,
      ContentLength: size,
    });

    const presignedURL = await getSignedUrl(S3, command, {
      expiresIn: 60 * 10,
    });

    return NextResponse.json({
      presignedURL,
      key: uniqueKey,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
