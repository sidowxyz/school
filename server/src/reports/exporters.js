import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

import SystemSetting from '../models/SystemSetting.js';

// Every report resolves to the same { columns, rows, summary } shape, so one
// exporter per format handles the entire catalogue — no per-report code.

// Fallback identity — used when SystemSetting hasn't been seeded, or the read
// fails, so an export always has a header even before setup.
const DEFAULT_IDENTITY = {
  schoolName: 'School Management System',
  address: '',
  schoolEmail: '',
  schoolPhone: '',
  website: '',
  primary: '#1E3A8A',
  secondary: '#10B981',
  logoPath: null
};

const LIGHTEN = {
  headerBand: '#f4f6fb',
  altRow: '#fbfbfd',
  divider: '#e5e7eb',
  muted: '#6b7280',
  ink: '#1f2937'
};

/**
 * Find the on-disk path for the school logo, checking (in order):
 *   server/uploads/... (production upload target)
 *   client/public/... (dev fallback, since seeded data points at that path)
 *   client/public/logo.png (final fallback used by the sidebar)
 * Returns null when nothing usable exists — the header falls back to a
 * text-only bar in that case.
 */
const resolveLogoPath = (logoUrl) => {
  const cwd = process.cwd();
  const clientPublic = path.resolve(cwd, '..', 'client', 'public');
  const serverRoot = cwd;
  const candidates = [];
  if (logoUrl && typeof logoUrl === 'string') {
    const trimmed = logoUrl.replace(/^\/+/, '');
    candidates.push(path.join(serverRoot, trimmed));
    candidates.push(path.join(clientPublic, trimmed));
  }
  candidates.push(path.join(clientPublic, 'logo.png'));
  candidates.push(path.join(serverRoot, 'uploads', 'branding', 'logo.png'));
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // ignore — try the next candidate
    }
  }
  return null;
};

/**
 * Fetch the school identity used in report headers. Cached inside a module
 * local so back-to-back exports don't each hit the DB.
 */
let cachedIdentity = null;
let cachedAt = 0;
const IDENTITY_TTL_MS = 60_000;

const loadIdentity = async () => {
  if (cachedIdentity && Date.now() - cachedAt < IDENTITY_TTL_MS) return cachedIdentity;
  try {
    const settings = await SystemSetting.findOne().lean();
    if (!settings) {
      cachedIdentity = { ...DEFAULT_IDENTITY, logoPath: resolveLogoPath(null) };
    } else {
      cachedIdentity = {
        schoolName: settings.schoolName || DEFAULT_IDENTITY.schoolName,
        address: settings.address || '',
        schoolEmail: settings.schoolEmail || '',
        schoolPhone: settings.schoolPhone || '',
        website: settings.website || '',
        primary: settings.brandingColors?.primary || DEFAULT_IDENTITY.primary,
        secondary: settings.brandingColors?.secondary || DEFAULT_IDENTITY.secondary,
        logoPath: resolveLogoPath(settings.logoUrl)
      };
    }
    cachedAt = Date.now();
  } catch {
    cachedIdentity = { ...DEFAULT_IDENTITY, logoPath: resolveLogoPath(null) };
    cachedAt = Date.now();
  }
  return cachedIdentity;
};

/**
 * Format a cell value for PDF/CSV text output. Excel gets typed values
 * directly (formatted by cell numFmt), so this only runs for the PDF path.
 */
