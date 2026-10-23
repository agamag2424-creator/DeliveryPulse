import { NextResponse } from "next/server";

import { isGitHubAuthConfigured, isGoogleAuthConfigured } from "@/auth.config";

export async function GET() {
  return NextResponse.json({
    google: isGoogleAuthConfigured(),
    github: isGitHubAuthConfigured(),
    database: !!process.env.DATABASE_URL,
  });
}
