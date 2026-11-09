import React from 'react';
import { AuditStats } from '../lib/types';
import { AlertTriangle } from 'lucide-react';

interface KpiStatsProps {
  stats: AuditStats;
}

export const KpiStats: React.FC<KpiStatsProps> = ({ stats }) => {
  return (
    <div className="bg-rose-50/70 rounded-2xl p-3.5 sm:p-4 border border-rose-200/80 shadow-xs flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-600">
            Flagged Discrepancies
          </span>
          <div className="flex items-baseline space-x-2 mt-0.5">
            <span className="text-xl sm:text-2xl font-extrabold text-rose-700 tracking-tight">
              {stats.flagged.toLocaleString()}
            </span>
            <span className="text-xs text-rose-500 font-medium">
              vehicles &ge; 20,000 mi difference
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
