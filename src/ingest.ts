/**
 * Read data/jobs.json, normalize + score each job against the resume,
 * upsert into Postgres (via TypeORM), then flag the top 10 "apply today" picks.
 *
 * Usage: npm run ingest
 */
import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { AppDataSource } from "./data-source";
import { Job } from "./entity/Job";
import { scoreJob } from "./scoring";

function searchTitleFromUrl(u: string): string {
  // LinkedIn encodes spaces as "+", which decodeURIComponent leaves intact.
  const s = decodeURIComponent(u || "").replace(/\+/g, " ");
  if (/business analyst/i.test(s)) return "Technical Business Analyst";
  if (/project manager/i.test(s)) return "Technical Project Manager";
  return "Unknown";
}

function toInt(v: any): number | null {
  const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? null : n;
}

async function main() {
  const file = path.join(__dirname, "..", "data", "jobs.json");
  if (!fs.existsSync(file)) {
    throw new Error("data/jobs.json not found — run `npm run scrape` first.");
  }
  const raw: any[] = JSON.parse(fs.readFileSync(file, "utf-8"));

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Job);

  let count = 0;
  for (const r of raw) {
    const { score, reasons, sizeMatch } = scoreJob(r);
    const externalId = String(r.id || r.link || r.applyUrl);
    if (!externalId || externalId === "undefined") continue;

    const job = (await repo.findOne({ where: { externalId } })) || new Job();
    job.externalId = externalId;
    job.title = r.title || "";
    job.company = r.companyName || "";
    job.companyUrl = r.companyLinkedinUrl || null;
    job.companyLogo = r.companyLogo || null;
    job.location = r.location || null;
    job.employeeCount = typeof r.companyEmployeesCount === "number" ? r.companyEmployeesCount : null;
    job.sizeMatch = sizeMatch;
    job.salary = r.salary || null;
    job.seniority = r.seniorityLevel || null;
    job.employmentType = r.employmentType || null;
    job.jobFunction = r.jobFunction || null;
    job.industries = r.industries || null;
    job.applicantsCount = toInt(r.applicantsCount);
    job.postedDate = r.postedAt || null;
    job.description = (r.descriptionText || "").slice(0, 6000) || null;
    job.jobUrl = r.link || r.applyUrl || "";
    job.applyUrl = r.applyUrl || r.link || "";
    job.searchTitle = searchTitleFromUrl(r.inputUrl);
    job.fitScore = score;
    job.matchReasons = reasons;
    job.topPick = false;
    job.raw = r;
    await repo.save(job);
    count++;
  }

  // Flag top 10 "apply today": highest fit among companies in the 50-5000 band.
  await repo
    .createQueryBuilder()
    .update(Job)
    .set({ topPick: false })
    .execute();

  const inBand = await repo.find({
    where: { sizeMatch: true },
    order: { fitScore: "DESC" },
  });
  const top = inBand.slice(0, 10);
  for (const j of top) {
    j.topPick = true;
    await repo.save(j);
  }

  console.log(`\nIngested/updated ${count} jobs.`);
  console.log(`In 50-5000 employee band: ${inBand.length}`);
  console.log(`Flagged top picks (apply today): ${top.length}\n`);

  // Pretty console preview of the top 12 overall
  const preview = await repo.find({ order: { fitScore: "DESC" }, take: 12 });
  console.log("TOP 12 BY FIT SCORE");
  console.log("─".repeat(96));
  for (const j of preview) {
    const star = j.topPick ? "⭐" : "  ";
    const size = j.employeeCount != null ? `${j.employeeCount}` : "?";
    console.log(
      `${star} ${String(j.fitScore).padStart(4)} | ${(j.title || "").slice(0, 38).padEnd(38)} | ${(j.company || "").slice(0, 22).padEnd(22)} | ${size.padStart(7)} emp | ${j.postedDate}`
    );
  }
  console.log("─".repeat(96));

  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
