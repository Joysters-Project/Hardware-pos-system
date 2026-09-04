export const escapeHtml = (value) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getColumnMeta = (colName = '') => {
  const norm = String(colName).trim().toLowerCase();

  const isNumeric = [
    'qty', 'quantity', 'qty sold', 'unit price', 'total', 'items taken',
    'project income', 'price', 'subtotal', 'discount', 'amount paid',
    'due balance', 'balance', 'stock', 'amount', 'salary', 'cost'
  ].includes(norm);

  const isDate = [
    'date', 'time', 'date & time', 'last sold', 'purchase time', 'taken_at'
  ].includes(norm);

  let align = 'left';
  let nowrap = false;

  if (isNumeric) {
    align = 'right';
    nowrap = true;
  } else if (isDate) {
    align = 'center';
    nowrap = true;
  }

  return { isNumeric, isDate, align, nowrap };
};

const getColumnWidths = (columns = []) => {
  const names = columns.map((c) => String(c).trim().toLowerCase());

  // 7-column Project Monthly Summary: 13 + 16 + 6 + 13 + 13 + 15 + 24 = 100%
  if (columns.length === 7 && names.includes('project') && names.includes('product')) {
    return ['13%', '16%', '6%', '13%', '13%', '15%', '24%'];
  }

  // 3-column Project Yearly Summary
  if (columns.length === 3 && names.includes('month') && names.includes('items taken')) {
    return ['30%', '30%', '40%'];
  }

  // 5-column Product details modal
  if (columns.length === 5 && names.includes('product') && names.includes('quantity')) {
    return ['26%', '10%', '20%', '20%', '24%'];
  }

  // 3-column Daily Sales Summary
  if (columns.length === 3 && names.includes('product') && names.includes('qty sold')) {
    return ['45%', '25%', '30%'];
  }

  // Equal fallback
  const eq = (100 / Math.max(columns.length, 1)).toFixed(2) + '%';
  return columns.map(() => eq);
};

