/**
 * Builds and prints the downloadable report as a self-contained document.
 *
 * Deliberately not the app's own print stylesheet, and deliberately no PDF
 * library: the report is rendered into a standalone HTML document with its own
 * page geometry, then handed to the browser's "Save as PDF". System fonts keep
 * Romanian diacritics intact, links stay clickable in the PDF, and the app
 * ships no extra dependency to get there.
 */

export interface ReportDocSource {
  title: string;
  href: string;
  meta: string;
  excerpt?: string;
}

export interface ReportDocData {
  lang: string;
  brand: string;
  docTitle: string;
  generatedOnLabel: string;
  dateStr: string;
  reportIdLabel: string;
  reportId: string;
  claimLabel: string;
  claim: string;
  verdictWord: string;
  verdictColor: string;
  scoreLabel: string;
  score: number;
  summaryLabel: string;
  summary: string;
  sourcesLabel: string;
  sources: ReportDocSource[];
  disclaimerLabel: string;
  disclaimerText: string;
}

function escText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(value: string): string {
  return escText(value).replace(/"/g, '&quot;');
}

export function buildReportHtml(data: ReportDocData): string {
  const sources = data.sources
    .map((source, index) => {
      const number = String(index + 1).padStart(2, '0');
      const excerpt = source.excerpt
        ? `<blockquote class="excerpt">${escText(source.excerpt)}</blockquote>`
        : '';
      return `
        <li class="source">
          <span class="source-index">${number}</span>
          <div class="source-body">
            <a class="source-title" href="${escAttr(source.href)}">${escText(source.title)}</a>
            <span class="source-meta">${escText(source.meta)}</span>
            ${excerpt}
          </div>
        </li>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${escAttr(data.lang)}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escText(data.docTitle)} — ${escText(data.brand)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #16181c;
    line-height: 1.55;
    font-size: 12pt;
  }
  .masthead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid #16181c;
  }
  .brand { font-weight: 700; letter-spacing: 0.04em; font-size: 13pt; }
  .doc-id { font-size: 9pt; color: #62646c; text-align: right; }
  .verdict-block { margin-top: 22px; }
  .verdict-word { font-size: 20pt; font-weight: 700; letter-spacing: -0.01em; color: ${escAttr(data.verdictColor)}; }
  .score { margin-top: 4px; font-size: 10pt; color: #62646c; }
  .section { margin-top: 22px; }
  .label {
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #62646c;
    margin: 0 0 6px;
  }
  .claim {
    margin: 0;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 15pt;
    line-height: 1.4;
  }
  .summary { margin: 0; color: #3f424a; }
  .sources { list-style: none; margin: 0; padding: 0; }
  .source { display: flex; gap: 12px; padding: 9px 0; border-bottom: 1px solid #e6e5df; page-break-inside: avoid; }
  .source-index { font-size: 9pt; color: #62646c; min-width: 22px; }
  .source-body { display: block; }
  .source-title { color: #16181c; text-decoration: underline; text-underline-offset: 2px; font-size: 11pt; }
  .source-meta { display: block; font-size: 8.5pt; color: #62646c; margin-top: 2px; }
  .excerpt {
    margin: 6px 0 0;
    padding-left: 10px;
    border-left: 1px solid #d3d2cb;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 10pt;
    color: #3f424a;
  }
  .disclaimer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e6e5df; }
  .disclaimer .label { margin-bottom: 4px; }
  .disclaimer p { margin: 0; font-size: 9.5pt; color: #62646c; }
</style>
</head>
<body>
  <header class="masthead">
    <span class="brand">${escText(data.brand)}</span>
    <span class="doc-id">
      ${escText(data.generatedOnLabel)} ${escText(data.dateStr)}<br />
      ${escText(data.reportIdLabel)}: ${escText(data.reportId)}
    </span>
  </header>

  <div class="verdict-block">
    <div class="verdict-word">${escText(data.verdictWord)}</div>
    <div class="score">${escText(data.scoreLabel)}: ${data.score}/100</div>
  </div>

  <section class="section">
    <p class="label">${escText(data.claimLabel)}</p>
    <p class="claim">&ldquo;${escText(data.claim)}&rdquo;</p>
  </section>

  <section class="section">
    <p class="label">${escText(data.summaryLabel)}</p>
    <p class="summary">${escText(data.summary)}</p>
  </section>

  <section class="section">
    <p class="label">${escText(data.sourcesLabel)}</p>
    <ol class="sources">${sources}</ol>
  </section>

  <section class="disclaimer">
    <p class="label">${escText(data.disclaimerLabel)}</p>
    <p>${escText(data.disclaimerText)}</p>
  </section>
</body>
</html>`;
}

/**
 * Renders the document into a hidden iframe and opens the print dialog on it,
 * so only the report — not the app page — reaches the PDF. The iframe is torn
 * down after the dialog has had time to take over.
 */
export function printReportDocument(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (win) {
      win.focus();
      win.print();
    }
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}
