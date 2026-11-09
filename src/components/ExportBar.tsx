'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { AuditedRecord } from '../lib/types';
import { exportToExcel, exportToCsv } from '../lib/excelExporter';

interface ExportBarProps {
  records: AuditedRecord[];
  flaggedCount: number;
}

export const ExportBar: React.FC<ExportBarProps> = ({ records, flaggedCount }) => {
  const [exportScope, setExportScope] = useState<'FLAGGED' | 'ALL'>('FLAGGED');

  const getTargetRecords = () => {
    if (exportScope === 'FLAGGED') {
      return records.filter((r) => r._isFlagged);
    }
    return records;
  };

  const handleExcelExport = () => {
    const data = getTargetRecords();
    const suffix = exportScope === 'FLAGGED' ? '_flagged_discrepancies' : '_full_audit';
    exportToExcel(data, `dvsa_mileage${suffix}.xlsx`);
  };

  const handleCsvExport = () => {
    const data = getTargetRecords();
    const suffix = exportScope === 'FLAGGED' ? '_flagged_discrepancies' : '_full_audit';
    exportToCsv(data, `dvsa_mileage${suffix}.csv`);
  };

  const targetCount = exportScope === 'FLAGGED' ? flaggedCount : records.length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-white">Download Audited Results</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {flaggedCount} Flagged
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Exact 4-column schema: <span className="font-mono text-indigo-300">reg no, milage, dvsaa, d/f</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Scope selector */}
        <div className="inline-flex rounded-xl bg-slate-800 p-0.5 border border-slate-700">
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
          <button
            type="button"
            onClick={() => setExportScope('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              exportScope === 'ALL'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Records ({records.length})
          </button>
        </div>

        {/* Excel Button */}
        <button
          type="button"
          onClick={handleExcelExport}
          disabled={targetCount === 0}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition shadow-sm disabled:opacity-40 disabled:pointer-events-none"
        >
          <FileSpreadsheet className="w-4 h-4 mr-1.5" />
          <span>Download Excel (.xlsx)</span>
        </button>

        {/* CSV Button */}
        <button
          type="button"
          onClick={handleCsvExport}
          disabled={targetCount === 0}
          className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border border-slate-700 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <FileText className="w-4 h-4 mr-1.5 text-slate-400" />
          <span>Download CSV (.csv)</span>
        </button>
      </div>
    </div>
  );
};
