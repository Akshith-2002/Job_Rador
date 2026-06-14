/**
 * Render a TailoredResume to ONE FULL A4 page via pdfkit.
 *
 * Two-step fit:
 *   1. Pick the largest scale at which the content still fits on a single page.
 *   2. Vertically justify — distribute the leftover space across section gaps so
 *      the content fills the page top-to-bottom (a complete one-page resume, not
 *      a shrunken half-empty one).
 */
import PDFDocument from "pdfkit";
import { TailoredResume } from "../tailor";

const INK = "#1a1a1a";
const SUB = "#444444";
const MUTE = "#6b7280";
const ACCENT = "#1d4ed8";

const PAGE_H = 841.89; // A4 height in pt
const M_TOP = 42;
const M_BOTTOM = 42;
const M_SIDE = 50;
const USABLE_BOTTOM = PAGE_H - M_BOTTOM;
const SECTIONS = 5; // summary, skills, experience, projects, education

function render(doc: PDFKit.PDFDocument, r: TailoredResume, s: number, gap: number) {
  const ML = doc.page.margins.left;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const fs = (n: number) => n * s;

  const heading = (t: string) => {
    doc.moveDown(0.4);
    if (gap > 0) doc.y += gap; // vertical-fill spacer
    doc.font("Helvetica-Bold").fontSize(fs(11)).fillColor(ACCENT).text(t.toUpperCase(), { characterSpacing: 0.5 });
    doc
      .strokeColor("#dbeafe").lineWidth(0.8)
      .moveTo(ML, doc.y + 1).lineTo(doc.page.width - doc.page.margins.right, doc.y + 1).stroke();
    doc.moveDown(0.4);
  };

  const bullets = (items: string[]) => {
    doc.font("Helvetica").fontSize(fs(9.3)).fillColor(INK);
    for (const b of items) {
      const top = doc.y;
      doc.text("•", ML + 2, top, { width: fs(10) });
      doc.text(b, ML + fs(13), top, { width: W - fs(13), align: "left", lineGap: 0.5 * s });
      doc.moveDown(0.2);
    }
  };

  const dateRight = (dates: string, top: number, size: number) =>
    doc.font("Helvetica-Oblique").fontSize(size).fillColor(MUTE).text(dates, ML, top, { width: W, align: "right" });

  // Header
  doc.font("Helvetica-Bold").fontSize(fs(20)).fillColor(INK).text(r.name.toUpperCase());
  doc.moveDown(0.1);
  doc.font("Helvetica").fontSize(fs(11)).fillColor(SUB).text(r.title);
  doc.moveDown(0.15);
  const c = r.contact;
  doc.font("Helvetica").fontSize(fs(8.5)).fillColor(MUTE)
    .text([c.location, c.phone, c.email, c.linkedin, c.portfolio].filter(Boolean).join("   |   "));
  doc.moveDown(0.2);
  doc.strokeColor("#e5e7eb").lineWidth(0.8).moveTo(ML, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();

  heading("Professional Summary");
  doc.font("Helvetica").fontSize(fs(9.3)).fillColor(INK).text(r.summary, { align: "justify", lineGap: 1 * s });

  heading("Core Skills");
  doc.font("Helvetica").fontSize(fs(9.3)).fillColor(INK).text(r.coreSkills.join("   •   "), { lineGap: 2 * s });

  heading("Professional Experience");
  for (const e of r.experience) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(fs(10.2)).fillColor(INK).text(e.company);
    dateRight(e.dates, top, fs(8.5));
    doc.font("Helvetica-Oblique").fontSize(fs(9.2)).fillColor(SUB).text(`${e.role}${e.location ? " — " + e.location : ""}`);
    doc.moveDown(0.2);
    bullets(e.bullets);
    doc.moveDown(0.2);
  }

  heading("Key Projects");
  for (const p of r.projects) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(fs(9.6)).fillColor(INK).text(p.name);
    dateRight(p.dates, top, fs(8.5));
    if (p.stack) doc.font("Helvetica-Oblique").fontSize(fs(8.5)).fillColor(SUB).text(p.stack);
    doc.moveDown(0.15);
    bullets(p.bullets);
    doc.moveDown(0.15);
  }

  heading("Education");
  for (const ed of r.education) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(fs(9.6)).fillColor(INK).text(ed.institution);
    dateRight(ed.dates, top, fs(8.5));
    doc.font("Helvetica").fontSize(fs(9.3)).fillColor(SUB).text(ed.degree);
  }
}

function attempt(
  r: TailoredResume,
  s: number,
  gap: number
): Promise<{ buf: Buffer; pages: number; bottomY: number }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: M_TOP, bottom: M_BOTTOM, left: M_SIDE, right: M_SIDE },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    let pages = 1;
    let bottomY = 0;
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve({ buf: Buffer.concat(chunks), pages, bottomY }));
    doc.on("error", reject);
    try {
      render(doc, r, s, gap);
      pages = doc.bufferedPageRange().count;
      bottomY = doc.y;
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/** Build a single, full A4 page: largest scale that fits, then vertically justified. */
export async function buildResumePdfBuffer(r: TailoredResume): Promise<Buffer> {
  const scales = [1.08, 1.04, 1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68];

  // Step 1 — largest scale that fits on one page (no extra gaps yet).
  let chosen: { s: number; bottomY: number; buf: Buffer } | null = null;
  for (const s of scales) {
    const a = await attempt(r, s, 0);
    if (a.pages === 1) {
      chosen = { s, bottomY: a.bottomY, buf: a.buf };
      break;
    }
    chosen = { s, bottomY: a.bottomY, buf: a.buf }; // remember smallest as fallback
  }
  if (!chosen) return (await attempt(r, 0.68, 0)).buf;

  // Step 2 — fill remaining vertical space across section gaps.
  const leftover = USABLE_BOTTOM - chosen.bottomY;
  if (leftover <= 14) return chosen.buf; // already a full page

  let perGap = (leftover * 0.9) / SECTIONS;
  perGap = Math.min(perGap, 40); // keep gaps natural for sparse content
  const filled = await attempt(r, chosen.s, perGap);
  return filled.pages === 1 ? filled.buf : chosen.buf;
}
