import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import {
  validateVideoLinkAccessOrThrow,
  getRequestIp,
  getUserAgent,
} from "@/lib/video-links/validate";

const revokeSchema = z.object({
  reason: z.enum(["devtools_detected"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json().catch(() => null);
    const parsed = revokeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Ensure the caller is the active viewer session/IP. Any mismatch will revoke anyway.
    await validateVideoLinkAccessOrThrow(request, token);

    const existing = await prisma.videoLink.findUnique({
      where: { token },
      select: { status: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (existing.status !== "revoked") {
      await prisma.$transaction([
        prisma.videoLink.update({
          where: { token },
          data: { status: "revoked", revokedAt: new Date(), consumed: true },
        }),
        prisma.videoLinkEvent.create({
          data: {
            token,
            type: parsed.data.reason,
            ip: getRequestIp(request),
            userAgent: getUserAgent(request),
          },
        }),
      ]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
