import { prisma } from "@/lib/prisma";

const DEV_BYPASS_EMAIL = "dev-bypass@deliverypulse.local";

let cachedDevUserId: string | null = null;

/** Stable dev user for AUTH_BYPASS=true — API routes can persist data without OAuth. */
export async function getDevBypassUserId(): Promise<string> {
  if (cachedDevUserId) {
    return cachedDevUserId;
  }

  const user = await prisma.user.upsert({
    where: { email: DEV_BYPASS_EMAIL },
    update: {},
    create: {
      email: DEV_BYPASS_EMAIL,
      name: "Dev User",
    },
  });

  cachedDevUserId = user.id;
  return user.id;
}
