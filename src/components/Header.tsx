import React from 'react';
import { ShieldCheck, FileSpreadsheet, Sparkles } from 'lucide-react';

interface HeaderProps {
  onLoadSample: () => void;
  hasData: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadSample, hasData }) => {
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
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition shadow-sm active:scale-95"
            title="Load authentic BCA sample spreadsheet"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
            <span>Load Sample Data</span>
          </button>
        </div>
      </div>
    </header>
  );
};
