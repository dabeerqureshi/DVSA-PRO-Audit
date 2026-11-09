import { AuditedRecord, ColumnMapping, AuditStats } from './types';

export function parseMileage(val: any): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;

  // Check if string is formatted with k multiplier e.g. '85k' or '85.5k'
  const matchK = str.match(/^(\d+(?:\.\d+)?)\s*k$/i);
  if (matchK) {
    const base = parseFloat(matchK[1]);
    return isNaN(base) ? null : Math.round(base * 1000);
  }

  const clean = str.replace(/[^\d.]/g, '');
  if (!clean) return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

interface ParsedDvsaEntry {
  value: number | null;
  timestamp: number | null;
  raw: string;
}

function parseDvsaSingleEntry(entryStr: string): ParsedDvsaEntry {
  const trimmed = entryStr.trim();
  let value: number | null = null;

  // Match formats like '57k (09/06/2026)', '102.5k', '57 k'
  const matchK = trimmed.match(/(\d+(?:\.\d+)?)\s*k/i);
  if (matchK) {
    const base = parseFloat(matchK[1]);
    if (!isNaN(base)) {
      value = Math.round(base * 1000);
    }
  } else {
    // Match full integer numbers like '118,505' or '42,000'
    const matchNum = trimmed.match(/(\d[\d,]*)/);
    if (matchNum) {
      const clean = matchNum[1].replace(/,/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num)) {
        value = num;
      }
    }
  }

  // Parse date stamps like (DD/MM/YYYY), (DD-MM-YYYY), (DD.MM.YYYY), (YYYY-MM-DD)
  let timestamp: number | null = null;
  const matchDate = trimmed.match(/\((\d{1,4})[\/\.-](\d{1,2})[\/\.-](\d{1,4})\)/);
  if (matchDate) {
    const p1 = parseInt(matchDate[1], 10);
    const p2 = parseInt(matchDate[2], 10);
    const p3 = parseInt(matchDate[3], 10);

    if (p1 > 1000) {
      // YYYY-MM-DD
      timestamp = new Date(p1, p2 - 1, p3).getTime();
    } else {
      // DD/MM/YYYY or DD/MM/YY
      let y = p3;
      if (y < 100) y += y > 50 ? 1900 : 2000;
      timestamp = new Date(y, p2 - 1, p1).getTime();
    }
    if (isNaN(timestamp)) {
      timestamp = null;
    }
  }

  return { value, timestamp, raw: trimmed };
}

export function parseLastDvsa(str: any): { value: number | null; rawPart: string } {
  if (str === null || str === undefined) return { value: null, rawPart: '' };
  const raw = String(str).trim();
  if (!raw) return { value: null, rawPart: '' };

  // Case 1: Pure single numeric reading (e.g. '42,000' or '45000') without dates/letters
  if (/^[\d,.\s]+$/.test(raw)) {
    const clean = raw.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return { value: isNaN(num) ? null : num, rawPart: raw };
  }

  // Case 2: Multi-entry history
  let parts: string[] = [];
  if (raw.includes(')')) {
    // If entries have parentheses (date stamps), split after ')'
    parts = raw.split(/\)\s*,\s*/).map((s, idx, arr) => {
      const trimmed = s.trim();
      return idx < arr.length - 1 && !trimmed.endsWith(')') ? trimmed + ')' : trimmed;
    });
  } else {
    // Split on commas that are not thousands separators
    parts = raw.split(/(?<!\d),\s*|,\s*(?!\d{3}(?:\D|$))/).map((s) => s.trim());
  }

  parts = parts.filter(Boolean);
  if (parts.length === 0) {
    return { value: null, rawPart: raw };
  }

  const parsedEntries = parts.map(parseDvsaSingleEntry);

  // If entries contain valid date stamps, identify the chronologically newest record
  const withDates = parsedEntries.filter((e) => e.timestamp !== null && e.value !== null);
  if (withDates.length > 0) {
    withDates.sort((a, b) => (b.timestamp as number) - (a.timestamp as number));
    return { value: withDates[0].value, rawPart: withDates[0].raw };
  }

  // If no dates, choose the last recorded entry in the string sequence
  const last = parsedEntries[parsedEntries.length - 1];
  return { value: last.value, rawPart: last.raw };
}

