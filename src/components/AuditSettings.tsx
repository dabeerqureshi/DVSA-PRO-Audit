'use client';

import React from 'react';
import { SlidersHorizontal, Settings2 } from 'lucide-react';
import { ColumnMapping } from '../lib/types';

interface AuditSettingsProps {
  threshold: number;
  onThresholdChange: (newVal: number) => void;
  onOpenMapping: () => void;
  mapping: ColumnMapping;
}

export const AuditSettings: React.FC<AuditSettingsProps> = ({
  threshold,
  onThresholdChange,
  onOpenMapping,
}) => {
  const presets = [10000, 20000, 30000, 50000];

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
      {/* Threshold controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center space-x-1.5 text-slate-700 font-semibold text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
          <span>Threshold:</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {presets.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => onThresholdChange(val)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                threshold === val
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {(val / 1000).toLocaleString()}k mi
            </button>
          ))}

          {/* Custom Input */}
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              step="1000"
              value={threshold}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num) && num >= 0) {
                  onThresholdChange(num);
                }
              }}
              className="w-24 text-xs font-semibold px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
            />
            <span className="text-xs text-slate-400 ml-1">mi</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenMapping}
        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
      >
        <Settings2 className="w-3.5 h-3.5 text-slate-500" />
        <span>Columns</span>
      </button>
    </div>
  );
};
