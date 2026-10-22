import AppError from './AppError.js';

/**
 * Turns an uploaded document into plain text.
 *
 * Supports exactly three formats, chosen deliberately: .txt needs no library
 * at all, .pdf and .docx cover what a school actually produces exam papers
 * and assignments in. Legacy .doc is not supported — mammoth cannot read the
 * old binary format reliably, and claiming to support it while silently
 * mangling the text would be worse than a clear rejection.
 *
 * pdf-parse and mammoth are imported lazily inside the functions that need
 * them rather than at module load, so a server with neither installed yet
 * still boots — this file existing shouldn't be a hard dependency for
 * everything else in src/ai/.
 */

const MAX_CHARS = 60000;

const truncate = (text) =>
  text.length > MAX_CHARS
    ? `${text.slice(0, MAX_CHARS)}\n\n[Document truncated — only the first portion was reviewed.]`
    : text;

const extractPdf = async (buffer) => {
  // pdf-parse v2 is a named-export class, not the v1 default-export function.
  // The old `{ default: pdfParse }` destructure silently yielded undefined, so
  // every PDF threw "pdfParse is not a function" and surfaced below as the
  // misleading "corrupted or password-protected" 400.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    // Releases the worker; without it the process keeps a handle open per upload.
    await parser.destroy();
  }
};

const extractDocx = async (buffer) => {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
};

/**
 * @param {Buffer} buffer  the uploaded file's bytes
 * @param {string} originalName  the filename as uploaded, used only to pick an extractor
 */
export const extractTextFromDocument = async (buffer, originalName) => {
  const ext = String(originalName ?? '').toLowerCase().split('.').pop();

  let raw;
  try {
    if (ext === 'txt') raw = buffer.toString('utf-8');
    else if (ext === 'pdf') raw = await extractPdf(buffer);
    else if (ext === 'docx') raw = await extractDocx(buffer);
    else {
      throw new AppError(
        'Unsupported file type. Upload a .pdf, .docx, or .txt file (legacy .doc is not supported).',
        400
      );
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      'Could not read that file. It may be corrupted, password-protected, or not actually a valid document of its extension.',
      400
    );
  }

  const cleaned = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (cleaned.length < 20) {
    throw new AppError(
      'No readable text was found in that file. If it is a scanned image rather than a typed document, text extraction cannot read it.',
      400
    );
  }

  return truncate(cleaned);
};
