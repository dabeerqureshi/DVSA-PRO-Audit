'use client';

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  RefreshCw,
  Clipboard,
  Sparkles,
  X,
  FileText,
  AlertCircle,
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
      setParseError('Please paste valid tabular data.');
      return;
    }

    try {
      const workbook = XLSX.read(trimmed, { type: 'string' });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Could not parse sheet data from pasted text.');
      }
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      }) as any[][];

      if (!rawRows || rawRows.length === 0) {
        throw new Error('The pasted content is empty.');
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
      setParseError(err.message || 'Failed to parse tabular data.');
    }
  };

  const handleLoadSample = () => {
    processTextData(SAMPLE_AUCTION_DATA, 'sample_auction_data.tsv');
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
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group ${
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

        <div className="flex flex-col items-center justify-center space-y-2.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
              isDragging
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              {currentFileName ? (
                <span className="text-indigo-600 font-bold">{currentFileName}</span>
              ) : (
                'Upload spreadsheet (.xlsx, .xls, .csv)'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 transition shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Load Sample (10 Vehicles)</span>
        </button>

        <button
          type="button"
          onClick={() => setIsPasteModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 transition shadow-xs"
        >
          <Clipboard className="w-3.5 h-3.5 text-slate-500" />
          <span>Paste Data</span>
        </button>
      </div>

      {parseError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p>{parseError}</p>
        </div>
      )}

      {/* Paste Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Paste Spreadsheet Data
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={9}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste rows copied from Excel or spreadsheet..."
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setPastedText(SAMPLE_AUCTION_DATA)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Insert Sample
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => processTextData(pastedText, 'pasted_auction_input.tsv')}
                  disabled={!pastedText.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition"
                >
                  Audit Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
