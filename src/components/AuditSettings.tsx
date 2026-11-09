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
  mapping,
}) => {
  const presets = [10000, 20000, 30000, 50000];

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Threshold controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center space-x-2 text-slate-700 font-semibold text-xs uppercase tracking-wider">
          <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
          <span>Flag Threshold:</span>
        </div>

        <div className="flex items-center space-x-2">
          {presets.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => onThresholdChange(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                threshold === val
                  ? 'bg-indigo-600 text-white shadow-sm'
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
              className="w-28 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-800"
              title="Custom mileage threshold"
            />
            <span className="text-xs text-slate-400 ml-1.5 font-medium">miles</span>
          </div>
        </div>
      </div>

      {/* Column mapping status & override */}
      <div className="flex items-center space-x-3 text-xs text-slate-600">
        <div className="hidden sm:flex items-center space-x-2">
          <span className="text-slate-400">Mapped:</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700">
            Reg: {mapping.regCol}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700">
            Mil: {mapping.milCol}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] text-slate-700">
            DVSA: {mapping.dvsaCol}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenMapping}
          className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
        >
          <Settings2 className="w-3.5 h-3.5 mr-1" />
          <span>Edit Columns</span>
        </button>
      </div>
    </div>
  );
};
