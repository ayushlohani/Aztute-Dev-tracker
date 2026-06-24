import { createProject, listProjects } from "@/lib/repository";
import { normalizeProject } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await listProjects());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load projects." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const project = normalizeProject(await request.json());
    return Response.json(await createProject(project), { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to create project." },
      { status: 400 },
    );
  }
}