export function auditRecords(
  rows: Array<Record<string, any>>,
  mapping: ColumnMapping,
  threshold: number = 30000
): AuditedRecord[] {
  return rows.map((row, idx) => {
    const reg = String(row[mapping.regCol] ?? '').trim();
    const rawMil = row[mapping.milCol] ?? '';
    const rawDvsa = String(row[mapping.dvsaCol] ?? '').trim();

    const milNum = parseMileage(rawMil);
    const { value: dvsaNum, rawPart } = parseLastDvsa(rawDvsa);

    let flag: 'FLAG' | '' = '';
    let diff: number | null = null;

    if (milNum !== null && dvsaNum !== null) {
      diff = Math.abs(milNum - dvsaNum);
      if (diff > threshold) {
        flag = 'FLAG';
      }
    }

    return {
      'reg no': reg,
      'milage': rawMil,
      'dvsaa': rawDvsa,
      'd/f': flag,
      _parsedMileage: milNum,
      _parsedDvsa: dvsaNum,
      _diff: diff,
      _lastDvsaRaw: rawPart,
      _rowIdx: idx,
    };
  });
}

export function computeStats(records: AuditedRecord[]): AuditStats {
  const total = records.length;
  if (total === 0) {
    return { total: 0, flagged: 0, passed: 0, passRate: 100, maxDiff: 0 };
  }

  let flagged = 0;
  let maxDiff = 0;

  for (const r of records) {
    if (r['d/f'] === 'FLAG') {
      flagged++;
    }
    if (r._diff !== null && r._diff > maxDiff) {
      maxDiff = r._diff;
    }
  }

  const passed = total - flagged;
  const passRate = total > 0 ? Number(((passed / total) * 100).toFixed(1)) : 100;

  return {
    total,
    flagged,
    passed,
    passRate,
    maxDiff,
  };
}

export function detectHeaders(rawSheet: any[][]): {
  headerRowIndex: number;
  headers: string[];
  mapping: ColumnMapping;
} {
  let headerRowIndex = -1;

  for (let r = 0; r < Math.min(rawSheet.length, 12); r++) {
    const row = rawSheet[r];
    if (!Array.isArray(row)) continue;
    const rowStr = row.map((cell) => String(cell || '').toLowerCase()).join(' | ');

    if (
      (rowStr.includes('registration') || rowStr.includes('vrm') || rowStr.includes('reg no')) &&
      (rowStr.includes('mileage') || rowStr.includes('odometer'))
    ) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headers = (rawSheet[headerRowIndex] || []).map((h, i) =>
    h !== undefined && h !== null && String(h).trim() ? String(h).trim() : `Column ${i + 1}`
  );

  let regCol = '';
  let milCol = '';
  let dvsaCol = '';

  for (const col of headers) {
    const lower = col.toLowerCase();
    if (!regCol && (lower.includes('registration') || lower.includes('vrm') || lower === 'reg' || lower === 'reg no')) {
      regCol = col;
    } else if (
      !dvsaCol &&
      (lower.includes('dvsa') || lower.includes('mot mileage') || lower.includes('dvsaa'))
    ) {
      dvsaCol = col;
    } else if (
      !milCol &&
      !lower.includes('service') &&
      !lower.includes('warranty') &&
      (lower.includes('mileage') || lower.includes('odometer') || lower === 'milage')
    ) {
      milCol = col;
    }
  }

  // Fallbacks by column position if not found by string
  if (!regCol && headers.length > 5) regCol = headers[5]; // Col F in BCA
  if (!milCol && headers.length > 16) milCol = headers[16]; // Col Q in BCA
  if (!dvsaCol && headers.length > 23) dvsaCol = headers[23]; // Col X in BCA

  // Final fallback to first 3 headers
  if (!regCol) regCol = headers[0] || 'Column 1';
  if (!milCol) milCol = headers[1] || 'Column 2';
  if (!dvsaCol) dvsaCol = headers[2] || 'Column 3';

  return {
    headerRowIndex,
    headers,
    mapping: { regCol, milCol, dvsaCol },
  };
}

export function extractValidVehicleRows(
  rawSheet: any[][],
  headerRowIndex: number,
  mapping: ColumnMapping,
  headers: string[]
): Array<Record<string, any>> {
  const rows: Array<Record<string, any>> = [];
  const regColIdx = headers.indexOf(mapping.regCol);

  for (let i = headerRowIndex + 1; i < rawSheet.length; i++) {
    const rawRow = rawSheet[i];
    if (!Array.isArray(rawRow) || rawRow.length === 0) continue;

    const regVal =
      regColIdx !== -1 && rawRow[regColIdx] !== undefined
        ? String(rawRow[regColIdx]).trim()
        : '';

    // Ignore rows where registration is missing or matches subheader labels
    if (!regVal) continue;
    const regLower = regVal.toLowerCase();
    if (
      regLower.includes('registration') ||
      regLower.includes('guide price') ||
      regLower.includes('cap price') ||
      regLower.includes('glass price') ||
      regLower.includes('buy now') ||
      regLower.includes('cap new') ||
      regLower.includes('cap clean')
    ) {
      continue;
    }

    const rowObj: Record<string, any> = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
    });

    rows.push(rowObj);
  }

  return rows;
}
