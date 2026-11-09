import React from 'react';
import { AuditStats } from '../lib/types';
import { AlertTriangle, CheckCircle2, Car, TrendingUp, Gauge } from 'lucide-react';

interface KpiStatsProps {
  stats: AuditStats;
  threshold: number;
}

export const KpiStats: React.FC<KpiStatsProps> = ({ stats, threshold }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
      {/* Total Scanned */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Scanned
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Car className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.total.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-medium">vehicles</span>
        </div>
      </div>

      {/* Flagged */}
      <div className="bg-rose-50/70 rounded-2xl p-4 sm:p-5 border border-rose-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
            Flagged
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-rose-700 tracking-tight">
            {stats.flagged.toLocaleString()}
          </span>
          <span className="text-xs text-rose-500 font-medium">
            &gt; {threshold.toLocaleString()} mi
          </span>
        </div>
      </div>

      {/* Passed */}
      <div className="bg-emerald-50/70 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Passed
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">
            {stats.passed.toLocaleString()}
          </span>
          <span className="text-xs text-emerald-500 font-medium">verified</span>
        </div>
      </div>

      {/* Pass Rate */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pass Rate
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.passRate}%
          </span>
        </div>
      </div>

      {/* Max Discrepancy */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm relative overflow-hidden col-span-2 md:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Max Discrepancy
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
            {stats.maxDiff.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-medium">mi</span>
        </div>
      </div>
    </div>
  );
};
