import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/email/tokens";
import { prisma } from "@/lib/prisma";

const schema = z.object({ email: z.string().email().optional() });

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  let email: string | undefined;

  try {
    const body = schema.parse(await request.json().catch(() => ({})));
    email = body.email?.trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    email = user?.email;
  }

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return NextResponse.json({ success: true, message: "OAuth accounts do not require email verification." });
  }

  if (user.emailVerified) {
    return NextResponse.json({ success: true, message: "Email already verified." });
  }

  await sendVerificationEmail(email, user.name);
  return NextResponse.json({ success: true, message: "Verification email sent." });
}
