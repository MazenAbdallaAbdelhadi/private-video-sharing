import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await params;

    const link = await prisma.clientLink.findUnique({
      where: { token },
      include: {
        events: {
          orderBy: { createdAt: "desc" },
          take: 100, // limit for timeline
        },
        clientPage: {
          select: {
            clientName: true,
            heroTitle: true,
            videos: {
              include: { video: { select: { id: true, title: true, durationSeconds: true } } }
            }
          }
        }
      }
    });

    if (!link || link.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Process events to build engagement stats
    const engagement: Record<string, { totalTimeSeconds: number, plays: number }> = {};
    
    link.clientPage.videos.forEach(v => {
      engagement[v.videoId] = { totalTimeSeconds: 0, plays: 0 };
    });

    // Simple heuristic: count play events and use max currentTime from heartbeat per session
    // For a real production app, we would group by sessionId and integrate the diffs.
    // For this prototype, we'll just extract the stats from the heartbeat events
    const heartbeats = link.events.filter(e => e.type === "heartbeat" && e.videoId && e.details);
    const plays = link.events.filter(e => e.type === "video_start" && e.videoId);

    plays.forEach(p => {
      if (p.videoId && engagement[p.videoId]) {
        engagement[p.videoId].plays += 1;
      }
    });

    // Group heartbeats by videoId
    const maxTimePerVideo: Record<string, number> = {};
    heartbeats.forEach(h => {
      if (h.videoId) {
        const details = h.details as any;
        const currentTime = details.currentTime || 0;
        if (!maxTimePerVideo[h.videoId] || currentTime > maxTimePerVideo[h.videoId]) {
          maxTimePerVideo[h.videoId] = currentTime;
        }
      }
    });

    Object.keys(maxTimePerVideo).forEach(vid => {
      if (engagement[vid]) {
        engagement[vid].totalTimeSeconds = maxTimePerVideo[vid];
      }
    });

    return NextResponse.json({
      link: {
        token: link.token,
        clientName: link.clientName,
        clientEmail: link.clientEmail,
        status: link.status,
        expiresAt: link.expiresAt,
        lockedIp: link.lockedIp,
      },
      page: {
        clientName: link.clientPage.clientName,
        heroTitle: link.clientPage.heroTitle,
      },
      videos: link.clientPage.videos.map(v => v.video),
      engagement,
      events: link.events,
    });
  } catch (error) {
    console.error("GET /api/client-links/[token]/analytics error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
