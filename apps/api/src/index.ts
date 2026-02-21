import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));

// Shows what routes are active (debug endpoint)
app.get("/routes", async () => app.printRoutes());

app.get("/projects", async () => {
  return prisma.project.findMany({
    orderBy: { projectNumber: "desc" },
    include: {
      tasks: true,
      _count: { select: { notes: true } },
    },
  });
});

app.get("/projects/:id/notes", async (req) => {
  const { id } = req.params as { id: string };
  return prisma.projectNote.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });
});

app.post("/projects/:id/notes", async (req, reply) => {
  const { id } = req.params as { id: string };
  const body = req.body as { body: string };

  const note = await prisma.projectNote.create({
    data: { projectId: id, body: body.body },
  });

  return reply.code(201).send(note);
});

app.patch("/projects/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const body = req.body as Partial<{
    projectNumber: string;
    jobType:
      | "CONSTRUCTION_STAKING"
      | "DESIGN_SURVEY"
      | "ILC"
      | "BOUNDARY"
      | "ALTA"
      | "SITE_PLAN"
      | "SUBDIVISION"
      | "LEGAL_DESCRIPTION";
    clientName: string | null;
    siteAddress: string | null;
    jurisdiction: string | null;
    dueTarget: string | null;
    dueHard: string | null;
    pmName: string | null;
    notesText: string | null;
    priority: number;
    stage:
      | "INTAKE"
      | "RESEARCH"
      | "FIELD"
      | "DRAFTING"
      | "QAQC"
      | "DELIVERED"
      | "INVOICED"
      | "CLOSED";
  }>;

  const updated = await prisma.project.update({
    where: { id },
    data: {
      projectNumber: body.projectNumber,
      jobType: body.jobType,
      clientName: body.clientName === undefined ? undefined : body.clientName,
      siteAddress: body.siteAddress === undefined ? undefined : body.siteAddress,
      jurisdiction: body.jurisdiction === undefined ? undefined : body.jurisdiction,
      priority: body.priority,
      pmName: body.pmName === undefined ? undefined : body.pmName,
      notesText: body.notesText === undefined ? undefined : body.notesText,
      stage: body.stage,
      dueTarget: body.dueTarget === undefined ? undefined : (body.dueTarget ? new Date(body.dueTarget) : null),
      dueHard: body.dueHard === undefined ? undefined : (body.dueHard ? new Date(body.dueHard) : null),
    },
    include: { tasks: true, _count: { select: { notes: true } } },
  });

  return reply.send(updated);
});

function nextProjectNumberFrom(latest: string | null, year2: string): string {
  if (!latest) return `${year2}001`;
  // latest expected like "26002"
  const latestYear = latest.slice(0, 2);
  const latestSeqStr = latest.slice(2);
  const latestSeq = Number(latestSeqStr);

  if (latestYear !== year2 || Number.isNaN(latestSeq)) {
    return `${year2}001`;
  }

  const nextSeq = latestSeq + 1;
  const padded = String(nextSeq).padStart(3, "0");
  return `${year2}${padded}`;
}

function minusDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - days);
  return copy;
}

app.get("/projects/next-number", async () => {
  const now = new Date();
  const year2 = String(now.getFullYear()).slice(-2);

  const latest = await prisma.project.findFirst({
    where: { projectNumber: { startsWith: year2 } },
    orderBy: { projectNumber: "desc" },
    select: { projectNumber: true },
  });

  const next = nextProjectNumberFrom(latest?.projectNumber ?? null, year2);
  return { year2, next, latest: latest?.projectNumber ?? null };
});

app.post("/projects", async (req, reply) => {
  const body = req.body as {
    projectNumber?: string;
    jobType:
      | "CONSTRUCTION_STAKING"
      | "DESIGN_SURVEY"
      | "ILC"
      | "BOUNDARY"
      | "ALTA"
      | "SITE_PLAN"
      | "SUBDIVISION"
      | "LEGAL_DESCRIPTION";
    clientName?: string;
    siteAddress?: string;
    jurisdiction?: string;
    dueTarget?: string;
    dueHard?: string;
    pmName?: string;
    notesText?: string;
    priority?: number;
  };

const now = new Date();
const year2 = String(now.getFullYear()).slice(-2);

let projectNumber = body.projectNumber?.trim();
if (!projectNumber) {
  const latest = await prisma.project.findFirst({
    where: { projectNumber: { startsWith: year2 } },
    orderBy: { projectNumber: "desc" },
    select: { projectNumber: true },
  });

  projectNumber = nextProjectNumberFrom(latest?.projectNumber ?? null, year2);
}

const hard = body.dueHard ? new Date(body.dueHard) : null;
const target =
  body.dueTarget ? new Date(body.dueTarget)
  : hard ? minusDays(hard, 2)
  : null;

  const project = await prisma.project.create({
    data: {
      projectNumber,
      jobType: body.jobType,
      clientName: body.clientName,
      siteAddress: body.siteAddress,
      jurisdiction: body.jurisdiction,
      dueHard: hard ?? undefined,
      dueTarget: target ?? undefined,
      pmName: body.pmName,
      notesText: body.notesText,
      priority: body.priority ?? 0,
      tasks: {
        create: [
          { taskType: "RESEARCH", sortOrder: 10 },
          { taskType: "FIELD", sortOrder: 20 },
          { taskType: "DRAFTING", sortOrder: 30 },
          { taskType: "QAQC", sortOrder: 40 },
          { taskType: "DELIVER", sortOrder: 50 },
          { taskType: "INVOICE", sortOrder: 60 },
        ],
      },
    },
    include: { tasks: true },
  });

  return reply.code(201).send(project);
});



const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}