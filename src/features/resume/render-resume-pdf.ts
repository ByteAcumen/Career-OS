import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type { ResumeDraft } from "@/features/resume/build-resume";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 48;
const SECTION_SPACING = 18;
const BODY_COLOR = rgb(0.12, 0.12, 0.12);
const MUTED_COLOR = rgb(0.38, 0.38, 0.38);
const ACCENT_COLOR = rgb(0.08, 0.08, 0.08);

type PdfCursor = {
  doc: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

export async function renderResumePdf(resume: ResumeDraft) {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cursor = createCursor(pdfDoc, regular, bold);
  drawHeader(cursor, resume);
  addGap(cursor, 12);

  if (resume.header.education) {
    drawSectionTitle(cursor, "Education");
    drawParagraph(cursor, resume.header.education, {
      size: 10.5,
      color: BODY_COLOR,
    });
  }

  drawSectionTitle(cursor, "Summary");
  drawBulletList(cursor, resume.summaryBullets);

  drawSectionTitle(cursor, "Projects");
  for (const project of resume.projectHighlights) {
    ensureSpace(cursor, 72);
    drawParagraph(cursor, project.title, {
      size: 12,
      font: cursor.bold,
      color: ACCENT_COLOR,
    });
    drawParagraph(cursor, project.subtitle, {
      size: 10.5,
      color: MUTED_COLOR,
      lineHeight: 13,
    });
    if (project.link) {
      drawParagraph(cursor, project.link, {
        size: 9.5,
        color: MUTED_COLOR,
        lineHeight: 12,
      });
    }
    drawBulletList(cursor, project.bullets, { compact: true });
    addGap(cursor, 6);
  }

  drawSectionTitle(cursor, "Problem Solving");
  drawBulletList(cursor, resume.problemSolvingHighlights);

  if (resume.skills.length) {
    drawSectionTitle(cursor, "Technical Skills");
    for (const group of resume.skills) {
      drawParagraph(cursor, `${group.label}: ${group.items.join(", ")}`, {
        size: 10,
        lineHeight: 12.5,
        color: BODY_COLOR,
      });
      addGap(cursor, 2);
    }
  }

  return pdfDoc.save();
}

function createCursor(doc: PDFDocument, regular: PDFFont, bold: PDFFont): PdfCursor {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return {
    doc,
    page,
    regular,
    bold,
    y: PAGE_HEIGHT - MARGIN_TOP,
  };
}

function drawHeader(cursor: PdfCursor, resume: ResumeDraft) {
  const name = sanitizePdfText(resume.header.name);
  const title = sanitizePdfText(resume.header.title);
  const email = sanitizePdfText(resume.header.email);
  const education = resume.header.education ? sanitizePdfText(resume.header.education) : null;
  const links = resume.header.links.map((link) => `${link.label}: ${link.url}`).join("   ");

  drawParagraph(cursor, name, {
    size: 21,
    font: cursor.bold,
    lineHeight: 24,
    color: ACCENT_COLOR,
  });
  drawParagraph(cursor, title, {
    size: 11.5,
    lineHeight: 14,
    color: MUTED_COLOR,
  });
  drawParagraph(cursor, email, {
    size: 10.5,
    lineHeight: 13,
    color: BODY_COLOR,
  });

  if (education) {
    drawParagraph(cursor, education, {
      size: 10,
      lineHeight: 12,
      color: MUTED_COLOR,
    });
  }

  if (links) {
    drawParagraph(cursor, sanitizePdfText(links), {
      size: 9.5,
      lineHeight: 12,
      color: MUTED_COLOR,
    });
  }
}

function drawSectionTitle(cursor: PdfCursor, title: string) {
  ensureSpace(cursor, 28);
  addGap(cursor, SECTION_SPACING);
  drawParagraph(cursor, title.toUpperCase(), {
    size: 9,
    font: cursor.bold,
    lineHeight: 11,
    color: MUTED_COLOR,
    letterSpacing: 1.3,
  });
  addGap(cursor, 4);
}

function drawBulletList(
  cursor: PdfCursor,
  items: string[],
  options?: { compact?: boolean },
) {
  const fontSize = options?.compact ? 10 : 10.5;
  const lineHeight = options?.compact ? 12.5 : 13.5;
  const bulletIndent = 10;
  const textWidth = PAGE_WIDTH - MARGIN_X * 2 - bulletIndent;

  for (const item of items) {
    const lines = wrapText(cursor.regular, sanitizePdfText(item), fontSize, textWidth);
    const blockHeight = Math.max(lineHeight, lines.length * lineHeight);
    ensureSpace(cursor, blockHeight + 2);

    const startY = cursor.y;
    cursor.page.drawText("-", {
      x: MARGIN_X,
      y: startY,
      size: fontSize,
      font: cursor.bold,
      color: BODY_COLOR,
    });

    let lineY = startY;
    for (const line of lines) {
      cursor.page.drawText(line, {
        x: MARGIN_X + bulletIndent,
        y: lineY,
        size: fontSize,
        font: cursor.regular,
        color: BODY_COLOR,
      });
      lineY -= lineHeight;
    }

    cursor.y = startY - blockHeight - 2;
  }
}

function drawParagraph(
  cursor: PdfCursor,
  text: string,
  options?: {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    lineHeight?: number;
    letterSpacing?: number;
  },
) {
  const font = options?.font ?? cursor.regular;
  const size = options?.size ?? 11;
  const lineHeight = options?.lineHeight ?? size + 2.5;
  const color = options?.color ?? BODY_COLOR;
  const spacingWidth = Math.max(0, options?.letterSpacing ?? 0) * 2;
  const lines = wrapText(
    font,
    sanitizePdfText(text),
    size,
    PAGE_WIDTH - MARGIN_X * 2 - spacingWidth,
  );

  ensureSpace(cursor, lines.length * lineHeight + 2);
  for (const line of lines) {
    cursor.page.drawText(line, {
      x: MARGIN_X,
      y: cursor.y,
      size,
      font,
      color,
    });
    cursor.y -= lineHeight;
  }
}

function addGap(cursor: PdfCursor, size: number) {
  cursor.y -= size;
}

function ensureSpace(cursor: PdfCursor, heightNeeded: number) {
  if (cursor.y - heightNeeded >= MARGIN_BOTTOM) {
    return;
  }

  cursor.page = cursor.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cursor.y = PAGE_HEIGHT - MARGIN_TOP;
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  if (words.length === 1 && font.widthOfTextAtSize(words[0], size) > maxWidth) {
    return splitLongWord(font, words[0], size, maxWidth);
  }

  const lines: string[] = [];
  let current = words[0] ?? "";

  for (let index = 1; index < words.length; index += 1) {
    const word = words[index];
    const candidate = `${current} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      lines.push(current);
      const split = splitLongWord(font, word, size, maxWidth);
      lines.push(...split.slice(0, -1));
      current = split.at(-1) ?? "";
      continue;
    }

    lines.push(current);
    current = word;
  }

  if (current) {
    if (font.widthOfTextAtSize(current, size) > maxWidth) {
      lines.push(...splitLongWord(font, current, size, maxWidth));
    } else {
      lines.push(current);
    }
  }

  return lines;
}

function splitLongWord(font: PDFFont, value: string, size: number, maxWidth: number) {
  const segments: string[] = [];
  let current = "";

  for (const char of value) {
    const candidate = `${current}${char}`;
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    segments.push(current);
    current = char;
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

function sanitizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
