import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pages = await prisma.clientPage.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { videos: true, links: true } },
      },
    });

    return NextResponse.json(pages);
  } catch (error) {
    console.error("GET /api/client-pages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const newPage = await prisma.clientPage.create({
      data: {
        ownerId: session.user.id,
        heroTitle: body.heroTitle || "Your Videos",
        clientName: body.clientName || null,
        clientEmail: body.clientEmail || null,
        isPublished: true,
      },
    });

    return NextResponse.json(newPage);
  } catch (error) {
    console.error("POST /api/client-pages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
