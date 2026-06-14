/**
 * Express API + static dashboard for the scraped, scored jobs,
 * plus on-demand JD-tailored resume generation (PDF + DOCX) via the Claude API.
 *
 * Usage: npm start  ->  http://localhost:4000
 */
import "reflect-metadata";
import express from "express";
import * as path from "path";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import { Job } from "./entity/Job";
import { tailorResume, TailoredResume } from "./tailor";
import { buildResumePdfBuffer } from "./render/resumePdf";
import { buildResumeDocx } from "./render/resumeDocx";

dotenv.config();

function safeFile(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
}

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Job);
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  // Ensure a job has a cached tailored resume; generate + persist if missing/forced.
  async function ensureTailored(
    id: number,
    force = false
  ): Promise<{ job: Job; resume: TailoredResume } | null> {
    const job = await repo.findOne({ where: { id } });
    if (!job) return null;
    if (!job.tailoredResume || force) {
      const resume = await tailorResume(job);
      job.tailoredResume = resume;
      job.tailoredAt = new Date();
      await repo.save(job);
    }
    return { job, resume: job.tailoredResume as TailoredResume };
  }

  // GET /api/jobs?role=&minScore=&sizeOnly=&topOnly=&q=
  app.get("/api/jobs", async (req, res) => {
    const { role, minScore, sizeOnly, topOnly, status, q } = req.query as Record<string, string>;
    let jobs = await repo.find({ order: { fitScore: "DESC" } });

    if (role && role !== "all") jobs = jobs.filter((j) => j.searchTitle === role);
    if (minScore) jobs = jobs.filter((j) => j.fitScore >= Number(minScore));
    if (sizeOnly === "true") jobs = jobs.filter((j) => j.sizeMatch);
    if (topOnly === "true") jobs = jobs.filter((j) => j.topPick);
    if (status && status !== "all") jobs = jobs.filter((j) => (j.status || "new") === status);
    if (q) {
      const s = q.toLowerCase();
      jobs = jobs.filter((j) =>
        `${j.title} ${j.company} ${j.location} ${j.industries}`.toLowerCase().includes(s)
      );
    }

    // Trim heavy fields (raw, tailoredResume, description) out of the list payload.
    const dto = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      companyLogo: j.companyLogo,
      location: j.location,
      employeeCount: j.employeeCount,
      sizeMatch: j.sizeMatch,
      salary: j.salary,
      seniority: j.seniority,
      postedDate: j.postedDate,
      jobUrl: j.jobUrl,
      applyUrl: j.applyUrl,
      searchTitle: j.searchTitle,
      fitScore: j.fitScore,
      matchReasons: j.matchReasons,
      topPick: j.topPick,
      isTailored: !!j.tailoredResume,
      status: j.status || "new",
    }));
    res.json(dto);
  });

  // Update application status: new | applied | no_response | rejected | selected
  const ALLOWED_STATUS = ["new", "applied", "no_response", "rejected", "selected"];
  app.patch("/api/jobs/:id/status", async (req, res) => {
    const { status } = req.body || {};
    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUS.join(", ")}` });
    }
    const job = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    job.status = status;
    job.statusUpdatedAt = new Date();
    await repo.save(job);
    res.json({ ok: true, status });
  });

  app.get("/api/stats", async (_req, res) => {
    const total = await repo.count();
    const inBand = await repo.count({ where: { sizeMatch: true } });
    const top = await repo.count({ where: { topPick: true } });
    const avg = await repo.createQueryBuilder("j").select("AVG(j.fitScore)", "avg").getRawOne();
    const applied = await repo.createQueryBuilder("j").where("j.status != :s", { s: "new" }).getCount();
    res.json({ total, inBand, top, avgScore: Number(avg?.avg || 0).toFixed(1), applied });
  });

  // Generate (or regenerate with ?force=1) a tailored resume for a job.
  app.post("/api/jobs/:id/tailor", async (req, res) => {
    try {
      const force = req.query.force === "1";
      const out = await ensureTailored(Number(req.params.id), force);
      if (!out) return res.status(404).json({ error: "Job not found" });
      res.json({
        ok: true,
        title: out.resume.title,
        tailoringNotes: out.resume.tailoringNotes,
        tailoredAt: out.job.tailoredAt,
      });
    } catch (e: any) {
      console.error("tailor error:", e?.message || e);
      res.status(500).json({ error: e?.message || "Failed to tailor resume" });
    }
  });

  app.get("/api/jobs/:id/resume.pdf", async (req, res) => {
    try {
      const out = await ensureTailored(Number(req.params.id));
      if (!out) return res.status(404).send("Job not found");
      const fname = safeFile(`${out.resume.name}_${out.job.company}.pdf`);
      const disposition = req.query.inline === "1" ? "inline" : "attachment";
      const buf = await buildResumePdfBuffer(out.resume);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${disposition}; filename="${fname}"`);
      res.send(buf);
    } catch (e: any) {
      console.error("pdf error:", e?.message || e);
      res.status(500).send(e?.message || "Failed to build PDF");
    }
  });

  app.get("/api/jobs/:id/resume.docx", async (req, res) => {
    try {
      const out = await ensureTailored(Number(req.params.id));
      if (!out) return res.status(404).send("Job not found");
      const buf = await buildResumeDocx(out.resume);
      const fname = safeFile(`${out.resume.name}_${out.job.company}.docx`);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
      res.send(buf);
    } catch (e: any) {
      console.error("docx error:", e?.message || e);
      res.status(500).send(e?.message || "Failed to build DOCX");
    }
  });

  // Tailored resume as JSON (for the in-dashboard preview: notes, title, etc.)
  app.get("/api/jobs/:id/resume.json", async (req, res) => {
    try {
      const out = await ensureTailored(Number(req.params.id));
      if (!out) return res.status(404).json({ error: "Job not found" });
      res.json({
        job: { id: out.job.id, title: out.job.title, company: out.job.company },
        resume: out.resume,
      });
    } catch (e: any) {
      console.error("resume.json error:", e?.message || e);
      res.status(500).json({ error: e?.message || "Failed to load resume" });
    }
  });

  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`\n  Job dashboard → http://localhost:${port}\n`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
