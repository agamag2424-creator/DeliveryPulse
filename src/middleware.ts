import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";

const { auth } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});

export default auth((req) => {
  if (process.env.AUTH_BYPASS === "true") {
    return;
  }

  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const requiresVerification = req.auth?.user?.requiresEmailVerification;

  if (
    requiresVerification &&
    !pathname.startsWith("/verify-email") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api/auth")
  ) {
    const email = req.auth?.user?.email;
    return NextResponse.redirect(new URL(`/verify-email${email ? `?email=${encodeURIComponent(email)}` : ""}`, req.url));
  }

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/input") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/settings");

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|$).*)"],
};
