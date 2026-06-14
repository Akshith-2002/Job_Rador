/**
 * Akshith's master resume — the single source of truth.
 * The tailoring model may reorder, reword, and emphasize these facts to match a
 * job description, but must NOT invent anything beyond what's here.
 */

export const MASTER_RESUME = {
  name: "Akshith Kumar Y V",
  headline: "Technical Business Analyst · Project Manager · AI & Automation",
  contact: {
    location: "Bengaluru, India",
    phone: "+91 9019533772",
    email: "akshithy888@gmail.com",
    linkedin: "linkedin.com/in/akshithyv",
    portfolio: "akshith-2002.github.io/Resume",
  },
  summary:
    "Technical Business Analyst & Project Manager (2+ yrs) bridging business and engineering. Translate ambiguous business and system-integration requirements into BRDs, FRDs, FSDs, and sprint-ready user stories, then run delivery end-to-end as client-facing PM across SaaS engagements. Strong in gap analysis, API testing, and Agile/Scrum, with hands-on data skills (SQL, BigQuery, Snowflake, Power BI). Led a 9-person team, shipped 10+ initiatives across 5+ domains, and won HackAtion 2025.",
  skillGroups: [
    {
      label: "Requirements & Specs",
      items: [
        "BRD", "FRD", "FSD", "Solution Documents", "User Stories", "Acceptance Criteria",
        "Use Cases", "Process Flows / Flowcharts", "As-Is / To-Be", "Gap Analysis",
        "Data Contracts", "Sign-off",
      ],
    },
    {
      label: "Project Management",
      items: [
        "Agile", "Scrum", "Sprint Planning", "JIRA", "Confluence",
        "Backlog & Change Request Management", "Dependency Tracking",
        "Stakeholder Management", "Client Communication", "UAT",
      ],
    },
    {
      label: "Product & Integration",
      items: [
        "SaaS", "APIs", "Web Services", "System Integration", "API Testing",
        "Dev & QA Collaboration", "Product Development Lifecycle",
      ],
    },
    {
      label: "Data & BI",
      items: [
        "SQL", "Snowflake", "BigQuery", "ETL / ELT", "Data Pipelines",
        "Database Optimization", "API Integration", "Power BI", "Tableau",
        "Excel & Google Sheets", "Product Analytics",
      ],
    },
    {
      label: "Marketing & AI",
      items: [
        "Google Ads", "Meta Ads", "GTM", "Google Analytics 4", "Attribution Modeling",
        "A/B Testing", "n8n", "AI Workflow Design", "Prompt Engineering", "GPT Agents",
        "Telegram Bots",
      ],
    },
  ],
  experience: [
    {
      company: "Antino Labs",
      role: "Business Analyst & Project Manager",
      location: "Bangalore, India",
      dates: "April 2024 – Present",
      bullets: [
        "Client-facing BA & PM across multiple SaaS engagements — gather and document business and system-integration requirements into BRDs, FRDs, and FSDs, securing stakeholder sign-off before development.",
        "Perform gap analysis between client systems and APIs, test API responses, and translate findings into solution documents and integration specs with flowchart diagrams.",
        "Authored enterprise-level documentation (as-is / to-be flows, use cases, acceptance criteria) for 10+ initiatives across 5+ domains (EV mobility, sustainability, EdTech, IoT, travel); managed client change requests to delivery.",
        "Led a 9-person cross-functional team on StackD Smart Vending, an AI + IoT SaaS platform with predictive restocking and anomaly detection; ran Agile cadence and reduced stock-outs by ~30%.",
        "Defined API integration / data-contract specs unifying Google Ads, Meta Ads, and GTM into BigQuery; built SQL pipelines on Snowflake / BigQuery, cutting weekly reporting effort by ~8 hrs/week.",
        "Ran Agile/Scrum delivery as client-facing PM — owned scope, sprint rituals, backlog, dependency tracking, and weekly stakeholder status; coordinated Dev and QA through feature releases and UAT.",
      ],
    },
  ],
  projects: [
    {
      name: "StackD Smart Vending — AI + IoT Ops Platform",
      stack: "Python AI, n8n, Tableau",
      dates: "2024 – 2025",
      bullets: [
        "Led 9-person team through full delivery cycle (discovery → UAT → launch) across hardware, backend, and BI; owned acceptance criteria for predictive restocking, anomaly detection, and remote-monitoring dashboards.",
      ],
    },
    {
      name: "Rayna Tours — Marketing & Ops Automation",
      stack: "BigQuery, GTM, Power BI, n8n",
      dates: "2024 – Present",
      bullets: [
        "Architected visa-processing automation enabling up to 4,000 applications/day; specified data contracts unifying Google + Meta Ads + GTM into BigQuery with Power BI dashboards for real-time ROI.",
      ],
    },
    {
      name: "HackAtion 2025 — AI Agents Assembly (Winner)",
      stack: "n8n, Telegram, GPT",
      dates: "2025",
      bullets: [
        "Won AI Agents track with an EV-charging assistant handling slot booking, payment flows, and live availability via n8n + Telegram bot + GPT.",
      ],
    },
    {
      name: "BLive EZY — EV Fleet Management Platform",
      stack: "Figma, GitHub, SQL, Excel",
      dates: "2024 – 2025",
      bullets: [
        "Owned BA + PM delivery of an EV rental and fleet-operations platform; defined workflows, requirements, and reporting specs and ran sprints from discovery through launch.",
      ],
    },
    {
      name: "Open Credits — AI-Assisted EdTech Platform",
      stack: "SQL, n8n, AI-assisted dev",
      dates: "2024 – 2025",
      bullets: [
        "Owned end-to-end product delivery as PM; built the platform with analytics pipelines, automation workflows, and event-tracking specs for engagement and course-performance reporting.",
      ],
    },
  ],
  education: [
    {
      institution: "KL University",
      degree: "Bachelor of Business Administration (BBA) in Analytics",
      dates: "2021 – 2024",
    },
  ],
};

/** Flatten the master resume into plain text for the tailoring prompt. */
export function masterResumeText(): string {
  const m = MASTER_RESUME;
  const lines: string[] = [];
  lines.push(`NAME: ${m.name}`);
  lines.push(`HEADLINE: ${m.headline}`);
  lines.push(
    `CONTACT: ${m.contact.location} | ${m.contact.phone} | ${m.contact.email} | ${m.contact.linkedin} | ${m.contact.portfolio}`
  );
  lines.push(`\nSUMMARY:\n${m.summary}`);
  lines.push(`\nCORE SKILLS:`);
  for (const g of m.skillGroups) lines.push(`  ${g.label}: ${g.items.join(", ")}`);
  lines.push(`\nEXPERIENCE:`);
  for (const e of m.experience) {
    lines.push(`  ${e.role} — ${e.company} (${e.location}) | ${e.dates}`);
    for (const b of e.bullets) lines.push(`    - ${b}`);
  }
  lines.push(`\nKEY PROJECTS:`);
  for (const p of m.projects) {
    lines.push(`  ${p.name} · ${p.stack} | ${p.dates}`);
    for (const b of p.bullets) lines.push(`    - ${b}`);
  }
  lines.push(`\nEDUCATION:`);
  for (const ed of m.education) lines.push(`  ${ed.degree} — ${ed.institution} | ${ed.dates}`);
  return lines.join("\n");
}
