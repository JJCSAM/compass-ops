import { useEffect, useMemo, useState } from "react";
import "./App.css";

type JobType =
  | "CONSTRUCTION_STAKING"
  | "DESIGN_SURVEY"
  | "ILC"
  | "BOUNDARY"
  | "ALTA"
  | "SITE_PLAN"
  | "SUBDIVISION"
  | "LEGAL_DESCRIPTION";

type Task = {
  id: string;
  taskType: string;
  status: string;
};

type Project = {
  id: string;
  projectNumber: string;
  jobType: JobType;
  stage: string;
  clientName: string | null;
  siteAddress: string | null;
  jurisdiction: string | null;
  priority: number;
  pmName: string | null;
  notesText: string | null;
  dueTarget: string | null;
  dueHard: string | null;
  _count?: { notes: number };
  tasks: Task[];
};

const JOB_TYPES: JobType[] = [
  "CONSTRUCTION_STAKING",
  "DESIGN_SURVEY",
  "ILC",
  "BOUNDARY",
  "ALTA",
  "SITE_PLAN",
  "SUBDIVISION",
  "LEGAL_DESCRIPTION",
];

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH ${path} failed: ${res.status} ${txt}`);
  }
  return res.json() as Promise<T>;
}

function toDateOnlyInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnlyInput(value: string): string | null {
  if (!value) return null;
  return value; // "YYYY-MM-DD"
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form state (New Project)
  const [projectNumber, setProjectNumber] = useState("");
  const [jobType, setJobType] = useState<JobType>("BOUNDARY");
  const [clientName, setClientName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [priority, setPriority] = useState(0);
  const [dueHard, setDueHard] = useState("");
  const [dueTarget, setDueTarget] = useState("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const [eProjectNumber, setEProjectNumber] = useState("");
  const [eJobType, setEJobType] = useState<JobType>("BOUNDARY");
  const [eStage, setEStage] = useState("INTAKE");
  const [eDueHard, setEDueHard] = useState("");
  const [eClientName, setEClientName] = useState("");
  const [eSiteAddress, setESiteAddress] = useState("");
  const [ePmName, setEPmName] = useState("");
  const [eNotesText, setENotesText] = useState("");

  const sorted = useMemo(() => {
    return [...projects].sort((a, b) => b.projectNumber.localeCompare(a.projectNumber));
  }, [projects]);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await apiGet<Project[]>("/projects");
      setProjects(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ next: string }>("/projects/next-number");
        setProjectNumber(data.next);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  async function createProject() {
    setErr(null);
    try {
      await apiPost<Project>("/projects", {
        projectNumber,
        jobType,
        clientName: clientName || undefined,
        siteAddress: siteAddress || undefined,
        jurisdiction: jurisdiction || undefined,
        dueHard: parseDateOnlyInput(dueHard),
        dueTarget: parseDateOnlyInput(dueTarget),
        priority: Number(priority) || 0,
      });

      await refresh();

      try {
        const data = await apiGet<{ next: string }>("/projects/next-number");
        setProjectNumber(data.next);
      } catch {
        // ignore
      }

      setClientName("");
      setSiteAddress("");
      setJurisdiction("");
      setDueHard("");
      setDueTarget("");
      setPriority(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  function openEdit(p: Project) {
    setEditProject(p);

    setEProjectNumber(p.projectNumber);
    setEJobType(p.jobType);
    setEStage(p.stage);

    setEDueHard(toDateOnlyInput(p.dueHard));

    setEClientName(p.clientName ?? "");
    setESiteAddress(p.siteAddress ?? "");
    setEPmName(p.pmName ?? "");
    setENotesText(p.notesText ?? "");

    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editProject) return;
    setErr(null);

    try {
      await apiPatch<Project>(`/projects/${editProject.id}`, {
        projectNumber: eProjectNumber,
        jobType: eJobType,
        stage: eStage,
        dueHard: parseDateOnlyInput(eDueHard),
        clientName: eClientName || null,
        siteAddress: eSiteAddress || null,
        pmName: ePmName || null,
        notesText: eNotesText || null,
      });

      setEditOpen(false);
      setEditProject(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
      <h1>Compass Ops</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>New Project</h2>

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
          <label>Project #</label>
          <input value={projectNumber} onChange={(e) => setProjectNumber(e.target.value)} />

          <label>Job Type</label>
          <select value={jobType} onChange={(e) => setJobType(e.target.value as JobType)}>
            {JOB_TYPES.map((jt) => (
              <option key={jt} value={jt}>
                {jt}
              </option>
            ))}
          </select>

          <label>Client Name</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} />

          <label>Site Address</label>
          <input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />

          <label>Jurisdiction</label>
          <input value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />

          <label>Priority (0 normal, 1 rush)</label>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} />

          <label>Due Date</label>
          <input type="date" value={dueHard} onChange={(e) => setDueHard(e.target.value)} />

          <label>Due Target (internal)</label>
          <input type="date" value={dueTarget} onChange={(e) => setDueTarget(e.target.value)} />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={() => void createProject()}>Create</button>
          <button onClick={() => void refresh()}>Refresh</button>
        </div>

        {err && (
          <pre style={{ marginTop: 12, padding: 10, background: "#fff3f3", border: "1px solid #f5b5b5" }}>{err}</pre>
        )}
      </div>

      <h2>Projects</h2>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
              <th>Project #</th>
              <th>Job</th>
              <th>Stage</th>
              <th>Due Date</th>
              <th>Client</th>
              <th>Address</th>
              <th>PM</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                <td>{p.projectNumber}</td>
                <td>{p.jobType}</td>
                <td>{p.stage}</td>
                <td>{toDateOnlyInput(p.dueHard)}</td>
                <td>{p.clientName ?? ""}</td>
                <td>{p.siteAddress ?? ""}</td>
                <td>{p.pmName ?? ""}</td>
                <td>{p._count?.notes ?? 0}</td>
                <td>
                  <button onClick={() => openEdit(p)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editOpen && editProject && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setEditOpen(false)}
        >
          <div
            style={{
              width: 650,
              maxWidth: "100%",
              background: "#111",
              color: "#fff",
              border: "1px solid #333",
              borderRadius: 12,
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Edit Project</h2>

            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
              <label>Project #</label>
              <input value={eProjectNumber} onChange={(e) => setEProjectNumber(e.target.value)} />

              <label>Job Type</label>
              <select value={eJobType} onChange={(e) => setEJobType(e.target.value as JobType)}>
                {JOB_TYPES.map((jt) => (
                  <option key={jt} value={jt}>
                    {jt}
                  </option>
                ))}
              </select>

              <label>Stage</label>
              <select value={eStage} onChange={(e) => setEStage(e.target.value)}>
                {["INTAKE", "RESEARCH", "FIELD", "DRAFTING", "QAQC", "DELIVERED", "INVOICED", "CLOSED"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <label>Due Date</label>
              <input type="date" value={eDueHard} onChange={(e) => setEDueHard(e.target.value)} />

              <label>Client</label>
              <input value={eClientName} onChange={(e) => setEClientName(e.target.value)} />

              <label>Address</label>
              <input value={eSiteAddress} onChange={(e) => setESiteAddress(e.target.value)} />

              <label>Project Manager</label>
              <input value={ePmName} onChange={(e) => setEPmName(e.target.value)} />

              <label>Notes</label>
              <textarea
                value={eNotesText}
                onChange={(e) => setENotesText(e.target.value)}
                rows={5}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setEditOpen(false)}>Cancel</button>
              <button onClick={() => void saveEdit()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}