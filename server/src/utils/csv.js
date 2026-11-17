/**
 * Builds a CSV string. Cells that a spreadsheet would treat as a formula (= + - @, tab, CR)
 * are prefixed with a quote to prevent CSV/formula injection when the file is opened in Excel.
 */
const cell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^(?:[\t\r\n]|\s*[=+\-@])/u.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (headers, rows) => [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))].join('\r\n');
