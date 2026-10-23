export function encodeOAuthState(payload: {
  organizationId: string;
  projectId?: string;
  nonce: string;
}): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeOAuthState(state: string): {
  organizationId: string;
  projectId?: string;
  nonce: string;
} {
  const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
    organizationId?: string;
    projectId?: string;
    nonce?: string;
  };

  if (!parsed.organizationId || !parsed.nonce) {
    throw new Error("Invalid OAuth state");
  }

  return {
    organizationId: parsed.organizationId,
    projectId: parsed.projectId,
    nonce: parsed.nonce,
  };
}
