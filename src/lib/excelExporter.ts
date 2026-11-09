import * as XLSX from 'xlsx';
import { AuditedRecord } from './types';

export function exportToExcel(
  records: AuditedRecord[],
  filename: string = 'vehicle_mileage_audit.xlsx'
) {
  // Format data into columns: reg no, make, model, milage, dvsaa, d/f
  const exportData = records.map((r) => ({
    'reg no': r['reg no'],
    'make': r['make'],
    'model': r['model'],
    'milage': r['milage'],
    'dvsaa': r['dvsaa'],
    'd/f': r['d/f'],
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 14 }, // reg no
    { wch: 18 }, // make
    { wch: 20 }, // model
    { wch: 12 }, // milage
    { wch: 60 }, // dvsaa
    { wch: 10 }, // d/f
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Results');

  XLSX.writeFile(workbook, filename);
}

export function exportToCsv(
  records: AuditedRecord[],
  filename: string = 'vehicle_mileage_audit.csv'
) {
  const exportData = records.map((r) => ({
    'reg no': r['reg no'],
    'make': r['make'],
    'model': r['model'],
    'milage': r['milage'],
    'dvsaa': r['dvsaa'],
    'd/f': r['d/f'],
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
