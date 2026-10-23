import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

function isValidOAuthCredential(value: string | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  if (value.startsWith("your-")) {
    return false;
  }
  return true;
}

function buildOAuthProviders(): Provider[] {
  const providers: Provider[] = [];

  if (isValidOAuthCredential(process.env.GOOGLE_CLIENT_ID) && isValidOAuthCredential(process.env.GOOGLE_CLIENT_SECRET)) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      }),
    );
  }

  if (isValidOAuthCredential(process.env.GITHUB_CLIENT_ID) && isValidOAuthCredential(process.env.GITHUB_CLIENT_SECRET)) {
    providers.push(
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID!.trim(),
        clientSecret: process.env.GITHUB_CLIENT_SECRET!.trim(),
      }),
    );
  }

  return providers;
}

export default {
  providers: buildOAuthProviders(),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
        session.user.image = token.picture ?? session.user.image;
        session.user.requiresEmailVerification = Boolean(token.requiresEmailVerification);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export function isGoogleAuthConfigured(): boolean {
  return (
    isValidOAuthCredential(process.env.GOOGLE_CLIENT_ID) &&
    isValidOAuthCredential(process.env.GOOGLE_CLIENT_SECRET)
  );
}

export function isGitHubAuthConfigured(): boolean {
  return (
    isValidOAuthCredential(process.env.GITHUB_CLIENT_ID) &&
    isValidOAuthCredential(process.env.GITHUB_CLIENT_SECRET)
  );
}
