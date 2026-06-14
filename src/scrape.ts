/**
 * Scrape LinkedIn jobs via the Apify actor `curious_coder/linkedin-jobs-scraper`
 * and save the raw dataset to data/jobs.json.
 *
 * Reads config from .env:
 *   APIFY_TOKEN, APIFY_ACTOR, JOB_LOCATION, SEARCH_TITLES, SCRAPE_COUNT
 *
 * Usage: npm run scrape
 *
 * NOTE: this is the same actor the Apify MCP calls — running it here directly
 * via the Apify API produces identical results without needing the MCP loaded.
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.APIFY_TOKEN!;
const ACTOR = (process.env.APIFY_ACTOR || "curious_coder/linkedin-jobs-scraper").replace("/", "~");
const LOCATION = process.env.JOB_LOCATION || "India";
const TITLES = (process.env.SEARCH_TITLES || "Technical Business Analyst,Technical Project Manager")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const COUNT = Number(process.env.SCRAPE_COUNT || 100);
const LAST_7_DAYS = "r604800"; // f_TPR seconds

function searchUrl(keywords: string): string {
  const q = new URLSearchParams({ keywords, location: LOCATION, f_TPR: LAST_7_DAYS });
  return `https://www.linkedin.com/jobs/search/?${q.toString()}`;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!TOKEN) throw new Error("APIFY_TOKEN missing in .env");

  const input = {
    urls: TITLES.map(searchUrl),
    count: COUNT,
    scrapeCompany: true, // needed for employee counts (50-5000 filter)
  };
  console.log("Starting Apify run:", ACTOR);
  console.log("  titles:", TITLES.join(" | "), "| location:", LOCATION, "| last 7 days");

  const startRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const start = (await startRes.json()) as any;
  const runId = start.data.id;
  const datasetId = start.data.defaultDatasetId;
  console.log("  runId:", runId);

  // poll
  let status = start.data.status;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
    await sleep(5000);
    const r = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${TOKEN}`);
    const d = (await r.json()) as any;
    status = d.data.status;
    process.stdout.write(`  status: ${status}\r`);
  }
  console.log(`\n  finished: ${status}`);
  if (status !== "SUCCEEDED") throw new Error(`Run did not succeed: ${status}`);

  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${TOKEN}&clean=true`
  );
  const items = (await itemsRes.json()) as any[];

  const out = path.join(__dirname, "..", "data", "jobs.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(items, null, 2));
  console.log(`Saved ${items.length} jobs -> ${out}`);
  console.log("Next: npm run ingest");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
