import { randomBytes } from "crypto";

import { sendEmail } from "@/lib/email/resend";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function appUrl(): string {
  return process.env.NEXTAUTH_URL?.trim() || "http://localhost:3001";
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  return token;
}

export async function sendVerificationEmail(email: string, name?: string | null): Promise<boolean> {
  const token = await createVerificationToken(email);
  const link = `${appUrl()}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  return sendEmail({
    to: email,
    subject: "Verify your DeliveryPulse account",
    html: `<p>Hi ${name ?? "there"},</p><p><a href="${link}">Verify your email</a> to access DeliveryPulse.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string): Promise<boolean> {
  const token = await createVerificationToken(`reset:${email}`);
  const link = `${appUrl()}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  return sendEmail({
    to: email,
    subject: "Reset your DeliveryPulse password",
    html: `<p><a href="${link}">Reset your password</a>. This link expires in 24 hours.</p>`,
  });
}

export async function sendInviteEmail(
  email: string,
  organizationName: string,
  token: string,
): Promise<boolean> {
  const link = `${appUrl()}/invite/${token}`;
  return sendEmail({
    to: email,
    subject: `You're invited to ${organizationName} on DeliveryPulse`,
    html: `<p>You've been invited to join <strong>${organizationName}</strong> on DeliveryPulse.</p><p><a href="${link}">Accept invitation</a>. This link expires in 7 days.</p>`,
  });
}

export async function consumeVerificationToken(identifier: string, token: string): Promise<boolean> {
  const record = await prisma.verificationToken.findFirst({
    where: { identifier, token },
  });

  if (!record || record.expires < new Date()) {
    return false;
  }

  await prisma.verificationToken.delete({ where: { token: record.token } });
  return true;
}
