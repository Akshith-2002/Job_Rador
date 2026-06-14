/**
 * Render a TailoredResume to an ATS-friendly .docx via the `docx` library.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopType,
} from "docx";
import { TailoredResume } from "../tailor";

const ACCENT = "1D4ED8";
const INK = "1A1A1A";
const SUB = "444444";
const MUTE = "6B7280";

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    border: { bottom: { color: "DBEAFE", space: 1, style: BorderStyle.SINGLE, size: 6 } },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, color: ACCENT, size: 21, characterSpacing: 8 }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 19, color: INK })],
  });
}

/** A line with left text and right-aligned dates using a right tab stop. */
function titleDateLine(left: TextRun[], dates: string): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: 9700 }],
    spacing: { after: 20 },
    children: [...left, new TextRun({ text: `\t${dates}`, italics: true, color: MUTE, size: 17 })],
  });
}

export async function buildResumeDocx(r: TailoredResume): Promise<Buffer> {
  const c = r.contact;
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: r.name.toUpperCase(), bold: true, size: 40, color: INK })],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: r.title, size: 22, color: SUB })],
    })
  );
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      border: { bottom: { color: "E5E7EB", space: 1, style: BorderStyle.SINGLE, size: 6 } },
      children: [
        new TextRun({
          text: [c.location, c.phone, c.email, c.linkedin, c.portfolio].filter(Boolean).join("  |  "),
          size: 17,
          color: MUTE,
        }),
      ],
    })
  );

  // Summary
  children.push(sectionHeading("Professional Summary"));
  children.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 60 },
      children: [new TextRun({ text: r.summary, size: 19, color: INK })],
    })
  );

  // Core skills
  children.push(sectionHeading("Core Skills"));
  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: r.coreSkills.join("  •  "), size: 19, color: INK })],
    })
  );

  // Experience
  children.push(sectionHeading("Professional Experience"));
  for (const e of r.experience) {
    children.push(titleDateLine([new TextRun({ text: e.company, bold: true, size: 20, color: INK })], e.dates));
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: `${e.role}${e.location ? " — " + e.location : ""}`, italics: true, size: 18, color: SUB }),
        ],
      })
    );
    for (const b of e.bullets) children.push(bullet(b));
  }

  // Projects
  children.push(sectionHeading("Key Projects"));
  for (const p of r.projects) {
    children.push(titleDateLine([new TextRun({ text: p.name, bold: true, size: 19, color: INK })], p.dates));
    if (p.stack)
      children.push(
        new Paragraph({
          spacing: { after: 30 },
          children: [new TextRun({ text: p.stack, italics: true, size: 17, color: SUB })],
        })
      );
    for (const b of p.bullets) children.push(bullet(b));
  }

  // Education
  children.push(sectionHeading("Education"));
  for (const ed of r.education) {
    children.push(titleDateLine([new TextRun({ text: ed.institution, bold: true, size: 19, color: INK })], ed.dates));
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: ed.degree, size: 18, color: SUB })],
      })
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }],
  });

  return Packer.toBuffer(doc);
}
