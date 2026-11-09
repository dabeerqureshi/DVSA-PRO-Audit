'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';

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
      setParseError(err.message || 'Failed to read spreadsheet. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    }
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
    <div className="w-full">
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
                <span className="text-indigo-600">Active File: {currentFileName}</span>
              ) : (
                'Drop your auction spreadsheet here, or browse'
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Supports BCA & dealer reports in Excel (.xlsx, .xls) and CSV format
            </p>
          </div>

          <div className="inline-flex items-center space-x-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Auto-detects Column F (Reg), Column Q (Mileage), Column X (DVSA)</span>
          </div>
        </div>
      </div>

      {parseError && (
        <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to process file</p>
            <p className="mt-0.5 text-rose-700">{parseError}</p>
          </div>
        </div>
      )}
    </div>
  );
};
