/**
 * Generate a CSV string with UTF-8 BOM (\uFEFF) for Vietnamese language Excel compatibility.
 */
export function generateCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) => row.map(escapeCell).join(','));

  // Prepend UTF-8 BOM
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

