import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await params;
    const body = await request.json();

    const existing = await prisma.clientLink.findUnique({ where: { token } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.status === "revoked" && existing.status !== "revoked") {
      updateData.status = "revoked";
      updateData.revokedAt = new Date();
      updateData.consumed = true;
    }

    const updated = await prisma.clientLink.update({
      where: { token },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/client-links/[token] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await params;
    
    const existing = await prisma.clientLink.findUnique({ where: { token } });
    if (!existing || existing.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.clientLink.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/client-links/[token] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