const formatCell = (value, columnType) => {
  if (value === null || value === undefined || value === '') return '';
  if (columnType === 'money') {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (columnType === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString() : String(value);
  }
  if (columnType === 'date') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  return String(value);
};

/**
 * Slug the report id/title into a safe filename stem for Content-Disposition.
 */
export const filenameStem = (report) => {
  const base = String(report.id || report.title || 'report');
  return base.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
};

// ---------- Excel ----------

/**
 * Write the report to `res` as a polished .xlsx file. Two-row branded title
 * block, coloured header band, banded rows, currency/date number formats,
 * frozen header, and a right-aligned summary card block below the table.
 */
export const streamExcel = async (res, report) => {
  const identity = await loadIdentity();
  const filename = `${filenameStem(report)}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // In-memory workbook rather than the streaming writer, because the streaming
  // writer commits rows top-down and would freeze the "school name banner"
  // before we know how many columns to merge across.
  const workbook = new ExcelJS.Workbook();
  workbook.creator = identity.schoolName;
  workbook.created = new Date();

  const sheetName = String(report.title || 'Report').replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const columns = report.columns ?? [];
  const rows = report.rows ?? [];
  const columnCount = Math.max(columns.length, 1);
  const lastColLetter = String.fromCharCode('A'.charCodeAt(0) + columnCount - 1);

  const primary = identity.primary.replace('#', '');
  const secondary = identity.secondary.replace('#', '');

  // Column widths — narrow for numeric/date, wide for text
  sheet.columns = columns.map((col) => {
    const base = col.label.length + 4;
    if (col.type === 'money') return { key: col.key, width: Math.max(14, base) };
    if (col.type === 'number') return { key: col.key, width: Math.max(10, base) };
    if (col.type === 'date') return { key: col.key, width: 14 };
    return { key: col.key, width: Math.max(18, Math.min(40, base + 4)) };
  });

  // Row 1 — school-name banner
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const banner = sheet.getCell('A1');
  banner.value = identity.schoolName.toUpperCase();
  banner.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  banner.alignment = { horizontal: 'center', vertical: 'middle' };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primary}` } };
  sheet.getRow(1).height = 26;

  // Row 2 — address / contact strip
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const strip = sheet.getCell('A2');
  const contactBits = [identity.address, identity.schoolPhone, identity.schoolEmail, identity.website]
    .filter(Boolean).join('  ·  ');
  strip.value = contactBits || ' ';
  strip.font = { name: 'Calibri', size: 9, color: { argb: 'FFFFFFFF' } };
  strip.alignment = { horizontal: 'center', vertical: 'middle' };
  strip.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${secondary}` } };
  sheet.getRow(2).height = 16;

  // Row 3 — report title
  sheet.mergeCells(`A3:${lastColLetter}3`);
  const title = sheet.getCell('A3');
  title.value = report.title || 'Report';
  title.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1f2937' } };
  title.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(3).height = 22;

  // Row 4 — generated-at / description
  sheet.mergeCells(`A4:${lastColLetter}4`);
  const meta = sheet.getCell('A4');
  const generated = new Date(report.generatedAt || Date.now());
  meta.value = `${report.description || ''}${report.description ? '  ·  ' : ''}Generated ${generated.toLocaleString()}`;
  meta.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6b7280' } };
  meta.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(4).height = 14;

  // Row 5 — column headers, sitting under the frozen split
  const headerRow = sheet.getRow(5);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.label;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primary}` } };
    cell.alignment = {
      horizontal: col.type === 'number' || col.type === 'money' ? 'right' : 'left',
      vertical: 'middle'
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });
  headerRow.height = 20;

  // Data rows — banded, typed
  rows.forEach((row, rowIdx) => {
    const excelRow = sheet.addRow(
      columns.map((col) => {
        const raw = row[col.key];
        if (col.type === 'money' || col.type === 'number') {
          const n = Number(raw);
          return Number.isFinite(n) ? n : raw ?? '';
        }
        if (col.type === 'date' && raw) {
          const d = new Date(raw);
          return Number.isNaN(d.getTime()) ? raw : d;
        }
        return raw === null || raw === undefined ? '' : raw;
      })
    );
    excelRow.height = 17;
    const banded = rowIdx % 2 === 1;
    columns.forEach((col, idx) => {
      const cell = excelRow.getCell(idx + 1);
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1f2937' } };
      cell.alignment = {
        horizontal: col.type === 'number' || col.type === 'money' ? 'right' : 'left',
        vertical: 'middle'
      };
      if (banded) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      if (col.type === 'money') cell.numFmt = '"$"#,##0.00';
      else if (col.type === 'number') cell.numFmt = '#,##0';
      else if (col.type === 'date') cell.numFmt = 'yyyy-mm-dd';
    });
  });

  // Summary block below the table
  if (Array.isArray(report.summary) && report.summary.length > 0) {
    sheet.addRow([]);
    const heading = sheet.addRow(['Summary']);
    heading.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: `FF${primary}` } };
    for (const item of report.summary) {
      const summaryRow = sheet.addRow([item.label, item.value]);
      summaryRow.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF6b7280' } };
      summaryRow.getCell(2).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1f2937' } };
    }
  }

  await workbook.xlsx.write(res);
  res.end();
};

// ---------- PDF ----------

/**
 * Write the report to `res` as a polished PDF: branded header band with the
 * school logo/name/address, coloured column headers, banded rows, per-page
 * footer with page numbers, and a summary card block below the table.
 */
