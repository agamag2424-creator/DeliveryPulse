import { NextResponse } from "next/server";
import { z } from "zod";

import { requireOrgPermission } from "@/lib/org/context";
import { createProject, getProjects } from "@/lib/db/projects";

const createProjectSchema = z.object({
  name: z.string().min(1),
  clientName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  phase: z.string().min(1),
  engagementModel: z.string().min(1),
  currency: z.string().optional(),
  contractValue: z.number().optional(),
});

export async function GET() {
  const gated = await requireOrgPermission("project.view");
  if ("response" in gated) {
    return gated.response;
  }

  const projects = await getProjects(gated.ctx.organizationId);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const gated = await requireOrgPermission("project.create");
  if ("response" in gated) {
    return gated.response;
  }

  try {
    const body = createProjectSchema.parse(await request.json());
    const project = await createProject(gated.ctx.organizationId, gated.ctx.userId, body);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
    }
    console.error("Create project failed:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
