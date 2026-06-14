/**
 * Render a TailoredResume to a clean, ATS-friendly one/two-page PDF via pdfkit.
 */
import PDFDocument from "pdfkit";
import { TailoredResume } from "../tailor";

const INK = "#1a1a1a";
const SUB = "#444444";
const MUTE = "#6b7280";
const ACCENT = "#1d4ed8";

export function buildResumePdf(r: TailoredResume): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 46, bottom: 46, left: 52, right: 52 },
  });

  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const rule = () => {
    doc.moveDown(0.35);
    const y = doc.y;
    doc
      .strokeColor("#e5e7eb")
      .lineWidth(1)
      .moveTo(doc.page.margins.left, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .stroke();
    doc.moveDown(0.45);
  };

  const heading = (t: string) => {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(ACCENT).text(t.toUpperCase(), {
      characterSpacing: 0.6,
    });
    doc
      .strokeColor("#dbeafe")
      .lineWidth(1)
      .moveTo(doc.page.margins.left, doc.y + 2)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
      .stroke();
    doc.moveDown(0.45);
  };

  const bullets = (items: string[]) => {
    doc.font("Helvetica").fontSize(9).fillColor(INK);
    for (const b of items) {
      const x = doc.page.margins.left;
      const top = doc.y;
      doc.text("•", x + 2, top, { width: 10 });
      doc.text(b, x + 14, top, { width: W - 14, align: "left", lineGap: 1 });
      doc.moveDown(0.2);
    }
  };

  // ---- Header ----
  doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text(r.name.toUpperCase());
  doc.moveDown(0.15);
  doc.font("Helvetica").fontSize(11).fillColor(SUB).text(r.title);
  doc.moveDown(0.2);
  const c = r.contact;
  const contact = [c.location, c.phone, c.email, c.linkedin, c.portfolio].filter(Boolean).join("   |   ");
  doc.font("Helvetica").fontSize(8.5).fillColor(MUTE).text(contact);
  rule();

  // ---- Summary ----
  heading("Professional Summary");
  doc.font("Helvetica").fontSize(9).fillColor(INK).text(r.summary, { align: "justify", lineGap: 1.5 });

  // ---- Core skills ----
  heading("Core Skills");
  doc.font("Helvetica").fontSize(9).fillColor(INK).text(r.coreSkills.join("   •   "), { lineGap: 2 });

  // ---- Experience ----
  heading("Professional Experience");
  for (const e of r.experience) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(`${e.company}`, { continued: false });
    // dates right-aligned on the same baseline
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTE).text(e.dates, doc.page.margins.left, top, {
      width: W,
      align: "right",
    });
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(SUB).text(`${e.role}${e.location ? " — " + e.location : ""}`);
    doc.moveDown(0.25);
    bullets(e.bullets);
    doc.moveDown(0.25);
  }

  // ---- Projects ----
  heading("Key Projects");
  for (const p of r.projects) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(p.name);
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTE).text(p.dates, doc.page.margins.left, top, {
      width: W,
      align: "right",
    });
    if (p.stack) doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(SUB).text(p.stack);
    doc.moveDown(0.2);
    bullets(p.bullets);
    doc.moveDown(0.2);
  }

  // ---- Education ----
  heading("Education");
  for (const ed of r.education) {
    const top = doc.y;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(INK).text(ed.institution);
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(MUTE).text(ed.dates, doc.page.margins.left, top, {
      width: W,
      align: "right",
    });
    doc.font("Helvetica").fontSize(9).fillColor(SUB).text(ed.degree);
  }

  return doc;
}
