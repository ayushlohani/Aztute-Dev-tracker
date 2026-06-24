import {
  ACTION_STATUSES,
  HELP_NEEDED,
  PRIORITIES,
  PROJECT_CLASSES,
  RAGS,
  SIZES,
  WORK_SOURCES,
} from "./constants";
import { nowISO, todayISO, uid } from "./scoring";
import type { Project } from "./types";

const projectFields = [
  "id",
  "projectNumber",
  "name",
  "projectClass",
  "clientCode",
  "workBy",
  "externalResources",
  "category",
  "priority",
  "size",
  "rag",
  "blocker",
  "helpNeeded",
  "owner",
  "targetDate",
  "lastUpdated",
  "deliverable",
  "bottleneck",
  "nextAction",
  "actions",
  "history",
] as const;

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function pickOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function normalizeProject(input: unknown): Project {
  const raw = typeof input === "object" && input ? (input as Record<string, unknown>) : {};

  const project: Project = {
    id: asString(raw.id, uid()),
    projectNumber: asString(raw.projectNumber, "N/A").trim() || "N/A",
    name: asString(raw.name, "New Project").trim() || "New Project",
    projectClass: pickOption(raw.projectClass, PROJECT_CLASSES, "Platform Project"),
    clientCode: asString(raw.clientCode, "N/A").trim() || "N/A",
    workBy: pickOption(raw.workBy, WORK_SOURCES, "Internal [Aztute]"),
    externalResources: asString(raw.externalResources),
    category: asString(raw.category, "N/A"),
    priority: pickOption(raw.priority, PRIORITIES, "Medium"),
    size: pickOption(raw.size, SIZES, "N/A"),
    rag: pickOption(raw.rag, RAGS, "Watch"),
    blocker: Boolean(raw.blocker),
    helpNeeded: pickOption(raw.helpNeeded, HELP_NEEDED, "None"),
    owner: asString(raw.owner, "N/A").trim() || "N/A",
    targetDate: asString(raw.targetDate),
    lastUpdated: asString(raw.lastUpdated, todayISO()),
    deliverable: asString(raw.deliverable),
    bottleneck: asString(raw.bottleneck),
    nextAction: asString(raw.nextAction),
    actions: Array.isArray(raw.actions)
      ? raw.actions.map((item) => {
          const action = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
          return {
            id: asString(action.id, uid("a")),
            text: asString(action.text).trim(),
            owner: asString(action.owner, "N/A").trim() || "N/A",
            dueDate: asString(action.dueDate),
            status: pickOption(action.status, ACTION_STATUSES, "Open"),
            createdAt: asString(action.createdAt, nowISO()),
            updatedAt: asString(action.updatedAt, nowISO()),
          };
        })
      : [],
    history: Array.isArray(raw.history)
      ? raw.history.map((item) => {
          const history = typeof item === "object" && item ? (item as Record<string, unknown>) : {};
          return {
            at: asString(history.at, nowISO()),
            author: asString(history.author, "System"),
            type: asString(history.type, "Status Update") as Project["history"][number]["type"],
            field: asString(history.field),
            oldValue: asString(history.oldValue),
            newValue: asString(history.newValue),
            note: asString(history.note),
          };
        })
      : [],
  };

  for (const field of projectFields) {
    if (!(field in project)) throw new Error(`Missing project field: ${field}`);
  }

  return project;
}

export function normalizeProjects(input: unknown): Project[] {
  const payload = typeof input === "object" && input ? (input as Record<string, unknown>) : {};
  const projects = Array.isArray(input)
    ? input
    : Array.isArray(payload.projects)
      ? payload.projects
      : null;

  if (!projects) throw new Error("Expected a projects array.");
  return projects.map(normalizeProject);
}
