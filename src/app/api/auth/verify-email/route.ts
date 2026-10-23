import { NextResponse } from "next/server";

import { consumeVerificationToken } from "@/lib/email/tokens";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  const valid = await consumeVerificationToken(email, token);
  if (!valid) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(new URL("/login?verified=true", request.url));
}
