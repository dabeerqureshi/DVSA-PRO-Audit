'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Header } from '@/components/Header';
import { FileUploadZone } from '@/components/FileUploadZone';
import { KpiStats } from '@/components/KpiStats';
import { AuditSettings } from '@/components/AuditSettings';
import { ColumnMappingModal } from '@/components/ColumnMappingModal';
import { AuditTable } from '@/components/AuditTable';
import { ExportBar } from '@/components/ExportBar';
import { AuditedRecord, AuditStats, ColumnMapping } from '@/lib/types';
import {
  auditRecords,
  computeStats,
  detectHeaders,
  extractValidVehicleRows,
} from '@/lib/auditEngine';
import { FileSpreadsheet, CheckCircle2, ArrowRight } from 'lucide-react';

export default function Home() {
  const [threshold, setThreshold] = useState<number>(30000);
  const [rawRows, setRawRows] = useState<any[][] | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    regCol: 'Registration Number',
    milCol: 'Mileage',
    dvsaCol: 'DVSA Mileage',
  });
  const [dataRows, setDataRows] = useState<Array<Record<string, any>>>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isMappingOpen, setIsMappingOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Audited records computation
  const records = useMemo<AuditedRecord[]>(() => {
    if (!dataRows.length) return [];
    return auditRecords(dataRows, mapping, threshold);
  }, [dataRows, mapping, threshold]);

  // Statistics computation
  const stats = useMemo<AuditStats>(() => {
    return computeStats(records);
  }, [records]);

  // Handle spreadsheet parsed by FileUploadZone
  const handleFileParsed = useCallback(
    ({
      rawRows,
      fileName,
    }: {
      rawRows: any[][];
      fileName: string;
      sheetNames: string[];
      selectedSheet: string;
    }) => {
      setIsLoading(true);
      setFileName(fileName);
      setRawRows(rawRows);

      const detection = detectHeaders(rawRows);
      setHeaderRowIndex(detection.headerRowIndex);
      setHeaders(detection.headers);
      setMapping(detection.mapping);

      // Cleanly extract valid vehicle rows, skipping subheaders & empty registrations
      const rows = extractValidVehicleRows(
        rawRows,
        detection.headerRowIndex,
        detection.mapping,
        detection.headers
      );

      setDataRows(rows);
      setIsLoading(false);
    },
    []
  );

  const handleMappingSave = useCallback(
    (newMapping: ColumnMapping) => {
      setMapping(newMapping);
      if (rawRows && headers.length > 0) {
        const rows = extractValidVehicleRows(
          rawRows,
          headerRowIndex,
          newMapping,
          headers
        );
        setDataRows(rows);
      }
    },
    [rawRows, headerRowIndex, headers]
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header hasData={records.length > 0} fileName={fileName} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Verification banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-950 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                AUDIT FORMULA
              </span>
              <span className="font-mono text-xs text-indigo-200">
                |milage - dvsa_last| &gt; {threshold.toLocaleString()} → FLAG
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Vehicle Mileage Verification &amp; DVSA Discrepancy Auditing
            </h2>
            <p className="text-xs text-slate-300">
              Upload your spreadsheet to extract Registration, Mileage, DVSA History, and flag differences &gt; {threshold.toLocaleString()} miles. Output schema: <span className="font-mono text-indigo-300">reg no, milage, dvsaa, d/f</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-3.5 py-2 rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% Client-Side Processing</span>
          </div>
        </div>

        {/* Upload Zone */}
        <FileUploadZone
          onFileParsed={handleFileParsed}
          isLoading={isLoading}
          currentFileName={fileName}
        />

        {/* Empty State when no file uploaded */}
        {records.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                No spreadsheet uploaded yet
              </h3>
              <p className="text-xs text-slate-500">
                Upload your Excel (.xlsx, .xls) or CSV sheet above to instantly view the audited results, KPI summary, and download the flagged report.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2 text-left">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-semibold text-slate-700">1. reg no</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Registration Number</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-semibold text-slate-700">2. milage</div>
                <div className="text-slate-400 text-[11px] mt-0.5">Listed Odometer</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-semibold text-slate-700">3. dvsaa</div>
                <div className="text-slate-400 text-[11px] mt-0.5">DVSA MOT History</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="font-semibold text-rose-600">4. d/f</div>
                <div className="text-slate-400 text-[11px] mt-0.5">&gt; 30,000 diff = FLAG</div>
              </div>
            </div>
          </div>
        )}

        {/* Audited Results when file is uploaded */}
        {records.length > 0 && (
          <div className="space-y-6">
            <KpiStats stats={stats} threshold={threshold} />

            <AuditSettings
              threshold={threshold}
              onThresholdChange={setThreshold}
              onOpenMapping={() => setIsMappingOpen(true)}
              mapping={mapping}
            />

            <ExportBar records={records} flaggedCount={stats.flagged} />

            <AuditTable records={records} threshold={threshold} />
          </div>
        )}
      </main>

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={isMappingOpen}
        onClose={() => setIsMappingOpen(false)}
        headers={headers}
        initialMapping={mapping}
        onSave={handleMappingSave}
      />

      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DVSA Vehicle Mileage Discrepancy Auditing System &bull; Production</span>
          <span>Deployable to Vercel &bull; Next.js 14 &bull; SheetJS Engine</span>
        </div>
      </footer>
    </div>
  );
}
