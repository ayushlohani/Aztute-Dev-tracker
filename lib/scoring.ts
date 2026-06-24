import type { EnrichedProject, Project } from "./types";

const priorityScore = { Urgent: 40, High: 30, Medium: 15, Low: 5 };
const ragScore = { Red: 40, Yellow: 20, Watch: 10, Green: 0 };
const helpScore: Record<string, number> = {
  Leadership: 25,
  CTO: 25,
  "Dev Leadership": 25,
  Client: 20,
  Vendor: 20,
  Product: 15,
  CS: 10,
  None: 0,
  "Shobhit sir": 20,
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function nowISO() {
  return new Date().toISOString();
}

export function uid(prefix = "p") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function daysBetween(date: string) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const value = new Date(`${date}T00:00:00`);
  if (Number.isNaN(value.getTime())) return null;
  return Math.floor((today.getTime() - value.getTime()) / 86400000);
}

export function daysSlipped(project: Project) {
  const days = daysBetween(project.targetDate);
  return days && days > 0 ? days : 0;
}

export function dueNext7(project: Project) {
  if (!project.targetDate) return false;
  const delta = daysBetween(project.targetDate);
  return delta !== null && delta <= 0 && delta >= -7;
}

export function attentionScore(project: Project) {
  let score =
    (priorityScore[project.priority] || 0) +
    (ragScore[project.rag] || 0) +
    (project.blocker ? 30 : 0) +
    (helpScore[project.helpNeeded] || 0);

  const slip = daysSlipped(project);
  if (!project.targetDate) {
    score += 10;
  } else if (slip > 0) {
    const weight = { Urgent: 2, High: 1.5, Medium: 1, Low: 0.5 }[project.priority] || 1;
    score += 30 + Math.min(60, Math.floor(slip / 7) * 5 * weight);
  } else {
    const delta = daysBetween(project.targetDate);
    if (delta === 0 || delta === -1) score += 25;
    else if (delta !== null && delta >= -7) score += 15;
  }

  if (!project.lastUpdated) score += 15;
  return Math.round(score);
}

export function attentionLevel(score: number): EnrichedProject["attentionLevel"] {
  if (score >= 100) return "Critical";
  if (score >= 70) return "High Attention";
  if (score >= 40) return "Watch Closely";
  return "Normal";
}

export function enrichProject(project: Project): EnrichedProject {
  const score = attentionScore(project);
  return {
    ...project,
    attentionScore: score,
    attentionLevel: attentionLevel(score),
    daysSlipped: daysSlipped(project),
    dueNext7: dueNext7(project),
  };
}

export function fieldLabel(key: string) {
  return (
    {
      projectNumber: "Project #",
      name: "Project / Workstream",
      projectClass: "Project Class",
      clientCode: "Client Code",
      workBy: "Who Is Doing Work",
      externalResources: "External Resources",
      category: "Category",
      priority: "Priority",
      size: "Size",
      rag: "RAG",
      blocker: "Blocker?",
      helpNeeded: "Help Needed From",
      owner: "Owner",
      targetDate: "Target Date",
      lastUpdated: "Last Updated",
      deliverable: "Current Deliverable / Milestone",
      bottleneck: "Bottleneck / Issue",
      nextAction: "Next Action",
    }[key] || key
  );
}
