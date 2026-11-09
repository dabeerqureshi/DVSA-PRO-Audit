'use client';

import React, { useState } from 'react';
import { ColumnMapping } from '../lib/types';
import { X, Check, HelpCircle } from 'lucide-react';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  initialMapping: ColumnMapping;
  onSave: (mapping: ColumnMapping) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  headers,
  initialMapping,
  onSave,
}) => {
  const [regCol, setRegCol] = useState(initialMapping.regCol);
  const [milCol, setMilCol] = useState(initialMapping.milCol);
  const [dvsaCol, setDvsaCol] = useState(initialMapping.dvsaCol);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ regCol, milCol, dvsaCol });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Custom Column Mapping</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select which sheet column binds to each auditing field.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 py-5 text-sm">
          {/* Registration Column */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vehicle Registration (Target: &apos;reg no&apos;)
            </label>
            <select
              value={regCol}
              onChange={(e) => setRegCol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm font-medium"
            >
              {headers.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* Mileage Column */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Auction Odometer Mileage (Target: &apos;milage&apos;)
            </label>
            <select
              value={milCol}
              onChange={(e) => setMilCol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm font-medium"
            >
              {headers.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          {/* DVSA Mileage Column */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              DVSA MOT History (Target: &apos;dvsaa&apos;)
            </label>
            <select
              value={dvsaCol}
              onChange={(e) => setDvsaCol(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm font-medium"
            >
              {headers.map((h, i) => (
                <option key={i} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Apply Mapping
          </button>
        </div>
      </div>
    </div>
  );
};
