import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { validateClientLinkAccessOrThrow } from "@/lib/video-links/validate";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const validated = await validateClientLinkAccessOrThrow(request, token);

    const clientPage = await prisma.clientPage.findUnique({
      where: { id: validated.clientPageId },
      include: {
        videos: {
          orderBy: { sortOrder: 'asc' },
          include: {
            video: {
              select: {
                id: true,
                title: true,
                description: true,
                thumbnailS3Key: true,
                durationSeconds: true,
              }
            }
          }
        }
      }
    });

    if (!clientPage || !clientPage.isPublished) {
      return NextResponse.json({ error: "Page not available" }, { status: 404 });
    }

    const res = NextResponse.json({
      page: {
        heroTitle: clientPage.heroTitle,
        heroSubtitle: clientPage.heroSubtitle,
        heroBackgroundS3Key: clientPage.heroBackgroundS3Key,
        aboutText: clientPage.aboutText,
        brandLogoS3Key: clientPage.brandLogoS3Key,
        accentColor: clientPage.accentColor,
        showEditorName: clientPage.showEditorName,
        brandName: validated.brandName,
        clientName: validated.clientName,
        clientEmail: validated.clientEmail,
      },
      videos: clientPage.videos.map(v => v.video),
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
        // Must be sent to /api/c/* as well
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // server-side expiry is authoritative
      });
    }

    return res;
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[INIT_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
