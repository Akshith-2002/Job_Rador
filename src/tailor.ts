/**
 * Tailor Akshith's resume to a specific job description using the Claude API.
 *
 * Uses structured outputs (output_config.format + json_schema) so the model
 * returns a strictly-shaped resume object that we render to PDF/DOCX.
 * The model reorders / rewords / emphasizes the MASTER_RESUME facts to match the
 * JD — it must not invent experience, employers, dates, or metrics.
 */
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import { masterResumeText } from "./masterResume";
import { Job } from "./entity/Job";

dotenv.config();

const MODEL = process.env.RESUME_MODEL || "claude-opus-4-8";

export interface TailoredResume {
  name: string;
  title: string; // headline tuned to the role, e.g. "Technical Project Manager"
  contact: {
    location: string;
    phone: string;
    email: string;
    linkedin: string;
    portfolio: string;
  };
  summary: string;
  coreSkills: string[];
  experience: {
    company: string;
    role: string;
    location: string;
    dates: string;
    bullets: string[];
  }[];
  projects: {
    name: string;
    stack: string;
    dates: string;
    bullets: string[];
  }[];
  education: { institution: string; degree: string; dates: string }[];
  tailoringNotes: string[]; // what was emphasized for this JD (UI only, not on the resume)
}

const RESUME_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    contact: {
      type: "object",
      additionalProperties: false,
      properties: {
        location: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        linkedin: { type: "string" },
        portfolio: { type: "string" },
      },
      required: ["location", "phone", "email", "linkedin", "portfolio"],
    },
    summary: { type: "string" },
    coreSkills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          company: { type: "string" },
          role: { type: "string" },
          location: { type: "string" },
          dates: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["company", "role", "location", "dates", "bullets"],
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          stack: { type: "string" },
          dates: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
        required: ["name", "stack", "dates", "bullets"],
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          dates: { type: "string" },
        },
        required: ["institution", "degree", "dates"],
      },
    },
    tailoringNotes: { type: "array", items: { type: "string" } },
  },
  required: [
    "name", "title", "contact", "summary", "coreSkills",
    "experience", "projects", "education", "tailoringNotes",
  ],
};

const SYSTEM = `You are an expert technical resume writer and career coach.
You tailor a candidate's existing resume to a specific job description for ATS and recruiter readability.

HARD RULES:
- Use ONLY the facts in the MASTER RESUME. Never invent employers, titles, dates, metrics, tools, or projects.
- Produce a COMPLETE, FULL one-page resume — rich enough to fill the whole page, but never more than one page. Use the space well; don't pad with fluff, but include enough relevant detail.
- You MAY reorder, reword, re-emphasize, and select the most relevant content.
- Mirror the job description's language and keywords where the candidate genuinely has the experience (helps ATS).
- Rewrite the summary as 3-4 sentences speaking directly to this role.
- Reorder coreSkills so the most JD-relevant come first; keep 15-18 items.
- Experience: keep ALL relevant bullets (5-6), achievement-focused, facts/metrics intact; rewrite to emphasize what matters for this JD.
- Projects: keep the 4-5 most relevant to this JD, each with one substantive bullet.
- "title" should be the candidate headline aligned to the target role (e.g. "Technical Project Manager").
- "tailoringNotes": 3-5 short bullets explaining what you emphasized for THIS job (for the candidate's eyes only; not printed on the resume).
Return strictly the JSON schema provided.`;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

function jobToJD(job: Job): string {
  return [
    `ROLE: ${job.title}`,
    `COMPANY: ${job.company}`,
    `LOCATION: ${job.location || "—"}`,
    `SENIORITY: ${job.seniority || "—"}`,
    `FUNCTION: ${job.jobFunction || "—"}`,
    `INDUSTRIES: ${job.industries || "—"}`,
    ``,
    `JOB DESCRIPTION:`,
    (job.description || "").slice(0, 6000) || "(no description provided)",
  ].join("\n");
}

export async function tailorResume(job: Job): Promise<TailoredResume> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set in .env");
  }

  const userContent = [
    `MASTER RESUME (ground truth — do not invent anything beyond these facts):`,
    masterResumeText(),
    ``,
    `TARGET JOB:`,
    jobToJD(job),
    ``,
    `Produce the tailored resume now as JSON matching the schema.`,
  ].join("\n");

  const resp: any = await (client.messages.create as any)({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: userContent }],
    output_config: {
      format: { type: "json_schema", schema: RESUME_SCHEMA },
    },
  });

  const textBlock = (resp.content || []).find((b: any) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error(`No text content returned (stop_reason: ${resp.stop_reason})`);
  }
  return JSON.parse(textBlock.text) as TailoredResume;
}
