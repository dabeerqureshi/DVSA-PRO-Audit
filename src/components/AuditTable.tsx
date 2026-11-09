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
  Settings2,
} from 'lucide-react';
import { exportToExcel, exportToCsv } from '../lib/excelExporter';

interface AuditTableProps {
  records: AuditedRecord[];
  onOpenMapping?: () => void;
}

export const AuditTable: React.FC<AuditTableProps> = ({
  records,
  onOpenMapping,
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

  // ONLY FLAGGED records (threshold = 20,000) are displayed
  const flaggedRecords = useMemo(() => {
    return records.filter((r) => r._isFlagged);
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Flagged Records
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-700">
            {flaggedRecords.length}
          </span>
          <span className="text-[11px] text-slate-400">
            (&ge; 20,000 mi difference)
          </span>
        </div>

        {/* Action Controls & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenMapping && (
            <button
              type="button"
              onClick={onOpenMapping}
              className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Edit column mapping"
            >
              <Settings2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <span>Columns</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={flaggedRecords.length === 0}
            className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs disabled:opacity-40 disabled:pointer-events-none"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            <span>.xlsx</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={flaggedRecords.length === 0}
            className="inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition disabled:opacity-40 disabled:pointer-events-none"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-slate-300" />
            <span>.csv</span>
          </button>

          <div className="relative sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search reg..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs font-semibold px-2 py-1.5 rounded-xl border border-slate-200 text-slate-700"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto max-h-[600px] divide-y divide-slate-100">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50/90 backdrop-blur sticky top-0 z-10 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3.5 w-32">reg no</th>
              <th className="py-2.5 px-3.5 w-28">milage</th>
              <th className="py-2.5 px-3.5">dvsaa</th>
              <th className="py-2.5 px-3.5 w-32 text-center">d/f</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                    <AlertTriangle className="w-5 h-5 text-slate-400" />
                    <p className="font-semibold text-xs text-slate-600">
                      {flaggedRecords.length === 0
                        ? 'No discrepancies \u2265 20,000 miles'
                        : 'No matching records found'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, i) => {
                const diffFormatted =
                  typeof r['d/f'] === 'number'
                    ? r['d/f'].toLocaleString()
                    : r._diff !== null
                    ? Math.round(r._diff).toLocaleString()
                    : r['d/f'];

                return (
                  <tr
                    key={i}
                    className="bg-rose-50/40 hover:bg-rose-100/50 transition-colors"
                  >
                    {/* reg no */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-mono font-bold text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <span className="bg-amber-300 text-slate-950 px-2 py-0.5 rounded border border-amber-400 text-xs font-extrabold">
                          {r['reg no'] || 'UNKNOWN'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(r['reg no'])}
                          className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                          title="Copy"
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
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-mono font-bold text-slate-900">
                      {typeof r['milage'] === 'number'
                        ? r['milage'].toLocaleString()
                        : r['milage']}
                    </td>

                    {/* dvsaa */}
                    <td className="py-2.5 px-3.5 text-slate-700 leading-normal font-mono text-[11px]">
                      {r['dvsaa'] || '—'}
                    </td>

                    {/* d/f */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-center">
                      <span className="font-mono font-bold text-xs text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                        {diffFormatted}
                      </span>
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
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {(currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800">
              {filteredRecords.length}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-semibold text-slate-700">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
