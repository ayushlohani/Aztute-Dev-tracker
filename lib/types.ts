export type ProjectClass = "Platform Project" | "Client Project";
export type WorkBy = "Internal [Aztute]" | "External [Partner]" | "Hybrid";
export type Priority = "Urgent" | "High" | "Medium" | "Low";
export type Size = "XS" | "S" | "M" | "L" | "XL" | "N/A";
export type Rag = "Red" | "Yellow" | "Green" | "Watch";
export type HelpNeeded =
  | "Leadership"
  | "CTO"
  | "Dev Leadership"
  | "Client"
  | "Vendor"
  | "Product"
  | "CS"
  | "None"
  | "Shobhit sir";

export type ActionStatus = "Open" | "In Progress" | "Done" | "Deferred";
export type HistoryType =
  | "Imported"
  | "Status Update"
  | "Decision"
  | "Commitment"
  | "Blocker"
  | "Risk"
  | "Client/Vendor Follow-up"
  | "Field Change";

export type ProjectAction = {
  id: string;
  text: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProjectHistory = {
  at: string;
  author: string;
  type: HistoryType;
  field: string;
  oldValue: string;
  newValue: string;
  note: string;
};

export type Project = {
  id: string;
  projectNumber: string;
  name: string;
  projectClass: ProjectClass;
  clientCode: string;
  workBy: WorkBy;
  externalResources: string;
  category: string;
  priority: Priority;
  size: Size;
  rag: Rag;
  blocker: boolean;
  helpNeeded: HelpNeeded;
  owner: string;
  targetDate: string;
  lastUpdated: string;
  deliverable: string;
  bottleneck: string;
  nextAction: string;
  actions: ProjectAction[];
  history: ProjectHistory[];
};

export type EnrichedProject = Project & {
  attentionScore: number;
  attentionLevel: "Critical" | "High Attention" | "Watch Closely" | "Normal";
  daysSlipped: number;
  dueNext7: boolean;
};

export type TrackerPayload = {
  projects: Project[];
  persistence: "mongodb" | "memory";
};
