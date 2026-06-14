# Job Radar 🛰️

Scrapes **LinkedIn jobs** (Technical Business Analyst & Technical Project Manager, India, last 7 days)
via **Apify**, scores each posting against Akshith's resume, stores everything in **Postgres via TypeORM**,
and serves a **web dashboard** to browse, filter, and apply.

## Stack
- **Apify** — `curious_coder/linkedin-jobs-scraper` (run via the Apify API / MCP)
- **TypeScript + TypeORM + Postgres** — typed storage
- **Express** — JSON API + static dashboard
- **Tailwind (CDN) + vanilla JS** — zero-build UI

## Setup

```bash
npm install
```

Make sure Postgres is running and the DB exists (already created):

```bash
createdb job_scrapper   # if not present
```

Config lives in `.env` (`APIFY_TOKEN`, `PG*`, `SEARCH_TITLES`, etc.).

## Commands

| Command | What it does |
|---|---|
| `npm run scrape`  | Run the Apify actor → save raw jobs to `data/jobs.json` |
| `npm run ingest`  | Normalize + score + load into Postgres, flag top 10 |
| `npm run refresh` | `scrape` then `ingest` |
| `npm start`       | Launch dashboard at http://localhost:4000 |

## Tailored resumes (per job)

Each job has a **✨ Tailor** button in the dashboard. It calls the **Claude API**
(`src/tailor.ts`, model `claude-opus-4-8` by default) to rewrite Akshith's master
resume (`src/masterResume.ts`) against that job's description — reordering skills,
rewriting the summary, mirroring JD keywords for ATS — without inventing any facts.

The result is stored on the job row (`tailoredResume` JSONB, cached) and rendered
to **PDF** (`src/render/resumePdf.ts`) and **DOCX** (`src/render/resumeDocx.ts`) for download.

Requires `ANTHROPIC_API_KEY` in `.env`. Set `RESUME_MODEL=claude-sonnet-4-6` to cut cost.

Endpoints: `POST /api/jobs/:id/tailor` · `GET /api/jobs/:id/resume.pdf` · `GET /api/jobs/:id/resume.docx`

## How fit scoring works
`src/scoring.ts` produces a **1–10** score from:
title relevance, seniority fit (~2 yrs), resume skill overlap, domain/IT fit,
**company size 50–5000**, recency, and location (Bengaluru/remote bonus).
Each job stores human-readable `matchReasons` (visible by clicking a row).

**Top picks ("apply today")** = the 10 highest-fit jobs at companies with **50–5000 employees**.

## Data model
One `jobs` table (`src/entity/Job.ts`) with normalized columns + a `raw` JSONB of the full Apify item.
