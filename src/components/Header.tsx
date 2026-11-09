import React from 'react';
import { ShieldCheck, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  hasData: boolean;
  fileName?: string;
}

export const Header: React.FC<HeaderProps> = ({ hasData, fileName }) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            DVSA Mileage Audit
          </h1>
        </div>

        {hasData && fileName && (
          <div className="inline-flex items-center px-2 py-1 sm:px-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 shrink min-w-0 max-w-[140px] sm:max-w-[240px]">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 sm:mr-1.5 text-indigo-600 shrink-0" />
            <span className="truncate">{fileName}</span>
          </div>
        )}
      </div>
    </header>
  );
};
