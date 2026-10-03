import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendVerificationEmail } from "@/lib/email/tokens";
import { hashPassword } from "@/lib/auth/password";
import { provisionOrganizationForUser } from "@/lib/org/provision";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

function databaseErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database is not connected. Run npx prisma dev -d and set DATABASE_URL in .env.local.";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "ECONNREFUSED") {
    return "Database connection refused. Start the database with npx prisma dev -d.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name?.trim() || email.split("@")[0],
        passwordHash,
      },
    });

    await provisionOrganizationForUser(user);

    void sendVerificationEmail(email, user.name).catch(console.error);

    return NextResponse.json({ id: user.id, email: user.email, requiresVerification: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid registration details." }, { status: 400 });
    }

    const dbMessage = databaseErrorMessage(error);
    if (dbMessage) {
      return NextResponse.json({ error: dbMessage }, { status: 503 });
    }

    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
