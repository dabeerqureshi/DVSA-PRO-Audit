export interface AuditedRecord {
  'reg no': string;
  'milage': string | number;
  'dvsaa': string;
  'd/f': 'FLAG' | '';
  // Internal calculation helpers for UI display & sorting
  _parsedMileage: number | null;
  _parsedDvsa: number | null;
  _diff: number | null;
  _lastDvsaRaw: string;
  _rowIdx: number;
}

export interface ColumnMapping {
  regCol: string;
  milCol: string;
  dvsaCol: string;
}

export interface AuditStats {
  total: number;
  flagged: number;
  passed: number;
  passRate: number;
  maxDiff: number;
}

export type FilterMode = 'ALL' | 'FLAGGED' | 'PASSED';
