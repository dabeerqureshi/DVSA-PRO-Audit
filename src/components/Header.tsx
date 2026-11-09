import React from 'react';
import { ShieldCheck, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  hasData: boolean;
  fileName?: string;
}

export const Header: React.FC<HeaderProps> = ({ hasData, fileName }) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight">
            DVSA Mileage Audit
          </h1>
        </div>

        {hasData && fileName && (
          <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            <span className="max-w-[200px] truncate">{fileName}</span>
          </div>
        )}
      </div>
    </header>
  );
};
