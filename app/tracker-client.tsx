"use client";

import {
  AlertTriangle,
  Archive,
  ArrowDownAZ,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  FileJson,
  History,
  Import,
  ListChecks,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldAlert,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  ACTION_STATUSES,
  HELP_NEEDED,
  PRIORITIES,
  PROJECT_CLASSES,
  RAGS,
  RAG_META,
  SIZES,
  SIZE_META,
  WORK_SOURCES,
} from "@/lib/constants";
import { enrichProject, fieldLabel, nowISO, todayISO, uid } from "@/lib/scoring";
import type { EnrichedProject, Project, TrackerPayload } from "@/lib/types";

type SortKey = keyof EnrichedProject;
type KpiMode = "" | "urgentHighNotGreen" | "slipped" | "dueNext7" | "blockers";

const sortableColumns: { key: SortKey; label: string }[] = [
  { key: "attentionScore", label: "Attention" },
  { key: "projectNumber", label: "Project #" },
  { key: "name", label: "Project" },
  { key: "projectClass", label: "Class" },
  { key: "clientCode", label: "Client" },
  { key: "workBy", label: "Work By" },
  { key: "priority", label: "Priority" },
  { key: "size", label: "Size" },
  { key: "rag", label: "RAG" },
  { key: "blocker", label: "Blocker" },
  { key: "daysSlipped", label: "Slipped" },
  { key: "bottleneck", label: "Bottleneck" },
  { key: "nextAction", label: "Next Action" },
  { key: "owner", label: "Owner" },
  { key: "targetDate", label: "Target" },
];

const textFields: { key: keyof Project; label: string; area?: boolean }[] = [
  { key: "projectNumber", label: "Project #" },
  { key: "name", label: "Project / Workstream" },
  { key: "clientCode", label: "Client Code" },
  { key: "externalResources", label: "External Resources" },
  { key: "category", label: "Category" },
  { key: "owner", label: "Owner" },
  { key: "deliverable", label: "Current Deliverable / Milestone", area: true },
  { key: "bottleneck", label: "Bottleneck / Issue", area: true },
  { key: "nextAction", label: "Next Action", area: true },
];

function createBlankProject(): Project {
  return {
    id: uid(),
    projectNumber: "N/A",
    name: "New Project",
    projectClass: "Platform Project",
    clientCode: "N/A",
    workBy: "Internal [Aztute]",
    externalResources: "",
    category: "N/A",
    priority: "Medium",
    size: "N/A",
    rag: "Watch",
    blocker: false,
    helpNeeded: "None",
    owner: "N/A",
    phase: "Development",
    targetDate: "",
    lastUpdated: todayISO(),
    deliverable: "",
    bottleneck: "",
    nextAction: "",
    actions: [],
    history: [
      {
        at: nowISO(),
        author: "System",
        type: "Status Update",
        field: "",
        oldValue: "",
        newValue: "",
        note: "New project added from UI.",
      },
    ],
  };
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

async function sendRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload as TrackerPayload;
}

