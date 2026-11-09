import React from 'react';
import { ShieldCheck, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  hasData: boolean;
  fileName?: string;
}

export const Header: React.FC<HeaderProps> = ({ hasData, fileName }) => {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                DVSA Mileage Pro Audit
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                v1.0 Production
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Auction Odometer vs. DVSA MOT History Verification Engine
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasData && fileName && (
            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              <span className="max-w-[200px] truncate">{fileName}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
