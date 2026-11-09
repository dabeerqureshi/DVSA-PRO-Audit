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
  year: number | null;
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
  let year: number | null = null;
  const matchDate = trimmed.match(/\((\d{1,4})[\/\.-](\d{1,2})[\/\.-](\d{1,4})\)/);
  if (matchDate) {
    const p1 = parseInt(matchDate[1], 10);
    const p2 = parseInt(matchDate[2], 10);
    const p3 = parseInt(matchDate[3], 10);

    if (p1 > 1000) {
      // YYYY-MM-DD
      year = p1;
      timestamp = new Date(p1, p2 - 1, p3).getTime();
    } else {
      // DD/MM/YYYY or DD/MM/YY
      let y = p3;
      if (y < 100) y += y > 50 ? 1900 : 2000;
      year = y;
      timestamp = new Date(y, p2 - 1, p1).getTime();
    }
    if (isNaN(timestamp)) {
      timestamp = null;
      year = null;
    }
  }

  return { value, timestamp, year, raw: trimmed };
}

export function parseLastDvsa(str: any): {
  value: number | null;
  rawPart: string;
  year: number | null;
} {
  if (str === null || str === undefined) return { value: null, rawPart: '', year: null };
  const raw = String(str).trim();
  if (!raw) return { value: null, rawPart: '', year: null };

  // Case 1: Pure single numeric reading (e.g. '42,000' or '45000') without dates/letters
  if (/^[\d,.\s]+$/.test(raw)) {
    const clean = raw.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return { value: isNaN(num) ? null : num, rawPart: raw, year: null };
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
    return { value: null, rawPart: raw, year: null };
  }

  const parsedEntries = parts.map(parseDvsaSingleEntry);

  // Use only 2025 and 2026 entries if present
  const entries2025_2026 = parsedEntries.filter(
    (e) => (e.year === 2025 || e.year === 2026) && e.value !== null && e.timestamp !== null
  );

  if (entries2025_2026.length > 0) {
    entries2025_2026.sort((a, b) => (b.timestamp as number) - (a.timestamp as number));
    return {
      value: entries2025_2026[0].value,
      rawPart: entries2025_2026[0].raw,
      year: entries2025_2026[0].year,
    };
  }

  // If no 2025/2026 entry, find chronologically newest entry with date to record its year
  const withDates = parsedEntries.filter((e) => e.timestamp !== null && e.value !== null);
  if (withDates.length > 0) {
    withDates.sort((a, b) => (b.timestamp as number) - (a.timestamp as number));
    return {
      value: withDates[0].value,
      rawPart: withDates[0].raw,
      year: withDates[0].year,
    };
  }

  // If no dates, choose the last recorded entry in the string sequence
  const last = parsedEntries[parsedEntries.length - 1];
  return { value: last.value, rawPart: last.raw, year: last.year };
}

export function auditRecords(
  rows: Array<Record<string, any>>,
  mapping: ColumnMapping,
  threshold: number = 20000
): AuditedRecord[] {
  return rows.map((row, idx) => {
    const reg = String(row[mapping.regCol] ?? '').trim();
    const make = mapping.makeCol ? String(row[mapping.makeCol] ?? '').trim() : '';
    const model = mapping.modelCol ? String(row[mapping.modelCol] ?? '').trim() : '';
    const rawMil = row[mapping.milCol] ?? '';
    const rawDvsa = String(row[mapping.dvsaCol] ?? '').trim();

    const milNum = parseMileage(rawMil);
    const { value: dvsaNum, rawPart, year: dvsaYear } = parseLastDvsa(rawDvsa);

    let isFlagged = false;
    let diff: number | null = null;
    let dfVal: number | string = '';

    // Condition 1: Must have 2025 or 2026 DVSA date stamp ("use only 2025 and 2026 data")
    const isYearValid = dvsaYear === 2025 || dvsaYear === 2026;

    // Condition 2: Recent DVSA mileage must not be zero ("if recent dvssa miage is zero dont include them in the list")
    const isDvsaNonZero = dvsaNum !== null && dvsaNum > 0;

    // Condition 3: Auction mileage must be strictly greater than last DVSA reading ("milage is greater than last dvsa")
    if (isYearValid && isDvsaNonZero && milNum !== null && milNum > (dvsaNum as number)) {
      // Formula: milage - dvsaa most recent entry (always positive, never negative)
      diff = milNum - (dvsaNum as number);
      // Exclude placeholder auction mileages (1 or 999,999) from the final flagged list
      const isPlaceholder = milNum === 1 || milNum === 999999;
      if (diff >= threshold && !isPlaceholder) {
        isFlagged = true;
      }
      dfVal = Math.round(diff);
    }

    return {
      'reg no': reg,
      'make': make,
      'model': model,
      'milage': rawMil,
      'dvsaa': rawDvsa,
      'd/f': dfVal,
      _isFlagged: isFlagged,
      _parsedMileage: milNum,
      _parsedDvsa: dvsaNum,
      _dvsaYear: dvsaYear,
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
    if (r._isFlagged) {
      flagged++;
    }
    if (r._diff !== null) {
      const absDiff = Math.abs(r._diff);
      if (absDiff > maxDiff) {
        maxDiff = absDiff;
      }
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
  let makeCol = '';
  let modelCol = '';
  let milCol = '';
  let dvsaCol = '';

  for (const col of headers) {
    const lower = col.toLowerCase().trim();
    if (!regCol && (lower.includes('registration') || lower.includes('vrm') || lower === 'reg' || lower === 'reg no')) {
      regCol = col;
    } else if (!makeCol && (lower === 'make' || lower.includes('manufacturer'))) {
      makeCol = col;
    } else if (!modelCol && lower === 'model') {
      modelCol = col;
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

  // Secondary checks if make or model weren't matched exactly
  if (!makeCol) {
    for (const col of headers) {
      const lower = col.toLowerCase().trim();
      if (lower.includes('make')) {
        makeCol = col;
        break;
      }
    }
  }

  if (!modelCol) {
    for (const col of headers) {
      const lower = col.toLowerCase().trim();
      if (lower.includes('model')) {
        modelCol = col;
        break;
      }
    }
  }

  // Fallbacks by column position if not found by string
  if (!regCol && headers.length > 5) regCol = headers[5]; // Col F in BCA
  if (!makeCol && headers.length > 6) makeCol = headers[6]; // Col G in BCA
  if (!modelCol && headers.length > 7) modelCol = headers[7]; // Col H in BCA
  if (!milCol && headers.length > 16) milCol = headers[16]; // Col Q in BCA
  if (!dvsaCol && headers.length > 23) dvsaCol = headers[23]; // Col X in BCA

  // Final fallback to first headers
  if (!regCol) regCol = headers[0] || 'Column 1';
  if (!milCol) milCol = headers[1] || 'Column 2';
  if (!dvsaCol) dvsaCol = headers[2] || 'Column 3';

  return {
    headerRowIndex,
    headers,
    mapping: { regCol, makeCol, modelCol, milCol, dvsaCol },
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
