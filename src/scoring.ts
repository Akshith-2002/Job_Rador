/**
 * Resume-based fit scoring for Akshith Kumar Y V.
 * Technical Business Analyst / Technical Project Manager, ~2 yrs exp, Bengaluru.
 * Returns a 1-10 score, human-readable reasons, and the 50-5000 size flag.
 */

export interface ScoreResult {
  score: number;
  reasons: string[];
  sizeMatch: boolean;
}

// Skills / keywords lifted straight from the resume.
const SKILLS: string[] = [
  // Requirements & specs
  "business analyst", "business analysis", "requirement", "brd", "frd", "fsd",
  "functional spec", "user stor", "acceptance criteria", "use case", "process flow",
  "gap analysis", "as-is", "to-be", "uat", "sign-off", "data contract", "documentation",
  // PM / Agile
  "project manager", "project management", "program manager", "agile", "scrum", "sprint",
  "kanban", "jira", "confluence", "backlog", "stakeholder", "delivery", "roadmap",
  "change request", "dependency",
  // Product & integration
  "saas", "api", "web service", "system integration", "integration", "product", "sdlc",
  // Data & BI
  "sql", "snowflake", "bigquery", "etl", "elt", "data pipeline", "power bi", "tableau",
  "analytics", "reporting", "dashboard", "excel",
  // Marketing & AI
  "google ads", "meta ads", "gtm", "google analytics", "ga4", "attribution", "a/b test",
  "n8n", "automation", "workflow", "artificial intelligence", "gpt", "prompt", "chatbot",
  "llm", "machine learning",
];

const DOMAINS = [
  "edtech", "e-learning", "ev ", "mobility", "electric vehicle", "iot", "sustainab",
  "travel", "saas", "fintech", "consult", "information technology", "software", "it services",
];

const SENIOR_BAD = [
  "senior", "sr.", "sr ", "lead ", "principal", "head of", "head,", "director", "vp",
  "vice president", "chief", "manager of", "architect", "staff ",
];
const JUNIOR_GOOD = ["associate", "junior", "entry", "graduate", "trainee"];

function ageInDays(postedAt: string | undefined): number | null {
  if (!postedAt) return null;
  const t = new Date(postedAt).getTime();
  if (isNaN(t)) return null;
  return (Date.now() - t) / 86400000;
}

export function scoreJob(j: any): ScoreResult {
  const title = String(j.title || "").toLowerCase();
  const desc = String(j.descriptionText || "").toLowerCase();
  const fn = String(j.jobFunction || "").toLowerCase();
  const ind = String(j.industries || "").toLowerCase();
  const hay = `${title}\n${desc}\n${fn}\n${ind}`;
  const reasons: string[] = [];
  let score = 0;

  // 1. Title relevance (0-3)
  const isTBA = title.includes("business analyst");
  const isPM =
    title.includes("project manager") ||
    title.includes("program manager") ||
    title.includes("project management") ||
    title.includes("delivery manager");
  const isTechnical =
    title.includes("technical") || title.includes("technology") || title.includes("software") ||
    /\bit\b/.test(title);
  let titleScore: number;
  if (isTBA || isPM) {
    titleScore = 2.2;
    if (isTechnical) {
      titleScore += 0.8;
      reasons.push(`Technical ${isTBA ? "Business Analyst" : "Project/Program Manager"} title — direct match`);
    } else {
      reasons.push(`${isTBA ? "Business Analyst" : "Project/Program Manager"} title match`);
    }
  } else if (
    title.includes("analyst") || title.includes("product manager") ||
    title.includes("product owner") || title.includes("scrum master")
  ) {
    titleScore = 1.6;
    reasons.push("Adjacent role (analyst / product / scrum)");
  } else {
    titleScore = 0.4;
  }
  score += titleScore;

  // 2. Seniority fit (0-1.5) — targeting ~2 yrs experience
  const sen = String(j.seniorityLevel || "").toLowerCase();
  let senScore = 1.0;
  if (sen.includes("entry") || sen.includes("associate") || sen.includes("internship")) senScore = 1.5;
  else if (sen.includes("mid-senior")) senScore = 1.1;
  else if (sen.includes("director") || sen.includes("executive")) senScore = 0.2;
  if (SENIOR_BAD.some((s) => title.includes(s))) {
    senScore = Math.min(senScore, 0.5);
    reasons.push("Title skews senior — may be a stretch on experience");
  }
  if (JUNIOR_GOOD.some((s) => title.includes(s))) senScore = Math.max(senScore, 1.2);
  score += senScore;

  // 3. Skills overlap (0-3)
  const matched = new Set<string>();
  for (const s of SKILLS) if (hay.includes(s)) matched.add(s.trim());
  const skillScore = Math.min(3, matched.size * 0.28);
  score += skillScore;
  if (matched.size) {
    const shown = [...matched].slice(0, 6).join(", ");
    reasons.push(`${matched.size} resume skills matched (${shown}${matched.size > 6 ? "…" : ""})`);
  }

  // 4. Domain / IT fit (0-1)
  const dom = DOMAINS.map((d) => d.trim()).filter((d) => hay.includes(d));
  let domScore = 0;
  if (fn.includes("information technology")) domScore += 0.6;
  if (dom.length) domScore += 0.5;
  domScore = Math.min(1, domScore);
  score += domScore;
  if (domScore > 0) reasons.push(`Domain/IT fit${dom.length ? ` (${dom.slice(0, 3).join(", ")})` : ""}`);

  // 5. Company size 50-5000 (0-1)
  const emp = typeof j.companyEmployeesCount === "number" ? j.companyEmployeesCount : null;
  const sizeMatch = emp != null && emp >= 50 && emp <= 5000;
  let sizeScore = 0.3; // unknown
  if (sizeMatch) {
    sizeScore = 1.0;
    reasons.push(`Company size in target band (${emp.toLocaleString()} employees)`);
  } else if (emp != null) {
    sizeScore = 0.1;
    reasons.push(`Company size out of band (${emp.toLocaleString()} employees)`);
  }
  score += sizeScore;

  // 6. Recency (0-0.5)
  const days = ageInDays(j.postedAt);
  let recScore = 0.2;
  if (days != null) {
    if (days <= 2) {
      recScore = 0.5;
      reasons.push("Posted in the last 48h");
    } else if (days <= 4) recScore = 0.4;
    else recScore = 0.25;
  }
  score += recScore;

  // 7. Location (0-0.5)
  const loc = String(j.location || "").toLowerCase();
  let locScore = 0.2;
  if (loc.includes("bengaluru") || loc.includes("bangalore")) {
    locScore = 0.5;
    reasons.push("Bengaluru — home base");
  } else if (loc.includes("remote") || loc.includes("hybrid")) {
    locScore = 0.45;
    reasons.push("Remote / Hybrid");
  } else if (loc.includes("india")) locScore = 0.35;
  score += locScore;

  const final = Math.round(Math.max(1, Math.min(10, score)) * 10) / 10;
  return { score: final, reasons, sizeMatch };
}
