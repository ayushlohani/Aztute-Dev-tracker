import { replaceProjects } from "@/lib/repository";
import { normalizeProjects } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const projects = normalizeProjects(await request.json());
    return Response.json(await replaceProjects(projects));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to import projects." },
      { status: 400 },
    );
  }
}
