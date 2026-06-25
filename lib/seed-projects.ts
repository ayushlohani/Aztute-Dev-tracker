import type { Project } from "./types";

const imported = {
  at: "2026-06-15T11:34:30",
  author: "System",
  type: "Imported" as const,
  field: "",
  oldValue: "",
  newValue: "",
  note: "Seed project loaded from PM tracker / ARLM list.",
};

export const seedProjects: Project[] = [];