export const streamPdf = async (res, report) => {
  const identity = await loadIdentity();
  const filename = `${filenameStem(report)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const columns = report.columns ?? [];
  const rows = report.rows ?? [];
  const landscape = columns.length > 5;

  const doc = new PDFDocument({
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
    margins: { top: 130, bottom: 60, left: 36, right: 36 },
    info: {
      Title: report.title,
      Author: identity.schoolName,
      Creator: 'School Management System'
    }
  });
  doc.pipe(res);

  // Precompute column widths — reserve narrow slots for typed columns and
  // share the rest among the text columns so long names get room to breathe.
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const RESERVED_WIDTHS = {
    money: 70,
    number: 55,
    date: 62
  };
  let reservedTotal = 0;
  let flexCount = 0;
  columns.forEach((col) => {
    if (RESERVED_WIDTHS[col.type]) reservedTotal += RESERVED_WIDTHS[col.type];
    else flexCount += 1;
  });
  const flexWidth = flexCount > 0 ? Math.max(70, (pageWidth - reservedTotal) / flexCount) : 0;
  const colWidths = columns.map((col) => RESERVED_WIDTHS[col.type] ?? flexWidth);
  // If total overflows (rare, many text columns on portrait), scale down uniformly.
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  if (totalWidth > pageWidth) {
    const scale = pageWidth / totalWidth;
    for (let i = 0; i < colWidths.length; i += 1) colWidths[i] *= scale;
  }

  const primary = identity.primary || DEFAULT_IDENTITY.primary;
  const secondary = identity.secondary || DEFAULT_IDENTITY.secondary;

  // Every call to text/rect below uses absolute coordinates. That's important:
  // pdfkit's `pageAdded` hook can recurse infinitely if the header-drawing
  // itself triggers another `addPage`, so we never let text flow reach page
  // boundaries — everything is x/y positioned with lineBreak:false.
  const drawPageHeader = () => {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const w = right - left;

    doc.save();
    doc.rect(0, 0, doc.page.width, 70).fill(primary);
    doc.rect(0, 70, doc.page.width, 6).fill(secondary);
    doc.restore();

    let textLeft = left;
    if (identity.logoPath) {
      try {
        doc.image(identity.logoPath, left, 12, { fit: [46, 46] });
        textLeft = left + 56;
      } catch {
        // Skip logo if unreadable — bad format, corrupted, etc.
      }
    }

    doc.save();
    doc.fillColor('white').font('Helvetica-Bold').fontSize(15);
    doc.text(identity.schoolName.toUpperCase(), textLeft, 14, {
      width: right - textLeft, lineBreak: false, ellipsis: true
    });

    const contactBits = [identity.address, identity.schoolPhone, identity.schoolEmail, identity.website]
      .filter(Boolean).join('  ·  ');
    if (contactBits) {
      doc.font('Helvetica').fontSize(8.5);
      doc.text(contactBits, textLeft, 34, {
        width: right - textLeft, lineBreak: false, ellipsis: true
      });
    }
    doc.restore();

    doc.save();
    doc.fillColor(LIGHTEN.ink).font('Helvetica-Bold').fontSize(13);
    doc.text(report.title || 'Report', left, 86, { width: w, lineBreak: false, ellipsis: true });
    if (report.description) {
      doc.font('Helvetica').fontSize(9).fillColor(LIGHTEN.muted);
      doc.text(report.description, left, 104, { width: w, lineBreak: false, ellipsis: true });
    }
    doc.restore();
  };

  const drawFooter = (pageNum) => {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const y = doc.page.height - 40;
    doc.save();
    doc.strokeColor(LIGHTEN.divider).lineWidth(0.5)
      .moveTo(left, y).lineTo(right, y).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(LIGHTEN.muted);
    const generated = new Date(report.generatedAt || Date.now());
    doc.text(`${identity.schoolName} · Generated ${generated.toLocaleString()}`, left, y + 8, {
      width: right - left, align: 'left', lineBreak: false
    });
    doc.text(`Page ${pageNum}`, left, y + 8, {
      width: right - left, align: 'right', lineBreak: false
    });
    doc.restore();
  };

  // Manual page management — no `pageAdded` listener, which risks recursion
  // if the header itself ever overflows. `newPage` is called explicitly by
  // the row loop below.
  let pageIndex = 1;
  const newPage = () => {
    drawFooter(pageIndex);
    doc.addPage();
    pageIndex += 1;
    drawPageHeader();
    doc.y = doc.page.margins.top;
  };

  drawPageHeader();

  const HEADER_ROW_HEIGHT = 22;
  const ROW_HEIGHT = 18;

  const drawTableHeader = () => {
    const left = doc.page.margins.left;
    const y = doc.y;
    doc.save();
    doc.rect(left, y, colWidths.reduce((a, b) => a + b, 0), HEADER_ROW_HEIGHT).fill(primary);
    doc.restore();
    let x = left;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('white');
    columns.forEach((col, i) => {
      const align = col.type === 'money' || col.type === 'number' ? 'right' : 'left';
      doc.text(col.label, x + 6, y + 6, {
        width: colWidths[i] - 12,
        height: HEADER_ROW_HEIGHT,
        ellipsis: true,
        align,
        lineBreak: false
      });
      x += colWidths[i];
    });
    doc.fillColor('black');
    doc.y = y + HEADER_ROW_HEIGHT;
  };

  doc.y = doc.page.margins.top;

  if (columns.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor(LIGHTEN.muted).text('This report has no columns.');
  } else if (rows.length === 0) {
    drawTableHeader();
    doc.moveDown(1);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(LIGHTEN.muted)
      .text('No records match the current filters.', { align: 'center' });
  } else {
    drawTableHeader();

    rows.forEach((row, rowIdx) => {
      // Reserve space for at least one more row plus footer clearance.
      if (doc.y + ROW_HEIGHT > doc.page.height - doc.page.margins.bottom) {
        newPage();
        drawTableHeader();
      }
      const y = doc.y;
      const left = doc.page.margins.left;
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      // Alternating band
      if (rowIdx % 2 === 1) {
        doc.save();
        doc.rect(left, y, tableWidth, ROW_HEIGHT).fill(LIGHTEN.altRow);
        doc.restore();
      }

      let x = left;
      doc.font('Helvetica').fontSize(9).fillColor(LIGHTEN.ink);
      columns.forEach((col, i) => {
        const align = col.type === 'money' || col.type === 'number' ? 'right' : 'left';
        doc.text(formatCell(row[col.key], col.type), x + 6, y + 5, {
          width: colWidths[i] - 12,
          height: ROW_HEIGHT,
          ellipsis: true,
          align,
          lineBreak: false
        });
        x += colWidths[i];
      });

      // Bottom hairline for the row
      doc.save();
      doc.strokeColor(LIGHTEN.divider).lineWidth(0.4)
        .moveTo(left, y + ROW_HEIGHT).lineTo(left + tableWidth, y + ROW_HEIGHT).stroke();
      doc.restore();

      doc.y = y + ROW_HEIGHT;
    });
  }

  // Summary cards — matches the Report Viewer's grid of small stat blocks.
  if (Array.isArray(report.summary) && report.summary.length > 0) {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const totalWidth = right - left;
    const perRow = Math.min(report.summary.length, 4);
    const cardWidth = (totalWidth - (perRow - 1) * 8) / perRow;
    const cardHeight = 42;

    // Ensure there's room; else add a page.
    const requiredHeight = 24 + Math.ceil(report.summary.length / perRow) * (cardHeight + 8);
    if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom) {
      newPage();
    } else {
      doc.moveDown(1);
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor(primary).text('Summary', left);
    doc.moveDown(0.4);

    let startY = doc.y;
    report.summary.forEach((item, i) => {
      const col = i % perRow;
      const rowIdx = Math.floor(i / perRow);
      const x = left + col * (cardWidth + 8);
      const y = startY + rowIdx * (cardHeight + 8);

      doc.save();
      doc.roundedRect(x, y, cardWidth, cardHeight, 6)
        .lineWidth(0.6).strokeColor(LIGHTEN.divider).fillOpacity(0.6)
        .fillAndStroke('#f9fafb', LIGHTEN.divider);
      doc.restore();

      doc.fillColor(LIGHTEN.muted).font('Helvetica').fontSize(8)
        .text(String(item.label), x + 10, y + 8, { width: cardWidth - 20, lineBreak: false, ellipsis: true });
      doc.fillColor(LIGHTEN.ink).font('Helvetica-Bold').fontSize(13)
        .text(String(item.value), x + 10, y + 20, { width: cardWidth - 20, lineBreak: false, ellipsis: true });
    });

    doc.y = startY + Math.ceil(report.summary.length / perRow) * (cardHeight + 8);
  }

  // Footer for the first page. `pageAdded` handles subsequent pages.
  drawFooter(pageIndex);
  doc.end();
};
