import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  headerMapping?: Record<string, string>; // Maps data keys to human-readable headers
}

/**
 * Exports an array of objects to an Excel (.xlsx) file
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExcelExportOptions | string
) {
  if (!data || data.length === 0) {
    console.warn('No data to export to Excel');
    return;
  }

  const opts: ExcelExportOptions = typeof options === 'string' ? { filename: options } : options;

  // Transform data if headerMapping is provided
  const transformedData = data.map((item) => {
    if (!opts.headerMapping) return item;
    const mappedItem: Record<string, any> = {};
    for (const [key, label] of Object.entries(opts.headerMapping)) {
      mappedItem[label] = item[key] !== undefined && item[key] !== null ? item[key] : '';
    }
    return mappedItem;
  });

  const worksheet = XLSX.utils.json_to_sheet(transformedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, opts.sheetName || 'Données');

  // Auto-fit column widths
  const maxProps = transformedData.length > 0 ? Object.keys(transformedData[0]) : [];
  const colWidths = maxProps.map((key) => {
    let maxLength = key.length;
    for (const row of transformedData) {
      const val = row[key] ? String(row[key]) : '';
      if (val.length > maxLength) {
        maxLength = val.length;
      }
    }
    return { wch: Math.min(Math.max(maxLength + 3, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  const filename = opts.filename.endsWith('.xlsx')
    ? opts.filename
    : `${opts.filename}.xlsx`;

  XLSX.writeFile(workbook, filename);
}
