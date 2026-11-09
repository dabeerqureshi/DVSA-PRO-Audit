export interface AuditedRecord {
  'reg no': string;
  'make': string;
  'model': string;
  'milage': string | number;
  'dvsaa': string;
  'd/f': number | string; // Difference between auction mileage and last DVSA reading
  // Internal calculation helpers for UI display & sorting
  _isFlagged: boolean;
  _parsedMileage: number | null;
  _parsedDvsa: number | null;
  _dvsaYear: number | null;
  _diff: number | null;
  _lastDvsaRaw: string;
  _rowIdx: number;
}

export interface ColumnMapping {
  regCol: string;
  makeCol?: string;
  modelCol?: string;
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

export type FilterMode = 'FLAGGED' | 'ALL';