export default function TrackerClient({ initialData }: { initialData: TrackerPayload }) {
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [persistence, setPersistence] = useState(initialData.persistence);
  const [selectedId, setSelectedId] = useState(initialData.projects[0]?.id || "");
  const [draft, setDraft] = useState<Project | null>(initialData.projects[0] || null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    projectClass: "",
    clientCode: "",
    priority: "",
    rag: "",
    workBy: "",
  });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "attentionScore",
    dir: "desc",
  });
  const [kpiMode, setKpiMode] = useState<KpiMode>("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const enriched = useMemo(() => projects.map(enrichProject), [projects]);
  const clients = useMemo(
    () => [...new Set(projects.map((project) => project.clientCode || "N/A"))].sort(),
    [projects],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = enriched.filter((project) => {
      const matchesFilters =
        (!filters.projectClass || project.projectClass === filters.projectClass) &&
        (!filters.clientCode || project.clientCode === filters.clientCode) &&
        (!filters.priority || project.priority === filters.priority) &&
        (!filters.rag || project.rag === filters.rag) &&
        (!filters.workBy || project.workBy === filters.workBy);
      const matchesSearch = !needle || JSON.stringify(project).toLowerCase().includes(needle);
      const matchesKpi =
        !kpiMode ||
        (kpiMode === "urgentHighNotGreen" &&
          ["Urgent", "High"].includes(project.priority) &&
          project.rag !== "Green") ||
        (kpiMode === "slipped" && project.daysSlipped > 0) ||
        (kpiMode === "dueNext7" && project.dueNext7) ||
        (kpiMode === "blockers" && project.blocker);
      return matchesFilters && matchesSearch && matchesKpi;
    });

    filtered.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left ?? "").localeCompare(String(right ?? ""), undefined, { numeric: true });
      return sort.dir === "asc" ? result : -result;
    });
    return filtered;
  }, [enriched, filters, kpiMode, query, sort]);

  const selected = draft || projects.find((project) => project.id === selectedId) || null;
  const selectedEnriched = selected ? enrichProject(selected) : null;

  const kpis = [
    { mode: "" as KpiMode, label: "Active Projects", value: enriched.length, icon: ListChecks },
    {
      mode: "urgentHighNotGreen" as KpiMode,
      label: "Urgent/High Not Green",
      value: enriched.filter((project) => ["Urgent", "High"].includes(project.priority) && project.rag !== "Green").length,
      icon: ShieldAlert,
      alert: true,
    },
    {
      mode: "slipped" as KpiMode,
      label: "Projects Slipped",
      value: enriched.filter((project) => project.daysSlipped > 0).length,
      icon: AlertTriangle,
      alert: true,
    },
    {
      mode: "dueNext7" as KpiMode,
      label: "Due Next 7 Days",
      value: enriched.filter((project) => project.dueNext7).length,
      icon: CalendarClock,
    },
    {
      mode: "blockers" as KpiMode,
      label: "Blockers",
      value: enriched.filter((project) => project.blocker).length,
      icon: TriangleAlert,
      alert: true,
    },
  ];

  function applyPayload(payload: TrackerPayload, nextSelectedId = selectedId) {
    setProjects(payload.projects);
    setPersistence(payload.persistence);
    const selectedProject =
      payload.projects.find((project) => project.id === nextSelectedId) || payload.projects[0] || null;
    setSelectedId(selectedProject?.id || "");
    setDraft(selectedProject);
  }

  async function run(label: string, task: () => Promise<TrackerPayload>, success: string) {
    setBusy(label);
    setToast("");
    try {
      const payload = await task();
      applyPayload(payload, selectedId);
      setToast(success);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setToast(message);
      setErrorModal(message);
    } finally {
      setBusy("");
    }
  }

  function selectProject(project: Project) {
    setSelectedId(project.id);
    setDraft(structuredClone(project));
    setIsDetailOpen(true);
  }

  async function addProject() {
    const project = createBlankProject();
    setBusy("create");
    try {
      const payload = await sendRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify(project),
      });
      applyPayload(payload, project.id);
      setIsDetailOpen(true);
      setToast("Project created.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create project.";
      setToast(message);
      setErrorModal(message);
    } finally {
      setBusy("");
    }
  }

  async function saveProject() {
    if (!draft) return;
    const original = projects.find((project) => project.id === draft.id);
    const nextProject = structuredClone(draft);
    const history = [...(nextProject.history || [])];

    if (original) {
      const excluded = ["history", "actions", "lastUpdated"];
      for (const rawKey of Object.keys(nextProject)) {
        const key = rawKey as keyof Project;
        if (excluded.includes(key)) continue;
        // Only consider canonical project fields (those with a friendly label).
        // This avoids logging derived/enriched fields such as attentionScore, daysSlipped, etc.
        if (fieldLabel(key) === key) continue;
        if (String(original[key] ?? "") !== String(nextProject[key] ?? "")) {
          history.unshift({
            at: nowISO(),
            author: nextProject.owner || "User",
            type: "Field Change",
            field: fieldLabel(key),
            oldValue: String(original[key] ?? ""),
            newValue: String(nextProject[key] ?? ""),
            note: `${fieldLabel(key)} changed.`,
          });
        }
      }
    }

    nextProject.lastUpdated = todayISO();
    nextProject.history = history;
    await run(
      "save",
      () =>
        sendRequest(`/api/projects/${nextProject.id}`, {
          method: "PUT",
          body: JSON.stringify(nextProject),
        }),
      "Changes updated successfully.",
    );
  }

  async function deleteSelected() {
    if (!draft || !window.confirm("Archive/delete this project?")) return;
    await run(
      "delete",
      () => sendRequest(`/api/projects/${draft.id}`, { method: "DELETE" }),
      "Project archived.",
    );
    setIsDetailOpen(false);
  }

  async function addAction(formData: FormData) {
    if (!draft) return;
    const text = String(formData.get("text") || "").trim();
    if (!text) return;
    const nextProject = structuredClone(draft);
    const action = {
      id: uid("a"),
      text,
      owner: String(formData.get("owner") || "N/A").trim() || "N/A",
      dueDate: String(formData.get("dueDate") || ""),
      status: String(formData.get("status") || "Open") as Project["actions"][number]["status"],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    nextProject.actions = [action, ...(nextProject.actions || [])];
    nextProject.history = [
      {
        at: nowISO(),
        author: action.owner,
        type: "Commitment",
        field: "",
        oldValue: "",
        newValue: "",
        note: `Action item: ${action.text}. Owner: ${action.owner}. Due: ${action.dueDate || "N/A"}. Status: ${action.status}.`,
      },
      ...(nextProject.history || []),
    ];
    nextProject.lastUpdated = todayISO();
    setDraft(nextProject);
    await run(
      "action",
      () =>
        sendRequest(`/api/projects/${nextProject.id}`, {
          method: "PUT",
          body: JSON.stringify(nextProject),
        }),
      "Action item added.",
    );
  }

  async function addNote(formData: FormData) {
    if (!draft) return;
    const note = String(formData.get("note") || "").trim();
    if (!note) return;
    const nextProject = structuredClone(draft);
    nextProject.history = [
      {
        at: nowISO(),
        author: String(formData.get("author") || "N/A").trim() || "N/A",
        type: String(formData.get("type") || "Status Update") as Project["history"][number]["type"],
        field: "",
        oldValue: "",
        newValue: "",
        note,
      },
      ...(nextProject.history || []),
    ];
    nextProject.lastUpdated = todayISO();
    setDraft(nextProject);
    await run(
      "note",
      () =>
        sendRequest(`/api/projects/${nextProject.id}`, {
          method: "PUT",
          body: JSON.stringify(nextProject),
        }),
      "Note added.",
    );
  }

  async function importJson(file: File) {
    const text = await file.text();
    const data = JSON.parse(text);
    await run(
      "import",
      () =>
        sendRequest("/api/projects/import", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      "Backup imported.",
    );
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ projects }, null, 2)], { type: "application/json" });
    downloadBlob(blob, `aztute-dev-tracker-backup-${todayISO()}.json`);
  }

  async function doExportExcel(scope: "all" | "filtered") {
    setIsExportDialogOpen(false);
    setBusy("excel");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const exportRows = scope === "all" ? enriched : rows;

      appendSheet(XLSX, workbook, "KPI_Summary", [
        { Metric: "Total Active Projects", Value: enriched.length },
        { Metric: "Urgent/High Priority Not Green", Value: kpis[1].value },
        { Metric: "Projects Slipped Deadline", Value: kpis[2].value },
        { Metric: "Projects Due Next 7 Days", Value: kpis[3].value },
        { Metric: "Number of Blockers", Value: kpis[4].value },
      ]);
      appendSheet(
        XLSX,
        workbook,
        "Projects",
        exportRows.map((project) => ({
          "Internal Attention Score": project.attentionScore,
          "Attention Level": project.attentionLevel,
          "Project #": project.projectNumber,
          Project: project.name,
          "Project Class": project.projectClass,
          "Client Code": project.clientCode,
          "Who Is Doing Work": project.workBy,
          "External Resources": project.externalResources,
          Category: project.category,
          Priority: project.priority,
          Size: project.size,
          RAG: project.rag,
          "Blocker?": project.blocker ? "Yes" : "No",
          "Days Slipped": project.daysSlipped,
          "Due Next 7 Days?": project.dueNext7 ? "Yes" : "No",
          "Help Needed From": project.helpNeeded,
          Owner: project.owner,
          "Target Date": project.targetDate,
          "Last Updated": project.lastUpdated,
          "Current Deliverable / Milestone": project.deliverable,
          "Bottleneck / Issue": project.bottleneck,
          "Next Action": project.nextAction,
        })),
      );
      appendSheet(
        XLSX,
        workbook,
        "ActionItems",
        projects.flatMap((project) =>
          project.actions.map((action) => ({
            "Project #": project.projectNumber,
            Project: project.name,
            "Action Item": action.text,
            Owner: action.owner,
            "Due Date": action.dueDate,
            Status: action.status,
            "Created At": action.createdAt,
            "Updated At": action.updatedAt,
          })),
        ),
      );
      appendSheet(
        XLSX,
        workbook,
        "ChangeHistory",
        projects.flatMap((project) =>
          project.history.map((entry) => ({
            "Project #": project.projectNumber,
            Project: project.name,
            Timestamp: entry.at,
            Author: entry.author,
            Type: entry.type,
            Field: entry.field,
            "Old Value": entry.oldValue,
            "New Value": entry.newValue,
            Note: entry.note,
          })),
        ),
      );
      appendSheet(
        XLSX,
        workbook,
        "LegendDefinitions",
        [
          ...PRIORITIES.map((priority) => ({ Type: "Priority", Code: priority })),
          ...RAGS.map((rag) => ({ Type: "RAG", Code: rag, Description: RAG_META[rag].meaning })),
          ...SIZES.map((size) => ({ Type: "Size", Code: size, Description: SIZE_META[size].meaning })),
        ],
      );
      XLSX.writeFile(workbook, `Dev_Project_Tracker_${todayISO()}.xlsx`);
      setToast("Excel workbook exported.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Excel export failed.");
    } finally {
      setBusy("");
    }
  }

  function clearFilters() {
    setQuery("");
    setFilters({ projectClass: "", clientCode: "", priority: "", rag: "", workBy: "" });
    setKpiMode("");
  }

  return (
    <main className="min-h-screen bg-[#f6f3ee] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Aztute delivery operations
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
                Aztute Dev Tracker
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill persistence={persistence} />
              <button className="btn-primary" onClick={addProject} disabled={Boolean(busy)}>
                <Plus size={16} /> New Project
              </button>
              <button className="btn-secondary" onClick={() => setIsExportDialogOpen(true)} disabled={Boolean(busy)}>
                <Download size={16} /> Excel
              </button>
              {/* header refresh removed - refreshed via filter row button */}
              <button className="btn-secondary" onClick={exportJson}>
                <FileJson size={16} /> Backup
              </button>
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                <Import size={16} /> Import
              </button>
              <button
                className="btn-danger"
                disabled={Boolean(busy)}
                onClick={() =>
                  window.confirm("Reset all projects to seed data?") &&
                  run("reset", () => sendRequest("/api/projects/reset", { method: "POST" }), "Seed data restored.")
                }
              >
                <RefreshCcw size={16} /> Reset
              </button>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept="application/json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importJson(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          </div>

          {toast ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>{toast}</span>
              <button aria-label="Dismiss" onClick={() => setToast("")}>
                <X size={16} />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {isExportDialogOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsExportDialogOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-950">Export Excel</h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose which project rows to include in the Excel export.
            </p>
            <div className="mt-5 grid gap-3">
              <button
                className="btn-primary w-full justify-center"
                onClick={() => void doExportExcel("all")}
              >
                Export All Records ({enriched.length})
              </button>
              <button
                className="btn-secondary w-full justify-center"
                onClick={() => void doExportExcel("filtered")}
              >
                Export Filtered Records ({rows.length})
              </button>
              <button
                className="btn-tertiary w-full justify-center text-slate-700"
                onClick={() => setIsExportDialogOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="mx-auto grid max-w-[1800px] grid-cols-1 gap-3 px-4 py-4 sm:px-6 md:grid-cols-2 xl:grid-cols-5 lg:px-8">
        {kpis.map((kpi) => (
          <button
            key={kpi.label}
            className={classNames(
              "rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
              kpiMode === kpi.mode ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200",
            )}
            onClick={() => setKpiMode(kpi.mode)}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-slate-100 p-2 text-slate-700">
                <kpi.icon size={18} />
              </span>
              <span className={classNames("text-3xl font-semibold", kpi.alert ? "text-rose-700" : "text-slate-950")}>
                {kpi.value}
              </span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">{kpi.label}</p>
          </button>
        ))}
      </section>

      {errorModal ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setErrorModal(null);
          }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Error</h2>
              <button aria-label="Dismiss error" onClick={() => setErrorModal(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-700">{errorModal}</p>
            <div className="mt-6 text-right">
              <button className="btn-primary" onClick={() => setErrorModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <details className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-800">
            <ChevronDown size={16} /> Legend Definitions
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Legend title="Priority" rows={PRIORITIES.map((priority) => [priority, priorityMeaning(priority)])} />
            <Legend title="Size" rows={SIZES.map((size) => [size, SIZE_META[size].meaning])} />
            <Legend title="RAG" rows={RAGS.map((rag) => [rag, RAG_META[rag].meaning])} />
          </div>
        </details>
      </section>

      <section className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

      {/* Search */}
      <div className="flex-1">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="search"
            className="input w-full pl-10"
            placeholder="Search projects, owners, bottlenecks, actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setKpiMode("");
            }}
          />
        </label>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">

        <Select
          className="w-40"
          value={filters.projectClass}
          options={["", ...PROJECT_CLASSES]}
          onChange={(v) =>
            setFilters({ ...filters, projectClass: v })
          }
        />

        <Select
          className="w-36"
          value={filters.clientCode}
          options={["", ...clients]}
          onChange={(v) =>
            setFilters({ ...filters, clientCode: v })
          }
        />

        <Select
          className="w-32"
          value={filters.priority}
          options={["", ...PRIORITIES]}
          onChange={(v) =>
            setFilters({ ...filters, priority: v })
          }
        />

        <Select
          className="w-28"
          value={filters.rag}
          options={["", ...RAGS]}
          onChange={(v) =>
            setFilters({ ...filters, rag: v })
          }
        />

        <Select
          className="w-40"
          value={filters.workBy}
          options={["", ...WORK_SOURCES]}
          onChange={(v) =>
            setFilters({ ...filters, workBy: v })
          }
        />

        <button
          className="btn-danger whitespace-nowrap"
          onClick={clearFilters}
        >
          <X size={16} />
          Clear
        </button>

        <button
          className="btn-primary whitespace-nowrap"
          disabled={Boolean(busy)}
          onClick={() =>
            void run(
              "refresh",
              () => sendRequest("/api/projects"),
              "Projects refreshed."
            )
          }
        >
          <RefreshCcw size={16} />
        </button>

      </div>

    </div>
  </div>
</section>

      <section className="mx-auto max-w-[1800px] px-4 pb-6 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Project Tracker</h2>
              <p className="text-sm text-slate-500">
                Showing {rows.length} of {projects.length} active projects
              </p>
            </div>
            {busy ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Loader2 className="animate-spin" size={16} /> Syncing
              </span>
            ) : null}
          </div>
          <div className="max-h-[64vh] overflow-auto">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950 text-left text-white">
                  {sortableColumns.map((column) => (
                    <th key={column.key} className="sticky top-0 z-10 px-3 py-3 font-semibold">
                      <button
                        className="inline-flex items-center gap-1 whitespace-nowrap"
                        onClick={() =>
                          setSort((current) =>
                            current.key === column.key
                              ? { key: column.key, dir: current.dir === "asc" ? "desc" : "asc" }
                              : { key: column.key, dir: column.key === "attentionScore" ? "desc" : "asc" },
                          )
                        }
                      >
                        {column.label} <ArrowDownAZ size={14} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((project) => (
                  <tr
                    key={project.id}
                    className={classNames(
                      "cursor-pointer border-b border-slate-100 hover:bg-emerald-50/60",
                      project.id === selectedId && "bg-emerald-50 outline outline-2 outline-emerald-500",
                    )}
                    onClick={() => selectProject(project)}
                  >
                    <td className="w-[120px] px-3 py-3">
                      <AttentionBadge project={project} />
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-700">{project.projectNumber}</td>
                    <td className="px-3 py-3 font-semibold">{project.name}</td>
                    <td className="px-3 py-3">{project.projectClass}</td>
                    <td className="px-3 py-3">{project.clientCode || "N/A"}</td>
                    <td className="px-3 py-3">{project.workBy}</td>
                    <td className="px-3 py-3">{project.priority}</td>
                    <td className="px-3 py-3">{project.size}</td>
                    <td className="px-3 py-3"><RagBadge rag={project.rag} /></td>
                    <td className="px-3 py-3">{project.blocker ? "Yes" : "No"}</td>
                    <td className="px-3 py-3">{project.daysSlipped}</td>
                    <td className="max-w-[260px] px-3 py-3 text-slate-600">{project.bottleneck}</td>
                    <td className="max-w-[260px] px-3 py-3 text-slate-600">{project.nextAction}</td>
                    <td className="px-3 py-3">{project.owner}</td>
                    <td className="px-3 py-3">{project.targetDate || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {isDetailOpen && selected && selectedEnriched ? (
        <div
          aria-labelledby="project-detail-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsDetailOpen(false);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
            <ProjectDetail
              busy={busy}
              project={selected}
              enriched={selectedEnriched}
              setProject={setDraft}
              onClose={() => setIsDetailOpen(false)}
              onSave={saveProject}
              onDelete={deleteSelected}
              onAddAction={addAction}
              onAddNote={addNote}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ProjectDetail({
  busy,
  project,
  enriched,
  setProject,
  onClose,
  onSave,
  onDelete,
  onAddAction,
  onAddNote,
}: {
  busy: string;
  project: Project;
  enriched: EnrichedProject;
  setProject: (project: Project) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onAddAction: (formData: FormData) => Promise<void>;
  onAddNote: (formData: FormData) => Promise<void>;
}) {
  function update<K extends keyof Project>(key: K, value: Project[K]) {
    setProject({ ...project, [key]: value });
  }

  return (
    <div>
      <div className="border-b border-slate-200 bg-[#fbfaf7] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="project-detail-title" className="text-xl font-semibold">{project.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {project.projectNumber} | {project.projectClass} | {project.clientCode || "N/A"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AttentionBadge project={enriched} large />
            <button
              aria-label="Close project details"
              className="btn-secondary h-10 w-10 justify-center p-0"
              type="button"
              onClick={onClose}
            >
              <X size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[calc(92vh-82px)] overflow-auto">
        <form
          className="grid gap-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave();
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            {textFields.slice(0, 6).map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  className="input"
                  value={String(project[field.key] || "")}
                  onChange={(event) => update(field.key, event.target.value as never)}
                />
              </Field>
            ))}
            <Field label="Project Class">
              <Select value={project.projectClass} options={PROJECT_CLASSES} onChange={(value) => update("projectClass", value as never)} />
            </Field>
            <Field label="Who Is Doing Work">
              <Select value={project.workBy} options={WORK_SOURCES} onChange={(value) => update("workBy", value as never)} />
            </Field>
            <Field label="Priority">
              <Select value={project.priority} options={PRIORITIES} onChange={(value) => update("priority", value as never)} />
            </Field>
            <Field label="Size">
              <Select value={project.size} options={SIZES} onChange={(value) => update("size", value as never)} />
            </Field>
            <Field label="RAG">
              <Select value={project.rag} options={RAGS} onChange={(value) => update("rag", value as never)} />
            </Field>
            <Field label="Blocker?">
              <Select value={String(project.blocker)} options={["true", "false"]} onChange={(value) => update("blocker", (value === "true") as never)} />
            </Field>
            <Field label="Help Needed From">
              <Select value={project.helpNeeded} options={HELP_NEEDED} onChange={(value) => update("helpNeeded", value as never)} />
            </Field>
            <Field label="Target Date">
              <input className="input" type="date" value={project.targetDate} onChange={(event) => update("targetDate", event.target.value)} />
            </Field>
          </div>

          {textFields.slice(6).map((field) => (
            <Field key={field.key} label={field.label}>
              <textarea
                className="input min-h-24 resize-y"
                value={String(project[field.key] || "")}
                onChange={(event) => update(field.key, event.target.value as never)}
              />
            </Field>
          ))}

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={Boolean(busy)} type="submit">
              <Save size={16} /> Save Changes
            </button>
            <button className="btn-danger" disabled={Boolean(busy)} type="button" onClick={() => void onDelete()}>
              <Archive size={16} /> Archive/Delete
            </button>
          </div>
        </form>

        <section className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle2 size={17} /> Action Items
            </h3>
            <span className="text-xs text-slate-500">{project.actions.length} total</span>
          </div>
          <form
            className="grid gap-2 lg:grid-cols-[1fr_0.55fr_0.5fr_0.5fr_auto]"
            action={(formData) => void onAddAction(formData)}
          >
            <input className="input" name="text" placeholder="Action / commitment" />
            <input className="input" name="owner" placeholder="Owner" />
            <input className="input" name="dueDate" type="date" />
            <Select name="status" value="Open" options={ACTION_STATUSES} />
            <button className="btn-secondary justify-center" disabled={Boolean(busy)}>
              <Plus size={16} /> Add
            </button>
          </form>
          <ThreadList
            empty="No action items yet."
            items={project.actions.map((action) => ({
              id: action.id,
              title: action.status,
              meta: `${action.owner} | Due ${action.dueDate || "N/A"}`,
              body: action.text,
            }))}
          />
        </section>

        <section className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <History size={17} /> Threaded Notes & Change History
            </h3>
            <span className="text-xs text-slate-500">Automatic field changes included</span>
          </div>
          <form className="grid gap-2" action={(formData) => void onAddNote(formData)}>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
              <input className="input" name="author" placeholder="Author" />
              <Select
                name="type"
                value="Status Update"
                options={["Status Update", "Decision", "Commitment", "Blocker", "Risk", "Client/Vendor Follow-up"]}
              />
            </div>
            <textarea className="input min-h-20 resize-y" name="note" placeholder="Add threaded note..." />
            <button className="btn-secondary w-fit" disabled={Boolean(busy)}>
              <Upload size={16} /> Add Note
            </button>
          </form>
          <ThreadList
            empty="No history yet."
            items={project.history.map((entry, index) => ({
              id: `${entry.at}-${index}`,
              title: entry.type,
              meta: `${entry.author || "N/A"} | ${formatDateTime(entry.at)}`,
              body: entry.field
                ? `${entry.field}: "${entry.oldValue}" -> "${entry.newValue}". ${entry.note}`
                : entry.note,
            }))}
          />
        </section>
      </div>
    </div>
  );
}

function ThreadList({
  items,
  empty,
}: {
  items: { id: string; title: string; meta: string; body: string }[];
  empty: string;
}) {
  if (!items.length) return <p className="mt-3 text-sm text-slate-500">{empty}</p>;
  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <article key={item.id} className="rounded-lg border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">{item.title}</span>
            <span>{item.meta}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.body}</p>
        </article>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-slate-600">
      {label}
      {children}
    </label>
  );
}

function Select({
  value,
  options,
  onChange,
  name,
  className,
}: {
  value: string;
  options: string[];
  onChange?: (value: string) => void;
  name?: string;
  className?: string;
}) {
  return (
    <select
      className={classNames("input", className)}
      name={name}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option || "all"} value={option}>
          {option || "All"}
        </option>
      ))}
    </select>
  );
}

function AttentionBadge({ project, large = false }: { project: EnrichedProject; large?: boolean }) {
  const tone =
    project.attentionLevel === "Critical"
      ? "bg-rose-100 text-rose-800"
      : project.attentionLevel === "High Attention"
        ? "bg-amber-100 text-amber-800"
        : project.attentionLevel === "Watch Closely"
          ? "bg-sky-100 text-sky-800"
          : "bg-emerald-100 text-emerald-800";
  return (
    <span
      className={classNames(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold",
        tone,
        large ? "gap-1.5 px-3 py-1.5 text-sm" : "gap-1 px-2 py-1 text-xs",
      )}
      title={`${project.attentionLevel}: ${project.attentionScore}`}
    >
      {large ? project.attentionLevel : shortAttention(project.attentionLevel)}
      <span className={classNames("rounded-full bg-white/60 font-mono", large ? "px-1.5" : "px-1")}>
        {project.attentionScore}
      </span>
    </span>
  );
}

function shortAttention(level: EnrichedProject["attentionLevel"]) {
  if (level === "High Attention") return "High";
  if (level === "Watch Closely") return "Watch";
  return level;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function RagBadge({ rag }: { rag: Project["rag"] }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <span className={classNames("h-2.5 w-2.5 rounded-full", RAG_META[rag].dot)} />
      {rag}
    </span>
  );
}

function StatusPill({ persistence }: { persistence: "mongodb" | "memory" }) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold",
        persistence === "mongodb"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800",
      )}
    >
      <Database size={16} />
      {persistence === "mongodb" ? "" : "Dummy DB: memory fallback"}
    </span>
  );
}

function Legend({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[#fbfaf7] p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 divide-y divide-slate-200 text-sm">
        {rows.map(([label, meaning]) => (
          <div key={label} className="grid grid-cols-[82px_1fr] gap-3 py-2">
            <span className="font-semibold text-slate-800">{label}</span>
            <span className="text-slate-600">{meaning}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function priorityMeaning(priority: Project["priority"]) {
  switch (priority) {
    case "Urgent":
      return "Client, release, or production impacted; act now.";
    case "High":
      return "Important and time-sensitive; may become a blocker.";
    case "Medium":
      return "Important work to plan into a sprint.";
    case "Low":
      return "Handle when capacity allows.";
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function appendSheet(
  XLSX: typeof import("xlsx"),
  workbook: import("xlsx").WorkBook,
  name: string,
  rows: Record<string, unknown>[],
) {
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows.length ? rows : [{ Empty: "No rows" }]),
    name.replace(/[/?*[\]:]/g, " ").slice(0, 31),
  );
}
