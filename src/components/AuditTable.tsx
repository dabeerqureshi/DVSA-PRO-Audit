'use client';

import React, { useState, useMemo } from 'react';
import { AuditedRecord } from '../lib/types';
import {
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Sliders,
} from 'lucide-react';
import { exportToExcel, exportToCsv } from '../lib/excelExporter';

interface AuditTableProps {
  records: AuditedRecord[];
  threshold: number;
  onThresholdChange?: (newThreshold: number) => void;
}

export const AuditTable: React.FC<AuditTableProps> = ({
  records,
  threshold,
  onThresholdChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copiedReg, setCopiedReg] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReg(text);
    setTimeout(() => setCopiedReg(null), 1500);
  };

  // ONLY FLAGGED records are displayed
  const flaggedRecords = useMemo(() => {
    return records.filter((r) => r['d/f'] === 'FLAG');
  }, [records]);

  // Search filter applied to flagged records
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return flaggedRecords;
    const query = searchQuery.trim().toLowerCase();
    return flaggedRecords.filter((r) => {
      const regMatch = r['reg no'].toLowerCase().includes(query);
      const dvsaMatch = r['dvsaa'].toLowerCase().includes(query);
      const milMatch = String(r['milage']).toLowerCase().includes(query);
      return regMatch || dvsaMatch || milMatch;
    });
  }, [flaggedRecords, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleDownloadExcel = () => {
    exportToExcel(flaggedRecords, 'flagged_mileage_audit.xlsx');
  };

  const handleDownloadCsv = () => {
    exportToCsv(flaggedRecords, 'flagged_mileage_audit.csv');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-900">
              Flagged Mileage Discrepancies
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
            {flaggedRecords.length} Flagged
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            (Discrepancy &gt; {threshold.toLocaleString()} miles)
          </span>
        </div>

        {/* Action Controls & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick download buttons */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={flaggedRecords.length === 0}
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            title="Download flagged records in Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            <span>Download .xlsx</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={flaggedRecords.length === 0}
            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
            title="Download flagged records in CSV"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-300" />
            <span>Download .csv</span>
          </button>

          {/* Search input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search flagged VRM..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto max-h-[600px] divide-y divide-slate-100">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-36">reg no</th>
              <th className="py-3 px-4 w-32">milage</th>
              <th className="py-3 px-4">dvsaa (MOT History)</th>
              <th className="py-3 px-4 w-36 text-center">d/f</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-700">
                        {flaggedRecords.length === 0
                          ? 'No Discrepancies Flagged'
                          : 'No matching flagged records found'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {flaggedRecords.length === 0
                          ? `All ${records.length} vehicles scanned are within the ${threshold.toLocaleString()} miles threshold.`
                          : 'Try modifying your search query.'}
                      </p>
                    </div>

                    {flaggedRecords.length === 0 && onThresholdChange && (
                      <div className="pt-2 flex flex-col items-center space-y-2">
                        <span className="text-[11px] text-slate-400">
                          To inspect smaller variances, lower the threshold:
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => onThresholdChange(10000)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                          >
                            Set to 10,000 miles
                          </button>
                          <button
                            type="button"
                            onClick={() => onThresholdChange(15000)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition"
                          >
                            Set to 15,000 miles
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, i) => {
                const diffFormatted =
                  r._diff !== null ? Math.round(r._diff).toLocaleString() : null;

                return (
                  <tr
                    key={i}
                    className="bg-rose-50/50 hover:bg-rose-100/60 transition-colors"
                  >
                    {/* reg no */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-300 text-slate-950 px-2.5 py-0.5 rounded border border-amber-400 text-xs font-extrabold tracking-wide shadow-sm">
                          {r['reg no'] || 'UNKNOWN'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(r['reg no'])}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                          title="Copy Registration"
                        >
                          {copiedReg === r['reg no'] ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* milage */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                      {typeof r['milage'] === 'number'
                        ? r['milage'].toLocaleString()
                        : r['milage']}
                    </td>

                    {/* dvsaa */}
                    <td className="py-3 px-4 text-slate-700 leading-relaxed font-mono text-[11px]">
                      {r['dvsaa'] ? (
                        <span>
                          {r['dvsaa']}
                          {r._lastDvsaRaw && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800 text-[10px] font-sans font-semibold">
                              Latest: {r._lastDvsaRaw}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-sans">
                          No DVSA data recorded
                        </span>
                      )}
                    </td>

                    {/* d/f */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-sm shadow-rose-200">
                          FLAG
                        </span>
                        {diffFormatted && (
                          <span className="text-[10px] text-rose-600 font-bold mt-0.5 font-mono">
                            Δ {diffFormatted} mi
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredRecords.length > 0 && (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800">
              {filteredRecords.length.toLocaleString()}
            </span>{' '}
            flagged records
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
