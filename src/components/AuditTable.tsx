'use client';

import React, { useState, useMemo } from 'react';
import { AuditedRecord, FilterMode } from '../lib/types';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Copy,
  Check,
} from 'lucide-react';

interface AuditTableProps {
  records: AuditedRecord[];
  threshold: number;
}

export const AuditTable: React.FC<AuditTableProps> = ({ records, threshold }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [copiedReg, setCopiedReg] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReg(text);
    setTimeout(() => setCopiedReg(null), 1500);
  };

  // Filter & Search
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Filter tab check
      if (filterMode === 'FLAGGED' && r['d/f'] !== 'FLAG') return false;
      if (filterMode === 'PASSED' && r['d/f'] === 'FLAG') return false;

      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const regMatch = r['reg no'].toLowerCase().includes(query);
        const dvsaMatch = r['dvsaa'].toLowerCase().includes(query);
        const milMatch = String(r['milage']).toLowerCase().includes(query);
        return regMatch || dvsaMatch || milMatch;
      }

      return true;
    });
  }, [records, filterMode, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Counts for tabs
  const flaggedCount = useMemo(
    () => records.filter((r) => r['d/f'] === 'FLAG').length,
    [records]
  );
  const passedCount = records.length - flaggedCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setFilterMode('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterMode === 'ALL'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({records.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode('FLAGGED');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              filterMode === 'FLAGGED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 hover:text-rose-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Flagged ({flaggedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFilterMode('PASSED');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              filterMode === 'PASSED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed ({passedCount})</span>
          </button>
        </div>

        {/* Search input & page size */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search registration or DVSA..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={500}>500 / page</option>
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
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Search className="w-6 h-6 text-slate-300" />
                    <p className="font-medium text-slate-500">No records match your criteria</p>
                    <p className="text-xs text-slate-400">
                      Try clearing filters or search terms
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, i) => {
                const isFlagged = r['d/f'] === 'FLAG';
                const diffFormatted =
                  r._diff !== null ? Math.round(r._diff).toLocaleString() : null;

                return (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      isFlagged
                        ? 'bg-rose-50/60 hover:bg-rose-100/50'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* reg no */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-300/80 text-slate-950 px-2 py-0.5 rounded border border-amber-400 text-[11px] tracking-wide">
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
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-slate-800">
                      {typeof r['milage'] === 'number'
                        ? r['milage'].toLocaleString()
                        : r['milage']}
                    </td>

                    {/* dvsaa */}
                    <td className="py-3 px-4 text-slate-600 leading-relaxed font-mono text-[11px]">
                      {r['dvsaa'] ? (
                        <span>
                          {r['dvsaa']}
                          {r._lastDvsaRaw && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 text-[10px] font-sans font-semibold">
                              Latest: {r._lastDvsaRaw}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-sans">No DVSA data recorded</span>
                      )}
                    </td>

                    {/* d/f */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      {isFlagged ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-sm shadow-rose-200">
                            FLAG
                          </span>
                          {diffFormatted && (
                            <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
                              Δ {diffFormatted} mi
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
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
          records
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
    </div>
  );
};
