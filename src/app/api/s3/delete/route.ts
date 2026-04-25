import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { S3 } from "@/lib/s3-client";
import { requireSession } from "@/lib/auth/require-session";

export async function DELETE(request: NextRequest) {
  try {
    await requireSession(request);
    const body = await request.json();

    const key = body.key;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
    });

    await S3.send(command);

    return NextResponse.json(
      { message: "File deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Failed to delete file." },
      { status: 500 },
    );
  }
}
