'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  Clipboard,
  Sparkles,
  X,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SAMPLE_AUCTION_DATA } from '@/lib/sampleData';

interface FileUploadZoneProps {
  onFileParsed: (data: {
    rawRows: any[][];
    fileName: string;
    sheetNames: string[];
    selectedSheet: string;
  }) => void;
  isLoading: boolean;
  currentFileName?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileParsed,
  isLoading,
  currentFileName,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setParseError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in workbook.');
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      }) as any[][];

      if (!rawRows || rawRows.length === 0) {
        throw new Error('The selected spreadsheet appears to be empty.');
      }

      onFileParsed({
        rawRows,
        fileName: file.name,
        sheetNames: workbook.SheetNames,
        selectedSheet: sheetName,
      });
    } catch (err: any) {
      console.error(err);
      setParseError(
        err.message ||
          'Failed to read spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.'
      );
    }
  };

  const processTextData = (text: string, sourceName = 'pasted_auction_data.tsv') => {
    setParseError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setParseError('Please paste valid tabular or spreadsheet data.');
      return;
    }

    try {
      const workbook = XLSX.read(trimmed, { type: 'string' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Could not parse any sheets from text data.');
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      }) as any[][];

      if (!rawRows || rawRows.length === 0) {
        throw new Error('The spreadsheet content appears to be empty.');
      }

      onFileParsed({
        rawRows,
        fileName: sourceName,
        sheetNames: workbook.SheetNames,
        selectedSheet: sheetName,
      });
      setIsPasteModalOpen(false);
      setPastedText('');
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || 'Failed to parse tabular data. Please verify column formatting.');
    }
  };

  const handleLoadSample = () => {
    processTextData(SAMPLE_AUCTION_DATA, 'bca_sample_auction_vehicles.tsv');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 group ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.005]'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
              isDragging
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-base font-semibold text-slate-800">
              {currentFileName ? (
                <span className="text-indigo-600 font-bold">Active File: {currentFileName}</span>
              ) : (
                'Drop your auction spreadsheet here, or browse'
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports BCA &amp; dealer reports in Excel (.xlsx, .xls) and CSV format
            </p>
          </div>

          <div className="inline-flex items-center space-x-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Auto-detects Column F (Reg), Column Q (Mileage), Column X (DVSA)</span>
          </div>
        </div>
      </div>

      {/* Quick Ingestion Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Load Sample Auction Data (10 Vehicles)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition shadow-sm"
          >
            <Clipboard className="w-3.5 h-3.5 text-slate-500" />
            <span>Paste Spreadsheet / TSV Data</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          Client-side parsing &bull; Sub-headers &amp; pricing rows auto-skipped
        </span>
      </div>

      {parseError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to process data</p>
            <p className="mt-0.5 text-rose-700">{parseError}</p>
          </div>
        </div>
      )}

      {/* Paste Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Paste Spreadsheet or Tabular Data
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste copied rows directly from Excel, BCA catalog, or Google Sheets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={10}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste tab-separated or comma-separated auction rows here..."
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setPastedText(SAMPLE_AUCTION_DATA)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Insert Sample Data
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => processTextData(pastedText, 'pasted_auction_input.tsv')}
                  disabled={!pastedText.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition"
                >
                  Audit Pasted Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
