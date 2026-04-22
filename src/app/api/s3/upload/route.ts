import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";
import { nanoid } from "nanoid";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { S3 } from "@/lib/s3-client";

const uploadSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  size: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = uploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { contentType, fileName, size } = validation.data;

    const uniqueKey = `${nanoid()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: uniqueKey,
      ContentType: contentType,
      ContentLength: size,
    });

    const presignedURL = await getSignedUrl(S3, command, {
      expiresIn: 60 * 10, // 10 min
    });

    const response = {
      presignedURL,
      key: uniqueKey,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Internal Sever Error" },
      { status: 500 },
    );
  }
}
