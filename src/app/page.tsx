'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from '@/lib/auditEngine';
import { SAMPLE_DATA } from '@/lib/sampleData';
import { ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [threshold, setThreshold] = useState<number>(30000);
  const [rawRows, setRawRows] = useState<any[][] | null>(null);
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
      setHeaders(detection.headers);
      setMapping(detection.mapping);

      // Extract rows following the detected header index
      const rows: Array<Record<string, any>> = [];
      for (let i = detection.headerRowIndex + 1; i < rawRows.length; i++) {
        const rawRow = rawRows[i];
        if (!Array.isArray(rawRow) || rawRow.length === 0) continue;

        const rowObj: Record<string, any> = {};
        detection.headers.forEach((h, colIdx) => {
          rowObj[h] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
        });

        // Skip completely empty rows
        const hasContent = Object.values(rowObj).some(
          (v) => v !== '' && v !== null && v !== undefined
        );
        if (hasContent) {
          rows.push(rowObj);
        }
      }

      setDataRows(rows);
      setIsLoading(false);
    },
    []
  );

  // Load sample dataset
  const handleLoadSample = useCallback(() => {
    setIsLoading(true);
    setFileName('BCA_Auction_Demo_Batch.xlsx');
    setHeaders(['Registration Number', 'Mileage', 'DVSA Mileage', 'Make', 'Model', 'Grade']);
    setMapping({
      regCol: 'Registration Number',
      milCol: 'Mileage',
      dvsaCol: 'DVSA Mileage',
    });
    setDataRows(SAMPLE_DATA);
    setIsLoading(false);
  }, []);

  // Preload sample data on initial mount for instant demo experience
  useEffect(() => {
    handleLoadSample();
  }, [handleLoadSample]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header onLoadSample={handleLoadSample} hasData={records.length > 0} />

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
              Automated Mileage Verification &amp; DVSA MOT History Auditing
            </h2>
            <p className="text-xs text-slate-300">
              Drag-and-drop any BCA auction report. The system automatically identifies headers, parses the latest DVSA MOT reading, flags discrepancies exceeding {threshold.toLocaleString()} miles, and exports directly to <span className="font-mono text-indigo-300">reg no, milage, dvsaa, d/f</span>.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-3.5 py-2 rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>100% In-Browser &bull; Zero Server Latency</span>
          </div>
        </div>

        {/* Upload Zone */}
        <FileUploadZone
          onFileParsed={handleFileParsed}
          isLoading={isLoading}
          currentFileName={fileName}
        />

        {/* KPI Summary Cards */}
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
        onSave={setMapping}
      />

      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DVSA Vehicle Mileage Discrepancy Auditing System &bull; Production Build</span>
          <span>Deployable to Vercel &bull; Next.js 14 &bull; SheetJS Engine</span>
        </div>
      </footer>
    </div>
  );
}
