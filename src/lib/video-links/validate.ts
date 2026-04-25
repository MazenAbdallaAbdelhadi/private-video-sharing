import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export type VideoLinkValidationResult = {
  token: string;
  videoId: string;
  expiresAt: Date;
  status: "active" | "expired" | "revoked";
  sessionCookieName: string;
  sessionId: string;
  lockedIp: string;
  s3Key: string;
  contentType: string;
};

export type ClientLinkValidationResult = {
  token: string;
  clientPageId: string;
  expiresAt: Date;
  status: "active" | "expired" | "revoked";
  sessionCookieName: string;
  sessionId: string;
  lockedIp: string;
  clientName: string | null;
  clientEmail: string | null;
  brandName: string | null;
};

export function getRequestIp(request: NextRequest) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  const xrip = request.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return null;
}

export function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent");
}

export function getViewerSessionCookieName(token: string) {
  const digest = createHash("sha256").update(token).digest("hex").slice(0, 16);
  return `v_session_${digest}`;
}

export function generateViewerSessionId() {
  return randomBytes(32).toString("base64url");
}

// ==========================================
// VideoLink Methods (Legacy/V1)
// ==========================================

async function markExpired(token: string, request: NextRequest) {
  await prisma.$transaction([
    prisma.videoLink.update({
      where: { token },
      data: { status: "expired", consumed: true },
    }),
    prisma.videoLinkEvent.create({
      data: {
        token,
        type: "expired",
        ip: getRequestIp(request),
        userAgent: getUserAgent(request),
      },
    }),
  ]);
}

async function revoke(token: string, type: Parameters<typeof prisma.videoLinkEvent.create>[0]["data"]["type"], request: NextRequest) {
  await prisma.$transaction([
    prisma.videoLink.update({
      where: { token },
      data: { status: "revoked", revokedAt: new Date(), consumed: true },
    }),
    prisma.videoLinkEvent.create({
      data: {
        token,
        type,
        ip: getRequestIp(request),
        userAgent: getUserAgent(request),
      },
    }),
  ]);
}

