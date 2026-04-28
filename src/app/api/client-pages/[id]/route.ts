import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import * as z from "zod";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

const updateClientPageSchema = z.object({
  clientName: z.string().nullable().optional(),
  clientEmail: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const page = await prisma.clientPage.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { sortOrder: "asc" },
          include: { video: true },
        },
      },
    });

    if (!page || page.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("GET /api/client-pages/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = updateClientPageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const existing = await prisma.clientPage.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.clientPage.update({
      where: { id },
      data: {
        clientName:
          parsed.data.clientName !== undefined
            ? parsed.data.clientName
            : existing.clientName,
        clientEmail:
          parsed.data.clientEmail !== undefined
            ? parsed.data.clientEmail
            : existing.clientEmail,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/client-pages/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.clientPage.findUnique({ where: { id } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.clientPage.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/client-pages/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
