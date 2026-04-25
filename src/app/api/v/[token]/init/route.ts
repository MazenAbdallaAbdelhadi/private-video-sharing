import { NextRequest, NextResponse } from "next/server";

import {
  validateVideoLinkAccessOrThrow,
} from "@/lib/video-links/validate";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const validated = await validateVideoLinkAccessOrThrow(request, token);

    const res = NextResponse.json({
      videoId: validated.videoId,
      expiresAt: validated.expiresAt,
    });

    const existing = request.cookies.get(validated.sessionCookieName)?.value ?? null;
    if (existing !== validated.sessionId) {
      res.cookies.set({
        name: validated.sessionCookieName,
        value: validated.sessionId,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        // Must be sent to /api/v/* as well, otherwise server sees session_mismatch.
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // server-side expiry is authoritative
      });
    }

    return res;
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

