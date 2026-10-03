import { auth } from "@/auth";
import { getDevBypassUserId } from "@/lib/auth/dev-user";

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  if (process.env.AUTH_BYPASS === "true") {
    return getDevBypassUserId();
  }

  return null;
}

export async function requireSessionUserId(): Promise<string | null> {
  const userId = await getSessionUserId();
  if (userId) {
    return userId;
  }
  if (process.env.AUTH_BYPASS === "true") {
    return null;
  }
  return null;
}
