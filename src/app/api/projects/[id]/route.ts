import { NextResponse } from "next/server";
import { z } from "zod";

import { requireOrgPermission } from "@/lib/org/context";
import { archiveProject, getProject, updateProject } from "@/lib/db/projects";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  phase: z.string().min(1).optional(),
  engagementModel: z.string().min(1).optional(),
  currency: z.string().optional(),
  contractValue: z.number().optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const { id } = await context.params;
  const project = await getProject(gated.ctx.organizationId, id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const gated = await requireOrgPermission("project.update");
  if ("response" in gated) {
    return gated.response;
  }

  const { id } = await context.params;

  try {
    const body = updateProjectSchema.parse(await request.json());
    const project = await updateProject(gated.ctx.organizationId, id, body);
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Update project failed:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gated = await requireOrgPermission("project.archive");
  if ("response" in gated) {
    return gated.response;
  }

  const { id } = await context.params;

  try {
    await archiveProject(gated.ctx.organizationId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Project not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Archive project failed:", error);
    return NextResponse.json({ error: "Failed to archive project" }, { status: 500 });
  }
}
