import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function requireSession(
  request: NextRequest,
): Promise<NonNullable<Session>> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session;
}

