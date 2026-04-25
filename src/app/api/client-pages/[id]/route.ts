import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const page = await prisma.clientPage.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { sortOrder: 'asc' },
          include: { video: true }
        }
      }
    });

    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("GET /api/client-pages/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.clientPage.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.clientPage.update({
      where: { id },
      data: {
        clientName: body.clientName !== undefined ? body.clientName : existing.clientName,
        clientEmail: body.clientEmail !== undefined ? body.clientEmail : existing.clientEmail,
        heroTitle: body.heroTitle !== undefined ? body.heroTitle : existing.heroTitle,
        heroSubtitle: body.heroSubtitle !== undefined ? body.heroSubtitle : existing.heroSubtitle,
        aboutText: body.aboutText !== undefined ? body.aboutText : existing.aboutText,
        accentColor: body.accentColor !== undefined ? body.accentColor : existing.accentColor,
        showEditorName: body.showEditorName !== undefined ? body.showEditorName : existing.showEditorName,
        isPublished: body.isPublished !== undefined ? body.isPublished : existing.isPublished,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/client-pages/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    
    const existing = await prisma.clientPage.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.clientPage.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/client-pages/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
