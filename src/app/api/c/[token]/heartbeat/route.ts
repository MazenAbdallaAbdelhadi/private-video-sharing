import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import prisma from "@/lib/prisma";
import { validateClientLinkAccessOrThrow, getRequestIp, getUserAgent } from "@/lib/video-links/validate";

const heartbeatSchema = z.object({
  videoId: z.string(),
  currentTime: z.number(),
  duration: z.number(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json().catch(() => null);
    const parsed = heartbeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await validateClientLinkAccessOrThrow(request, token);

    await prisma.clientLinkEvent.create({
      data: {
        token,
        type: "heartbeat",
        videoId: parsed.data.videoId,
        ip: getRequestIp(request),
        userAgent: getUserAgent(request),
        details: {
          currentTime: parsed.data.currentTime,
          duration: parsed.data.duration,
        }
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[HEARTBEAT_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
