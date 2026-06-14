/**
 * Render a TailoredResume to a SINGLE-PAGE, ATS-friendly PDF via pdfkit.
 *
 * Strategy: render at a scale factor, measure page count, and shrink the scale
 * until everything fits on one A4 page. buildResumePdfBuffer() returns the first
 * single-page result (or the most compact attempt as a fallback).
 */
import PDFDocument from "pdfkit";
import { TailoredResume } from "../tailor";

const INK = "#1a1a1a";
const SUB = "#444444";
const MUTE = "#6b7280";
const ACCENT = "#1d4ed8";

function render(doc: PDFKit.PDFDocument, r: TailoredResume, s: number) {
  const ML = doc.page.margins.left;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const fs = (n: number) => n * s; // scaled font size

  const heading = (t: string) => {
    doc.moveDown(0.45);
    doc.font("Helvetica-Bold").fontSize(fs(10.5)).fillColor(ACCENT).text(t.toUpperCase(), { characterSpacing: 0.5 });
    doc
      .strokeColor("#dbeafe").lineWidth(0.8)
      .moveTo(ML, doc.y + 1).lineTo(doc.page.width - doc.page.margins.right, doc.y + 1).stroke();
    doc.moveDown(0.4);
  };

  const bullets = (items: string[]) => {
    doc.font("Helvetica").fontSize(fs(9)).fillColor(INK);
    for (const b of items) {
      const top = doc.y;
      doc.text("•", ML + 2, top, { width: fs(10) });
      doc.text(b, ML + fs(13), top, { width: W - fs(13), align: "left", lineGap: 0.5 * s });
      doc.moveDown(0.15);
    }
  };

  const dateRight = (dates: string, top: number, size: number) =>
    doc.font("Helvetica-Oblique").fontSize(size).fillColor(MUTE).text(dates, ML, top, { width: W, align: "right" });

  // Header
  doc.font("Helvetica-Bold").fontSize(fs(19)).fillColor(INK).text(r.name.toUpperCase());
  doc.moveDown(0.1);
  doc.font("Helvetica").fontSize(fs(10.5)).fillColor(SUB).text(r.title);
  doc.moveDown(0.15);
  const c = r.contact;
  doc.font("Helvetica").fontSize(fs(8.3)).fillColor(MUTE)
    .text([c.location, c.phone, c.email, c.linkedin, c.portfolio].filter(Boolean).join("   |   "));
  doc.moveDown(0.2);
  doc.strokeColor("#e5e7eb").lineWidth(0.8).moveTo(ML, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();

  // Summary
  heading("Professional Summary");
  doc.font("Helvetica").fontSize(fs(9)).fillColor(INK).text(r.summary, { align: "justify", lineGap: 1 * s });

  // Core skills
  heading("Core Skills");
  doc.font("Helvetica").fontSize(fs(9)).fillColor(INK).text(r.coreSkills.join("   •   "), { lineGap: 1.5 * s });

  // Experience
  heading("Professional Experience");
  for (const e of r.experience) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(fs(10)).fillColor(INK).text(e.company);
    dateRight(e.dates, top, fs(8.3));
    doc.font("Helvetica-Oblique").fontSize(fs(9)).fillColor(SUB).text(`${e.role}${e.location ? " — " + e.location : ""}`);
    doc.moveDown(0.2);
    bullets(e.bullets);
    doc.moveDown(0.15);
  }

  // Projects
  heading("Key Projects");
  for (const p of r.projects) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(fs(9.5)).fillColor(INK).text(p.name);
    dateRight(p.dates, top, fs(8.3));
    if (p.stack) doc.font("Helvetica-Oblique").fontSize(fs(8.3)).fillColor(SUB).text(p.stack);
    doc.moveDown(0.15);
    bullets(p.bullets);
    doc.moveDown(0.1);
  }

  // Education
  heading("Education");
  for (const ed of r.education) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(fs(9.5)).fillColor(INK).text(ed.institution);
    dateRight(ed.dates, top, fs(8.3));
    doc.font("Helvetica").fontSize(fs(9)).fillColor(SUB).text(ed.degree);
  }
}

function attempt(r: TailoredResume, s: number): Promise<{ buf: Buffer; pages: number }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 40, bottom: 38, left: 50, right: 50 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    let pages = 1;
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve({ buf: Buffer.concat(chunks), pages }));
    doc.on("error", reject);
    try {
      render(doc, r, s);
      pages = doc.bufferedPageRange().count;
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

/** Build a single-page PDF, shrinking the scale until it fits. */
export async function buildResumePdfBuffer(r: TailoredResume): Promise<Buffer> {
  const scales = [1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68];
  let last: Buffer | null = null;
  for (const s of scales) {
    const { buf, pages } = await attempt(r, s);
    last = buf;
    if (pages === 1) return buf;
  }
  return last!; // most compact attempt as a fallback
}
