import { deleteProject, updateProject } from "@/lib/repository";
import { normalizeProject } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: RouteContext<"/api/projects/[id]">) {
  try {
    const { id } = await context.params;
    const project = normalizeProject({ ...(await request.json()), id });
    return Response.json(await updateProject(id, project));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project.";
    return Response.json({ error: message }, { status: message === "Project not found" ? 404 : 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext<"/api/projects/[id]">) {
  try {
    const { id } = await context.params;
    return Response.json(await deleteProject(id));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete project." },
      { status: 500 },
    );
  }
}
