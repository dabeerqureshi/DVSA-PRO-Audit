'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Header } from '@/components/Header';
import { FileUploadZone } from '@/components/FileUploadZone';
import { KpiStats } from '@/components/KpiStats';
import { ColumnMappingModal } from '@/components/ColumnMappingModal';
import { AuditTable } from '@/components/AuditTable';
import { AuditedRecord, AuditStats, ColumnMapping } from '@/lib/types';
import {
  auditRecords,
  computeStats,
  detectHeaders,
  extractValidVehicleRows,
} from '@/lib/auditEngine';

const THRESHOLD = 20000;

export default function Home() {
  const [rawRows, setRawRows] = useState<any[][] | null>(null);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    regCol: 'Registration Number',
    makeCol: 'Make',
    modelCol: 'Model',
    milCol: 'Mileage',
    dvsaCol: 'DVSA Mileage',
  });
  const [dataRows, setDataRows] = useState<Array<Record<string, any>>>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isMappingOpen, setIsMappingOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Audited records computation strictly at 20,000 threshold
  const records = useMemo<AuditedRecord[]>(() => {
    if (!dataRows.length) return [];
    return auditRecords(dataRows, mapping, THRESHOLD);
  }, [dataRows, mapping]);

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-3.5 sm:space-y-4">
        {/* Upload Zone */}
        <FileUploadZone
          onFileParsed={handleFileParsed}
          isLoading={isLoading}
          currentFileName={fileName}
        />

        {/* Audited Results when file is uploaded */}
        {records.length > 0 && (
          <div className="space-y-4">
            <KpiStats stats={stats} />

            <AuditTable
              records={records}
              onOpenMapping={() => setIsMappingOpen(true)}
            />
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

      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <span>DVSA Mileage Audit</span>
        </div>
      </footer>
    </div>
  );
}
