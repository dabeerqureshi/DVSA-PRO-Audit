import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { AuditedRecord } from '../lib/types';
import { exportToExcel, exportToCsv } from '../lib/excelExporter';

interface ExportBarProps {
  records: AuditedRecord[];
  flaggedCount: number;
}

export const ExportBar: React.FC<ExportBarProps> = ({ records, flaggedCount }) => {
  const [exportScope, setExportScope] = useState<'ALL' | 'FLAGGED'>('ALL');

  const getTargetRecords = () => {
    if (exportScope === 'FLAGGED') {
      return records.filter((r) => r['d/f'] === 'FLAG');
    }
    return records;
  };

  const handleExcelExport = () => {
    const data = getTargetRecords();
    const suffix = exportScope === 'FLAGGED' ? '_flagged_only' : '_full_audit';
    exportToExcel(data, `mileage_audit${suffix}.xlsx`);
  };

  const handleCsvExport = () => {
    const data = getTargetRecords();
    const suffix = exportScope === 'FLAGGED' ? '_flagged_only' : '_full_audit';
    exportToCsv(data, `mileage_audit${suffix}.csv`);
  };

  const targetCount = exportScope === 'FLAGGED' ? flaggedCount : records.length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <Download className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Export Formatted Audit Results</h4>
          <p className="text-xs text-slate-400">
            Export schema: <span className="font-mono text-indigo-300">reg no, milage, dvsaa, d/f</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Scope selector */}
        <div className="inline-flex rounded-xl bg-slate-800 p-0.5 border border-slate-700">
          <button
            type="button"
            onClick={() => setExportScope('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              exportScope === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setExportScope('FLAGGED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              exportScope === 'FLAGGED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Flagged Only ({flaggedCount})
          </button>
        </div>

        {/* Excel Button */}
        <button
          type="button"
          onClick={handleExcelExport}
          disabled={targetCount === 0}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition shadow-sm disabled:opacity-40 disabled:pointer-events-none"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
          <span>Excel (.xlsx)</span>
        </button>

        {/* CSV Button */}
        <button
          type="button"
          onClick={handleCsvExport}
          disabled={targetCount === 0}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
          <span>CSV (.csv)</span>
        </button>
      </div>
    </div>
  );
};
