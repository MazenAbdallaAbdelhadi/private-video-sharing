import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const links = await prisma.clientLink.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        clientPage: { select: { clientName: true, heroTitle: true } },
        _count: { select: { events: true } }
      }
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("GET /api/client-links error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { clientPageId, expiresInDays, maxSessions, clientName, clientEmail } = body;

    if (!clientPageId || !expiresInDays) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const page = await prisma.clientPage.findUnique({ where: { id: clientPageId } });
    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const link = await prisma.clientLink.create({
      data: {
        token,
        clientPageId,
        ownerId: session.user.id,
        expiresAt,
        maxSessions: maxSessions || 1,
        clientName: clientName || page.clientName,
        clientEmail: clientEmail || page.clientEmail,
        status: "active",
      }
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error("POST /api/client-links error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
