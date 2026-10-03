import { NextResponse } from "next/server";
import { z } from "zod";

import { finishOAuthCodeCallback, finishTrelloTokenCallback } from "@/lib/connectors/finish-oauth";
import { parseManagedConnectorType } from "@/lib/connectors/route-type";

export async function GET(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const { type: slug } = await context.params;
  const type = parseManagedConnectorType(slug);
  if (type !== "ASANA" && type !== "MONDAY") {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }
  return finishOAuthCodeCallback(request, type);
}

const trelloSchema = z.object({
  token: z.string().min(1),
  state: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ type: string }> },
) {
  const { type: slug } = await context.params;
  const type = parseManagedConnectorType(slug);
  if (type !== "TRELLO") {
    return NextResponse.json({ error: "Unknown connector" }, { status: 404 });
  }

  try {
    const body = trelloSchema.parse(await request.json());
    return finishTrelloTokenCallback(request, body.token, body.state);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