export async function validateVideoLinkAccessOrThrow(
  request: NextRequest,
  token: string,
): Promise<VideoLinkValidationResult> {
  const requestIp = getRequestIp(request);
  if (!requestIp) {
    throw NextResponse.json({ error: "Unable to determine IP" }, { status: 400 });
  }

  const link = await prisma.videoLink.findUnique({
    where: { token },
    include: { video: true },
  });

  if (!link) {
    throw NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (link.status === "revoked") {
    throw NextResponse.json({ error: "Link revoked" }, { status: 410 });
  }

  if (Date.now() > link.expiresAt.getTime()) {
    if (link.status !== "expired") {
      await markExpired(token, request);
    }
    throw NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  if (link.status === "expired") {
    throw NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const sessionCookieName = getViewerSessionCookieName(token);
  const cookieSessionId = request.cookies.get(sessionCookieName)?.value ?? null;

  // First access: lock IP + mint viewer session
  if (!link.lockedIp || !link.sessionId) {
    if (link.lockedIp && link.lockedIp !== requestIp) {
      await revoke(token, "ip_mismatch", request);
      throw NextResponse.json({ error: "Link revoked" }, { status: 410 });
    }

    const sessionId = generateViewerSessionId();

    const updated = await prisma.videoLink.update({
      where: { token },
      data: {
        lockedIp: link.lockedIp ?? requestIp,
        sessionId,
      },
      include: { video: true },
    });

    await prisma.videoLinkEvent.create({
      data: {
        token,
        type: link.lockedIp ? "init" : "first_access",
        ip: requestIp,
        userAgent: getUserAgent(request),
      },
    });

    return {
      token,
      videoId: updated.videoId,
      expiresAt: updated.expiresAt,
      status: updated.status,
      sessionCookieName,
      sessionId,
      lockedIp: updated.lockedIp ?? requestIp,
      s3Key: updated.video.s3Key,
      contentType: updated.video.contentType,
    };
  }

  // Subsequent access: enforce IP + session cookie
  if (link.lockedIp !== requestIp) {
    await revoke(token, "ip_mismatch", request);
    throw NextResponse.json({ error: "Link revoked" }, { status: 410 });
  }

  if (!cookieSessionId || cookieSessionId !== link.sessionId) {
    await revoke(token, "session_mismatch", request);
    throw NextResponse.json({ error: "Link revoked" }, { status: 410 });
  }

  return {
    token,
    videoId: link.videoId,
    expiresAt: link.expiresAt,
    status: link.status,
    sessionCookieName,
    sessionId: link.sessionId,
    lockedIp: link.lockedIp,
    s3Key: link.video.s3Key,
    contentType: link.video.contentType,
  };
}

// ==========================================
// ClientLink Methods (V2)
// ==========================================

async function markClientLinkExpired(token: string, request: NextRequest) {
  await prisma.$transaction([
    prisma.clientLink.update({
      where: { token },
      data: { status: "expired", consumed: true },
    }),
    prisma.clientLinkEvent.create({
      data: {
        token,
        type: "expired",
        ip: getRequestIp(request),
        userAgent: getUserAgent(request),
      },
    }),
  ]);
}

async function revokeClientLink(token: string, type: Parameters<typeof prisma.clientLinkEvent.create>[0]["data"]["type"], request: NextRequest) {
  await prisma.$transaction([
    prisma.clientLink.update({
      where: { token },
      data: { status: "revoked", revokedAt: new Date(), consumed: true },
    }),
    prisma.clientLinkEvent.create({
      data: {
        token,
        type,
        ip: getRequestIp(request),
        userAgent: getUserAgent(request),
      },
    }),
  ]);
}

export async function validateClientLinkAccessOrThrow(
  request: NextRequest,
  token: string,
): Promise<ClientLinkValidationResult> {
  const requestIp = getRequestIp(request);
  if (!requestIp) {
    throw NextResponse.json({ error: "Unable to determine IP" }, { status: 400 });
  }

  const link = await prisma.clientLink.findUnique({
    where: { token },
    include: { owner: true },
  });

  if (!link) {
    throw NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (link.status === "revoked") {
    throw NextResponse.json({ error: "Link revoked" }, { status: 410 });
  }

  if (Date.now() > link.expiresAt.getTime()) {
    if (link.status !== "expired") {
      await markClientLinkExpired(token, request);
    }
    throw NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  if (link.status === "expired") {
    throw NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const sessionCookieName = getViewerSessionCookieName(token);
  const cookieSessionId = request.cookies.get(sessionCookieName)?.value ?? null;
  const clientFingerprint = request.headers.get("x-device-fingerprint");

  // First access: lock IP, Mint Viewer Session, and Lock Fingerprint
  if (!link.lockedIp || !link.sessionId || !link.deviceFingerprint) {
    if (link.lockedIp && link.lockedIp !== requestIp) {
      await revokeClientLink(token, "ip_mismatch", request);
      throw NextResponse.json({ error: "Link revoked" }, { status: 410 });
    }

    const sessionId = generateViewerSessionId();

    const updated = await prisma.clientLink.update({
      where: { token },
      data: {
        lockedIp: link.lockedIp ?? requestIp,
        sessionId,
        deviceFingerprint: link.deviceFingerprint ?? clientFingerprint,
      },
      include: { owner: true },
    });

    await prisma.clientLinkEvent.create({
      data: {
        token,
        type: link.lockedIp ? "init" : "first_access",
        ip: requestIp,
        userAgent: getUserAgent(request),
      },
    });

    return {
      token,
      clientPageId: updated.clientPageId,
      expiresAt: updated.expiresAt,
      status: updated.status,
      sessionCookieName,
      sessionId,
      lockedIp: updated.lockedIp ?? requestIp,
      clientName: updated.clientName,
      clientEmail: updated.clientEmail,
      brandName: updated.owner.brandName,
    };
  }

  // Subsequent access: enforce IP + session cookie + fingerprint
  if (link.lockedIp !== requestIp) {
    await revokeClientLink(token, "ip_mismatch", request);
    throw NextResponse.json({ error: "Link revoked due to IP" }, { status: 410 });
  }

  if (!cookieSessionId || cookieSessionId !== link.sessionId) {
    await revokeClientLink(token, "session_mismatch", request);
    throw NextResponse.json({ error: "Link revoked due to Session" }, { status: 410 });
  }

  // If fingerprint is provided in header, enforce it matches the locked one
  if (clientFingerprint && link.deviceFingerprint && clientFingerprint !== link.deviceFingerprint) {
    await revokeClientLink(token, "session_mismatch", request);
    throw NextResponse.json({ error: "Link revoked due to Fingerprint mismatch" }, { status: 410 });
  }

  return {
    token,
    clientPageId: link.clientPageId,
    expiresAt: link.expiresAt,
    status: link.status,
    sessionCookieName,
    sessionId: link.sessionId,
    lockedIp: link.lockedIp,
    clientName: link.clientName,
    clientEmail: link.clientEmail,
    brandName: link.owner.brandName,
  };
}
