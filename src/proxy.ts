import { NextRequest, NextResponse } from "next/server";

import {
  apiPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicRoutes,
} from "@/constants/routes";

import { getSession } from "@/lib/auth/get-session";

export async function proxy(request: NextRequest) {
  try {
    const { nextUrl } = request;
    const session = await getSession();

    const isLoggedIn = !!session;

    const isApiRoute = nextUrl.pathname.startsWith(apiPrefix);
    const isPublicRoute = publicRoutes.some(
      (route) =>
        nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"),
    );
    const isAuthRoute = authRoutes.some(
      (route) =>
        nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/"),
    );

    if (isApiRoute) {
      return NextResponse.next();
    }

    if (isAuthRoute) {
      if (isLoggedIn) {
        return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
      }
      return NextResponse.next();
    }

    if (!isLoggedIn && !isPublicRoute) {
      let callbackUrl = nextUrl.pathname;

      if (nextUrl.search) {
        callbackUrl += nextUrl.search;
      }

      const encodedCallbackUrl = encodeURIComponent(callbackUrl);

      return NextResponse.redirect(
        new URL(`/login?returnTo=${encodedCallbackUrl}`, nextUrl),
      );
    }

    return NextResponse.next();
  } catch (error) {
    console.error("[PROXY] unexpected error", error);
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    // "/(api|trpc)(.*)",
  ],
};
