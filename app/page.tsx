import { listProjects } from "@/lib/repository";
import TrackerClient from "./tracker-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialData = await listProjects();
  return <TrackerClient initialData={initialData} />;
}
