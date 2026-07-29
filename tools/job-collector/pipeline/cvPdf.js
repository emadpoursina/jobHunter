import { readFile, writeFile, stat } from 'fs/promises';
import { marked } from 'marked';
import { getBrowser } from '../collectors/linkedin.js';
import { repoPath } from './repoFiles.js';

const PRINT_CSS = `
@page { size: A4; margin: 18mm 16mm; }
body { font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #111; }
h1 { font-size: 16pt; margin: 0 0 4pt; }
h2 { font-size: 12pt; margin: 12pt 0 4pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt; }
h3 { font-size: 11pt; margin: 8pt 0 2pt; }
a { color: #111; text-decoration: underline; word-break: break-all; }
ul { margin: 0 0 8pt; padding-left: 18pt; }
li { margin-bottom: 2pt; }
p { margin: 0 0 6pt; }
strong { font-weight: bold; }
hr { border: none; border-top: 1px solid #ccc; margin: 8pt 0; }
`;

// Convert markdown text to a full HTML document suitable for printing
export function mdToHtml(md) {
  const body = marked.parse(md);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PRINT_CSS}</style></head><body>${body}</body></html>`;
}

// Derive the PDF output path from a .md path (same basename, .pdf extension)
export function pdfPathFor(mdPath) {
  return mdPath.replace(/\.md$/i, '.pdf');
}

// Convert a generated CV .md file to PDF, reusing an existing PDF when it is newer than the source
export async function cvToPdf(mdRelativePath) {
  const fullPath = repoPath(mdRelativePath);
  const pdfPath = pdfPathFor(fullPath);

  let mdStat;
  try {
    mdStat = await stat(fullPath);
  } catch {
    const err = new Error(`CV source not found: ${mdRelativePath}`);
    err.code = 'CV_PDF_ERROR';
    throw err;
  }

  // Reuse existing PDF if it is at least as new as the source markdown
  try {
    const pdfStat = await stat(pdfPath);
    if (pdfStat.size > 0 && pdfStat.mtimeMs >= mdStat.mtimeMs) {
      return pdfPath;
    }
  } catch {
    // PDF missing or stat failed — proceed to convert
  }

  const md = await readFile(fullPath, 'utf8');
  const html = mdToHtml(md);

  let browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    const e = new Error(`Failed to launch browser for PDF: ${err.message}`);
    e.code = 'CV_PDF_ERROR';
    throw e;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  let pdfBytes;
  try {
    await page.setContent(html, { waitUntil: 'load' });
    pdfBytes = await page.pdf({ format: 'A4', printBackground: true });
  } catch (err) {
    const e = new Error(`Playwright PDF generation failed: ${err.message}`);
    e.code = 'CV_PDF_ERROR';
    throw e;
  } finally {
    await context.close();
  }

  if (!pdfBytes || pdfBytes.length === 0) {
    const err = new Error('Playwright returned an empty PDF');
    err.code = 'CV_PDF_ERROR';
    throw err;
  }

  await writeFile(pdfPath, pdfBytes);
  console.log(`[INFO] [cvPdf] Wrote ${pdfPath} (${pdfBytes.length} bytes)`);
  return pdfPath;
}
