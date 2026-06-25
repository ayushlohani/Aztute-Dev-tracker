import type {
  ActionStatus,
  HelpNeeded,
  Priority,
  ProjectClass,
  Rag,
  Size,
  WorkBy,
} from "./types";

export const PROJECT_CLASSES: ProjectClass[] = [
  "Platform Project",
  "Client Project",
];

export const WORK_SOURCES: WorkBy[] = [
  "Internal [Aztute]",
  "External [Partner]",
  "Hybrid",
];

export const PRIORITIES: Priority[] = ["Urgent", "High", "Medium", "Low"];
export const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "N/A"];
export const RAGS: Rag[] = ["Red", "Yellow", "Green", "Watch"];

export const HELP_NEEDED: HelpNeeded[] = [
  "Leadership",
  "CTO",
  "Dev Leadership",
  "Client",
  "Vendor",
  "Product",
  "CS",
  "None",
  "Shobhit sir",
];

export const PROJECT_PHASES: ProjectPhase[] = [
  "Development",
  "Bug Fix",
  "Maintenance",
  "Planning",
  "Design",
];

export const ACTION_STATUSES: ActionStatus[] = [
  "Open",
  "In Progress",
  "Done",
  "Deferred",
];

export const PRIORITY_META = {
  Urgent: {
    icon: "Flame",
    label: "Urgent",
    meaning: "Client, release, or production impacted; act now.",
  },
  High: {
    icon: "TriangleAlert",
    label: "High",
    meaning: "Important and time-sensitive; may become a blocker.",
  },
  Medium: {
    icon: "Hourglass",
    label: "Medium",
    meaning: "Important work to plan into a sprint.",
  },
  Low: {
    icon: "Circle",
    label: "Low",
    meaning: "Handle when capacity allows.",
  },
} as const;

export const SIZE_META = {
  XS: { label: "XS", meaning: "Less than 3 days." },
  S: { label: "S", meaning: "3-10 working days." },
  M: { label: "M", meaning: "2-4 weeks." },
  L: { label: "L", meaning: "1-2 months." },
  XL: { label: "XL", meaning: "More than 2 months." },
  "N/A": { label: "N/A", meaning: "Not estimated yet." },
} as const;

export const RAG_META = {
  Green: { dot: "bg-emerald-500", meaning: "On track." },
  Yellow: { dot: "bg-amber-400", meaning: "At risk or needs monitoring." },
  Red: {
    dot: "bg-rose-500",
    meaning: "Blocked, overdue, or escalation needed.",
  },
  Watch: { dot: "bg-sky-500", meaning: "Potential future risk." },
} as const;
