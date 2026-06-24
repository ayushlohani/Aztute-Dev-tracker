import { resetProjects } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return Response.json(await resetProjects());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to reset projects." },
      { status: 500 },
    );
  }
}