export const buildTableHtml = ({ columns = [], rows = [], emptyMessage = 'No data found' }) => {
  const colWidths = getColumnWidths(columns);
  const colMetas = columns.map((col) => getColumnMeta(col));

  const colGroupHtml = `<colgroup>${colWidths.map((w) => `<col style="width: ${w};">`).join('')}</colgroup>`;

  const headerCells = columns
    .map((col, idx) => {
      const meta = colMetas[idx];
      const style = `text-align: ${meta.align};${meta.nowrap ? ' white-space: nowrap;' : ''}`;
      return `<th style="${style}">${escapeHtml(col)}</th>`;
    })
    .join('');

  if (!rows.length) {
    return `
      <table class="tpl-table">
        ${colGroupHtml}
        <thead><tr>${headerCells}</tr></thead>
        <tbody><tr><td colspan="${Math.max(columns.length, 1)}" class="tpl-empty">${escapeHtml(emptyMessage)}</td></tr></tbody>
      </table>`;
  }

  const bodyRows = rows
    .map((row) => {
      const cellsHtml = row
        .map((cell, idx) => {
          const meta = colMetas[idx] || { align: 'left', nowrap: false };
          const style = `text-align: ${meta.align};${meta.nowrap ? ' white-space: nowrap;' : ''}`;
          return `<td style="${style}">${cell ?? '—'}</td>`;
        })
        .join('');
      return `<tr>${cellsHtml}</tr>`;
    })
    .join('');

  return `
    <table class="tpl-table">
      ${colGroupHtml}
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
};

const paginateContentHtml = ({ title, subtitle, contentHtml, formattedDate, useTemplate = true, headerTitle = '' }) => {
  const displayTitle = headerTitle || title;
  const tableRegex = /<table[^>]*class="[^"]*tpl-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i;
  const tableMatch = contentHtml.match(tableRegex);

  const pageClass = useTemplate ? 'tpl-page' : 'tpl-page tpl-page-plain';
  const contentClass = useTemplate ? 'tpl-content' : 'tpl-content tpl-content-plain';
  const headerBlockClass = useTemplate ? 'tpl-header-block' : 'tpl-header-block tpl-header-plain';
  const headlineClass = useTemplate ? 'tpl-headline' : 'tpl-headline tpl-headline-store';
  const sublineClass = useTemplate ? 'tpl-subline' : 'tpl-subline tpl-subline-store';

  if (!tableMatch) {
    return `
      <div class="${pageClass}">
        <div class="${contentClass}">
          <div class="${headerBlockClass}">
            <h1 class="${headlineClass}">${escapeHtml(displayTitle)}</h1>
            ${subtitle ? `<div class="${sublineClass}">${escapeHtml(subtitle)}</div>` : ''}
            <div class="tpl-meta">Generated: ${escapeHtml(formattedDate)}</div>
          </div>
          <div class="tpl-body-content">
            ${contentHtml}
          </div>
        </div>
      </div>`;
  }

  const fullTableMatch = tableMatch[0];
  const tableInner = tableMatch[1];

  const colgroupMatch = tableInner.match(/<colgroup[^>]*>([\s\S]*?)<\/colgroup>/i);
  const theadMatch = tableInner.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  const tbodyMatch = tableInner.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);

  if (!tbodyMatch) {
    return `
      <div class="${pageClass}">
        <div class="${contentClass}">
          <div class="${headerBlockClass}">
            <h1 class="${headlineClass}">${escapeHtml(displayTitle)}</h1>
            ${subtitle ? `<div class="${sublineClass}">${escapeHtml(subtitle)}</div>` : ''}
            <div class="tpl-meta">Generated: ${escapeHtml(formattedDate)}</div>
          </div>
          <div class="tpl-body-content">
            ${contentHtml}
          </div>
        </div>
      </div>`;
  }

  const colgroupHtml = colgroupMatch ? colgroupMatch[0] : '';
  const theadHtml = theadMatch ? theadMatch[0] : '';
  const tbodyInner = tbodyMatch[1];
  const rowMatches = tbodyInner.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  const tableIndex = contentHtml.indexOf(fullTableMatch);
  const beforeTable = contentHtml.substring(0, tableIndex);
  const afterTable = contentHtml.substring(tableIndex + fullTableMatch.length);

  const FIRST_PAGE_MAX_ROWS = useTemplate ? 12 : 20;
  const OTHER_PAGE_MAX_ROWS = useTemplate ? 14 : 24;

  if (rowMatches.length <= FIRST_PAGE_MAX_ROWS) {
    return `
      <div class="${pageClass}">
        <div class="${contentClass}">
          <div class="${headerBlockClass}">
            <h1 class="${headlineClass}">${escapeHtml(displayTitle)}</h1>
            ${subtitle ? `<div class="${sublineClass}">${escapeHtml(subtitle)}</div>` : ''}
            <div class="tpl-meta">Generated: ${escapeHtml(formattedDate)}</div>
          </div>
          <div class="tpl-body-content">
            ${contentHtml}
          </div>
        </div>
      </div>`;
  }

  const chunks = [];
  let rowCursor = 0;

  while (rowCursor < rowMatches.length) {
    const isFirst = chunks.length === 0;
    const maxRows = isFirst ? FIRST_PAGE_MAX_ROWS : OTHER_PAGE_MAX_ROWS;
    const chunkRows = rowMatches.slice(rowCursor, rowCursor + maxRows);
    rowCursor += maxRows;
    chunks.push(chunkRows);
  }

  const totalPages = chunks.length;

  return chunks.map((chunkRows, idx) => {
    const pageNum = idx + 1;
    const isFirst = pageNum === 1;
    const isLast = pageNum === totalPages;

    const tableChunkHtml = `
      <table class="tpl-table">
        ${colgroupHtml}
        ${theadHtml}
        <tbody>
          ${chunkRows.join('')}
        </tbody>
      </table>`;

    return `
      <div class="${pageClass}">
        <div class="${contentClass}">
          <div class="${headerBlockClass}">
            <h1 class="${headlineClass}">${escapeHtml(displayTitle)}${totalPages > 1 ? ` <span class="tpl-page-indicator">(Page ${pageNum} of ${totalPages})</span>` : ''}</h1>
            ${subtitle ? `<div class="${sublineClass}">${escapeHtml(subtitle)}</div>` : ''}
            <div class="tpl-meta">Generated: ${escapeHtml(formattedDate)}</div>
          </div>
          <div class="tpl-body-content">
            ${isFirst && beforeTable ? beforeTable : ''}
            ${tableChunkHtml}
            ${isLast && afterTable ? afterTable : ''}
          </div>
        </div>
      </div>`;
  }).join('\n');
};

export const printWithTemplate = ({
  title       = 'Document',
  subtitle    = '',
  contentHtml = '',
  autoClose   = false,
  pageSize    = 'A4 portrait',
  useTemplate = true,
  headerTitle = '',
} = {}) => {
  const popup = window.open('', '_blank', 'width=950,height=850');
  if (!popup) return false;

  const templateUrl = `${window.location.origin}/Templet.png`;

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formattedDate = `${day}/${month}/${year}, ${timeStr}`;

  const pagesBodyHtml = paginateContentHtml({ title, subtitle, contentHtml, formattedDate, useTemplate, headerTitle });

  popup.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: ${pageSize};
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background: #475569;
      font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100vh;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Screen preview layout wrapper */
    .preview-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 24px 100px 24px;
      gap: 32px;
      min-height: 100vh;
      box-sizing: border-box;
    }

    /* ── A4 sheet with Templet.png as full-page background ── */
    .tpl-page {
      width: 210mm;
      height: 297mm;
      position: relative;
      background-image: url('${templateUrl}') !important;
      background-repeat: no-repeat !important;
      background-position: top left !important;
      background-size: 100% 100% !important;
      background-color: #ffffff;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
      border-radius: 2px;
      box-sizing: border-box;
      overflow: hidden;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .tpl-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    /* Plain style when template is removed (e.g. for Bill Printing) */
    .tpl-page.tpl-page-plain {
      background-image: none !important;
      background-color: #ffffff !important;
    }

    /* ── content sits cleanly between the PNG header and footer bands ──
       Templet.png header ends at ~69mm -> top: 72mm
       Templet.png footer starts at ~271mm -> bottom: 30mm
       Left/Right margins: 16mm
    */
    .tpl-content {
      position: absolute;
      top: 72mm;
      left: 16mm;
      right: 16mm;
      bottom: 30mm;
      max-height: calc(297mm - 72mm - 30mm);
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .tpl-content.tpl-content-plain {
      top: 15mm;
      bottom: 15mm;
      max-height: calc(297mm - 30mm);
    }

    .tpl-header-block {
      margin-bottom: 10px;
      border-bottom: 2px solid #7f1d24;
      padding-bottom: 6px;
    }

    .tpl-header-plain {
      text-align: center;
      border-bottom: 2px solid #7f1d24;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }

    .tpl-headline {
      font-size: 17px;
      font-weight: 700;
      color: #7f1d24;
      line-height: 1.2;
    }

    .tpl-headline-store {
      font-size: 22px;
      font-weight: 800;
      color: #7f1d24;
      letter-spacing: 1px;
      text-transform: uppercase;
      line-height: 1.2;
    }

    .tpl-page-indicator {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      margin-left: 6px;
    }

    .tpl-subline {
      font-size: 12px;
      color: #475569;
      margin-top: 3px;
      font-weight: 500;
    }

    .tpl-subline-store {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }

    .tpl-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
    }

    .tpl-body-content {
      flex: 1;
      overflow: hidden;
    }

    /* ── Fixed Table Layout & Straight Vertical Column Alignment ── */
    .tpl-table {
      width: 100% !important;
      max-width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      font-size: 11px;
      margin-top: 4px;
      box-sizing: border-box !important;
    }

    .tpl-table th {
      padding: 7px 8px !important;
      background-color: #7f1d24 !important;
      color: #ffffff !important;
      font-weight: 600;
      border: 1px solid #7f1d24 !important;
      vertical-align: middle !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      word-break: break-word !important;
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .tpl-table td {
      padding: 6px 8px !important;
      border: 1px solid #cbd5e1 !important;
      vertical-align: middle !important;
      color: #1e293b;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
      word-break: break-word !important;
      box-sizing: border-box !important;
      font-variant-numeric: tabular-nums !important;
    }

    .tpl-table tbody tr:nth-child(even) td {
      background-color: #fcf5f5 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .tpl-empty {
      text-align: center !important;
      color: #64748b;
      padding: 16px !important;
      font-style: italic;
    }

    /* ── Bottom Fixed Toolbar ── */
    .tpl-toolbar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: #ffffff;
      border-top: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
      z-index: 99999;
      padding: 0 20px;
    }

    .tpl-btn-print {
      background: #7f1d24;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 3px 8px rgba(127, 29, 36, 0.35);
      transition: background-color 0.2s, transform 0.1s;
    }

    .tpl-btn-print:hover {
      background: #651f1f;
    }

    .tpl-btn-print:active {
      transform: translateY(1px);
    }

    .tpl-btn-close {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .tpl-btn-close:hover {
      background: #e2e8f0;
    }

    @media print {
      @page {
        size: ${pageSize};
        margin: 0;
      }

      html, body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .no-print, .tpl-toolbar {
        display: none !important;
      }

      .preview-container {
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        gap: 0 !important;
        min-height: auto !important;
      }

      .tpl-page {
        margin: 0 !important;
        width: 210mm !important;
        height: 297mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        background-image: url('${templateUrl}') !important;
        background-repeat: no-repeat !important;
        background-position: top left !important;
        background-size: 100% 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }

      .tpl-page.tpl-page-plain {
        background-image: none !important;
        background-color: #ffffff !important;
      }

      .tpl-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="preview-container">
    ${pagesBodyHtml}
  </div>

  <div class="tpl-toolbar no-print">
    <button class="tpl-btn-print" onclick="window.print()" autoFocus>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Print / Save PDF
    </button>
    <button class="tpl-btn-close" onclick="window.close()">
      Close
    </button>
  </div>
</body>
</html>`);

  popup.document.close();
  popup.focus();

  if (autoClose) {
    popup.onafterprint = () => popup.close();
  }

  return true;
};



