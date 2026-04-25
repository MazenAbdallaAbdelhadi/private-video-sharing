import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { requireSession } from "@/lib/auth/require-session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await requireSession(request);
    const ownerId = session.user?.id;

    if (!ownerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    const link = await prisma.videoLink.findFirst({
      where: { token, ownerId },
      select: { token: true },
    });

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const events = await prisma.videoLinkEvent.findMany({
      where: { token },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        createdAt: true,
        type: true,
        ip: true,
        userAgent: true,
        details: true,
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

