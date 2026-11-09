import test from 'node:test';
import assert from 'node:assert/strict';

function parseMileage(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;

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

function parseDvsaSingleEntry(entryStr) {
  const trimmed = entryStr.trim();
  let value = null;

  const matchK = trimmed.match(/(\d+(?:\.\d+)?)\s*k/i);
  if (matchK) {
    const base = parseFloat(matchK[1]);
    if (!isNaN(base)) {
      value = Math.round(base * 1000);
    }
  } else {
    const matchNum = trimmed.match(/(\d[\d,]*)/);
    if (matchNum) {
      const clean = matchNum[1].replace(/,/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num)) {
        value = num;
      }
    }
  }

  let timestamp = null;
  let year = null;
  const matchDate = trimmed.match(/\((\d{1,4})[\/\.-](\d{1,2})[\/\.-](\d{1,4})\)/);
  if (matchDate) {
    const p1 = parseInt(matchDate[1], 10);
    const p2 = parseInt(matchDate[2], 10);
    const p3 = parseInt(matchDate[3], 10);

    if (p1 > 1000) {
      year = p1;
      timestamp = new Date(p1, p2 - 1, p3).getTime();
    } else {
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

function parseLastDvsa(str) {
  if (str === null || str === undefined) return { value: null, rawPart: '', year: null };
  const raw = String(str).trim();
  if (!raw) return { value: null, rawPart: '', year: null };

  if (/^[\d,.\s]+$/.test(raw)) {
    const clean = raw.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return { value: isNaN(num) ? null : num, rawPart: raw, year: null };
  }

  let parts = [];
  if (raw.includes(')')) {
    parts = raw.split(/\)\s*,\s*/).map((s, idx, arr) => {
      const trimmed = s.trim();
      return idx < arr.length - 1 && !trimmed.endsWith(')') ? trimmed + ')' : trimmed;
    });
  } else {
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
    entries2025_2026.sort((a, b) => b.timestamp - a.timestamp);
    return {
      value: entries2025_2026[0].value,
      rawPart: entries2025_2026[0].raw,
      year: entries2025_2026[0].year,
    };
  }

  const withDates = parsedEntries.filter((e) => e.timestamp !== null && e.value !== null);
  if (withDates.length > 0) {
    withDates.sort((a, b) => b.timestamp - a.timestamp);
    return {
      value: withDates[0].value,
      rawPart: withDates[0].raw,
      year: withDates[0].year,
    };
  }

  const last = parsedEntries[parsedEntries.length - 1];
  return { value: last.value, rawPart: last.raw, year: last.year };
}

function detectHeaders(rawSheet) {
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

  if (!makeCol) {
    for (const col of headers) {
      if (col.toLowerCase().trim().includes('make')) {
        makeCol = col;
        break;
      }
    }
  }

  if (!modelCol) {
    for (const col of headers) {
      if (col.toLowerCase().trim().includes('model')) {
        modelCol = col;
        break;
      }
    }
  }

  if (!regCol && headers.length > 5) regCol = headers[5];
  if (!makeCol && headers.length > 6) makeCol = headers[6];
  if (!modelCol && headers.length > 7) modelCol = headers[7];
  if (!milCol && headers.length > 16) milCol = headers[16];
  if (!dvsaCol && headers.length > 23) dvsaCol = headers[23];

  if (!regCol) regCol = headers[0] || 'Column 1';
  if (!milCol) milCol = headers[1] || 'Column 2';
  if (!dvsaCol) dvsaCol = headers[2] || 'Column 3';

  return {
    headerRowIndex,
    headers,
    mapping: { regCol, makeCol, modelCol, milCol, dvsaCol },
  };
}

function extractValidVehicleRows(rawSheet, headerRowIndex, mapping, headers) {
  const rows = [];
  const regColIdx = headers.indexOf(mapping.regCol);

  for (let i = headerRowIndex + 1; i < rawSheet.length; i++) {
    const rawRow = rawSheet[i];
    if (!Array.isArray(rawRow) || rawRow.length === 0) continue;

    const regVal =
      regColIdx !== -1 && rawRow[regColIdx] !== undefined
        ? String(rawRow[regColIdx]).trim()
        : '';

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

    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
    });

    rows.push(rowObj);
  }

  return rows;
}

function audit(milage, dvsaa, threshold = 20000) {
  const milNum = parseMileage(milage);
  const { value: dvsaNum, year: dvsaYear } = parseLastDvsa(dvsaa);
  const isYearValid = dvsaYear === 2025 || dvsaYear === 2026;
  // Only perform if MOT date is in 2025/2026 and mileage is greater than last dvsa
  if (!isYearValid || milNum === null || dvsaNum === null || milNum <= dvsaNum) {
    return { isFlagged: false, diff: null, df: '' };
  }
  // Formula: milage - dvsaa most recent entry (never negative)
  const diff = milNum - dvsaNum;
  const isPlaceholder = milNum === 1 || milNum === 999999;
  const isFlagged = diff >= threshold && !isPlaceholder;
  return { isFlagged, diff: Math.round(diff), df: isFlagged ? Math.round(diff) : '' };
}

test('parseMileage extracts numbers correctly', () => {
  assert.equal(parseMileage('91,094'), 91094);
  assert.equal(parseMileage('1'), 1);
  assert.equal(parseMileage('999,999'), 999999);
  assert.equal(parseMileage(45000), 45000);
  assert.equal(parseMileage('  114,305 miles '), 114305);
  assert.equal(parseMileage('85k'), 85000);
  assert.equal(parseMileage('85.5k'), 85500);
  assert.equal(parseMileage(''), null);
  assert.equal(parseMileage(null), null);
});

test('parseLastDvsa extracts last entry with k and integers', () => {
  const r1 = parseLastDvsa('35k (21/06/2024), 52k (08/07/2025), 57k (09/06/2026)');
  assert.equal(r1.value, 57000);

  const r2 = parseLastDvsa('68k (05/07/2025)');
  assert.equal(r2.value, 68000);

  const r3 = parseLastDvsa('42,000');
  assert.equal(r3.value, 42000);

  const r4 = parseLastDvsa('102.5k (16/07/2025)');
  assert.equal(r4.value, 102500);

  const r5 = parseLastDvsa('35,000 (01/01/2023), 42,000 (01/01/2024)');
  assert.equal(r5.value, 42000);
});

test('Vehicles audit correctly against 20,000 threshold and d/f contains difference', () => {
  // Flagged examples (> 20,000 diff) with exact difference in d/f
  const res1 = audit('91,094', '35k (21/06/2024), 52k (08/07/2025), 57k (09/06/2026)', 20000);
  assert.equal(res1.isFlagged, true);
  assert.equal(res1.df, 34094);

  const res2 = audit('114,305', '37k (21/12/2022), 57k (30/11/2023), 78k (17/11/2025)', 20000);
  assert.equal(res2.isFlagged, true);
  assert.equal(res2.df, 36305);

  const res3 = audit('99,770', '68k (05/07/2025)', 20000);
  assert.equal(res3.isFlagged, true);
  assert.equal(res3.df, 31770);

  const res4 = audit('100,951', '27k (13/04/2023), 50k (18/04/2024), 68k (25/03/2025)', 20000);
  assert.equal(res4.isFlagged, true);
  assert.equal(res4.df, 32951); // 100951 - 68000 = 32951

  const res5 = audit('103,642', '47k (03/09/2024), 73k (14/08/2025)', 20000);
  assert.equal(res5.isFlagged, true);
  assert.equal(res5.df, 30642);

  // When DVSA date is from 2024 or older: MUST NOT flag or display even if diff >= 20,000
  const res2024 = audit('110,000', '70k (10/05/2024)', 20000); // 110k - 70k = 40k >= 20k but year is 2024
  assert.equal(res2024.isFlagged, false);
  assert.equal(res2024.diff, null);

  // When DVSA date is from 2025: IS flagged if diff >= 20,000
  const res2025 = audit('110,000', '70k (10/05/2025)', 20000);
  assert.equal(res2025.isFlagged, true);
  assert.equal(res2025.df, 40000);

  // When DVSA date is from 2026: IS flagged if diff >= 20,000
  const res2026 = audit('110,000', '70k (10/05/2026)', 20000);
  assert.equal(res2026.isFlagged, true);
  assert.equal(res2026.df, 40000);

  // Non-flagged examples (< 20,000 diff)
  const resPass1 = audit('45,000', '42,000 (01/01/2026)', 20000);
  assert.equal(resPass1.isFlagged, false);

  const resPass2 = audit('31,000', '30,500 (01/01/2025)', 20000);
  assert.equal(resPass2.isFlagged, false);

  // When auction mileage is less than or equal to last DVSA reading:
  // Must NOT perform / flag, and difference answer must NEVER be negative
  const resLower = audit('50,000', '80k (01/01/2026)', 20000);
  assert.equal(resLower.isFlagged, false);
  assert.equal(resLower.diff, null);
  assert.equal(resLower.df, '');

  const resEqual = audit('60,000', '60k (01/01/2026)', 20000);
  assert.equal(resEqual.isFlagged, false);
  assert.equal(resEqual.diff, null);
  assert.equal(resEqual.df, '');

  // Placeholder mileages (1 or 999,999) must NOT be flagged in the final list
  const resPlaceholder1 = audit('1', '37k (07/11/2022), 65k (18/11/2025)', 20000);
  assert.equal(resPlaceholder1.isFlagged, false);

  const resPlaceholder2 = audit('999,999', '10k (16/11/2021), 31k (18/11/2025)', 20000);
  assert.equal(resPlaceholder2.isFlagged, false);
});

test('Real-world auction spreadsheet format with CAP/Glass sub-headers parses and audits with d/f as difference', () => {
  const sampleSpreadsheetText = `Date\tSale Location\tChannel\tSale Type\tLot Number\tRegistration Number\tMake\tModel\tDerivative\tEngine Size\tBody\tColour\tNumber Of Doors\tTransmission\tFuel\tGrade\tMileage\tRegistration Date\tService History Present\tNumber of Services\tMain Dealer Services\tLast Service Date\tLast Service Mileage\tDVSA Mileage\tAdditional Service Notes\tMOT Expiry\tDeclarations\tEquipment\tAdditional Information\tVAT Type\t\t\t\t\t\t\t\t\t
Buy Now Price
Guide Price Header
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\tCap Prices\tGlass Prices
\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t
Cap New Price
Cap Retail Price
Cap Clean Price
Cap Average Price
Cap Below Price
Glass New Price
Glass Retail Price
Glass Trade Price
4/11 00:00\tManchester\te-Auction\tAyvens Carmarket LCV\tAYV024\tLE21 MTX\tADVANCED KFS\tDUCATO\tDROP & GO LOW FLOOR\t2.3\tPlatform Cab\tWHITE\t2\tManual Transmission\tDiesel\t1\t118,505\t28/07/2021\tNo\t0\t0\t01/01/0001\t0\t65k (16/07/2024), 102k (16/07/2025), 118k (11/08/2026)\t\t10/08/2027\t\tRear View Camera, Air Conditioning\t* Manual CAP Value Calc.* - 3725 cap ave, V5 to Follow - We have doc ref number, Beacon\tVAT Commercial\t\t\t\t\t\t\t\t\t
4/11 00:00\tManchester\te-Auction\tAyvens Carmarket LCV\tAYV026\tLB70 HNX\tADVANCED KFS\tDUCATO\tDROP & GO LOW FLOOR\t2.3\tPlatform Cab\tWHITE\t2\tManual Transmission\tDiesel\t3\t100,090\t09/02/2021\tNo\t0\t0\t01/01/0001\t0\t75k (06/02/2024), 81k (04/02/2025), 90k (10/02/2026)\t\t09/02/2027\t\tRear View Camera\t* Manual CAP Value Calc.* - 3875 cap average, V5 to Follow - We have doc ref number, Beacon\tVAT Commercial\t\t\t\t\t\t\t\t\t
4/11 00:00\tBedford\te-Auction\tEvans Halshaw\tEVN003\tRF69 EGX\tALFA ROMEO\tSTELVIO\tTURBO 200 AWD LUSSO TI\t2.0\tStationWagon\tBLACK\t5\tAutomatic\tPetrol\t4\t120,672\t31/01/2020\tMaintenance Print\t9\t3\t14/08/2026\t119733\t51k (21/10/2022), 62k (18/10/2023), 79k (11/10/2024), 106k (03/10/2025)\t\t20/10/2026\t\tNavigation HDD, Rear View Camera, Air Conditioning, Parking Sensor(s), Leather Trim, 19" Alloy Wheels, Powered Tailgate/Boot Lid, Privacy Glass\t\tVAT Margin\t\t£ 44,865\t£ 12,795\t£ 10,400\t£ 9,250\t£ 8,075\t\t\t
4/11 00:00\tBirmingham - Perry Barr\tHybrid\tListers\tLST190\tDA21 ZHK\tAUDI\tA1 SPORTBACK\t25 TFSI SPORT\t1.0\tHatchback\tBLACK\t5\tManual Transmission\tPetrol\t3\t81,415\t04/03/2021\tDigital Service\t6\t6\t15/11/2025\t73431\t52k (22/01/2024), 64k (11/01/2025), 74k (22/01/2026)\t19,37,52,56,64,73k\t21/01/2027\t\tAir Conditioning, Parking Sensor(s), Alloy Wheels, Tyre Inflation Kit\t\tVAT Margin\t\t£ 20,140\t£ 11,150\t£ 9,175\t£ 8,100\t£ 7,050\t\t\t
4/11 00:00\tBirmingham - Perry Barr\tHybrid\tListers\tLST233\tBW69 BVH\tAUDI\tA1 SPORTBACK\t25 TFSI SPORT\t1.0\tHatchback\tWHITE\t5\tManual Transmission\tPetrol\t4\t92,197\t09/01/2020\tDigital Service\t4\t4\t22/07/2026\t90216\t34k (30/01/2023), 47k (19/09/2023), 60k (04/09/2024), 77k (08/09/2025), 92k (09/10/2026)\t18,57,79,90k\t08/10/2027\t\tAir Conditioning, Parking Sensor(s), Alloy Wheels, Tyre Inflation Kit\t\tVAT Margin\t\t£ 19,680\t£ 10,095\t£ 8,075\t£ 7,100\t£ 6,150\t\t\t
4/11 00:00\tNewcastle-u-Tyne\te-Auction\tBCA OS PX\tOSP018\tBD69 WJM\tAUDI\tA1 SPORTBACK\t30 TFSI 116 S LINE\t1.0\tHatchback\tBlack\t5\tManual Transmission\tPetrol\t4\t101,765\t09/11/2019\tDigital Service\t1\t0\t02/08/2021\t20660\t39k (09/11/2022), 49k (28/11/2023), 70k (28/11/2024), 90k (26/11/2025)\t\t27/11/2026\t\tAir Conditioning, Parking Sensor(s), Part Leather Trim, Alloy Wheels, Tyre Inflation Kit\tPhotocopy of V5 Present - FRONT PAGE ONLY\tVAT Margin\t\t£ 21,470\t£ 10,395\t£ 8,400\t£ 7,425\t£ 6,425\t\t\t
3/11 00:00\tLeeds\te-Auction\tJCT Evening\tJCT011\tYM19 OOJ\tAUDI\tA1 SPORTBACK\t30 TFSI SPORT\t1.0\tHatchback\tWhite\t5\tManual Transmission\tPetrol\t4\t93,521\t28/03/2019\tDigital Service\t4\t0\t14/11/2024\t57485\t21k (15/03/2022), 28k (30/11/2022), 42k (16/11/2023), 57k (25/11/2024), 74k (05/11/2025)\t\t29/11/2026\tChange of Registration\tAir Conditioning, Parking Sensor(s), Alloy Wheels\t\tVAT Margin\t\t£ 19,790\t£ 9,925\t£ 7,925\t£ 6,950\t£ 6,000\t\t\t
4/11 00:00\tBirmingham - Perry Barr\tHybrid\tListers\tLST067\tBH19 AYX\tAUDI\tA1 SPORTBACK\t35 TFSI SPORT\t1.5\tHatchback\tRED\t5\tManual Transmission\tPetrol\t2\t97,340\t29/07/2019\tService Print\t7\t2\t25/03/2026\t86473\t11k (05/04/2022), 24k (08/03/2023), 45k (19/03/2024), 64k (25/03/2025), 86k (25/03/2026)\t\t04/04/2027\t\tBluetooth Preparation, DAB Digital Radio, Air Conditioning, Parking Sensor(s), Alloy Wheels, Tyre Inflation Kit, 16" Alloy Wheels\t\tVAT Margin\t\t£ 20,870\t£ 10,095\t£ 8,075\t£ 7,075\t£ 6,100\t\t\t
4/11 00:00\tManchester\te-Auction\tUKCGR Premium\tU276MA\tRE70 XZR\tAUDI\tA3 SALOON\t35 TFSI S LINE S-T\t1.5\tSaloon\tGREY\t4\tAuto Clutch\tPetrol\t3\t93,401\t26/11/2020\tService Print\t4\t0\t13/12/2024\t85936\t79k (21/12/2023), 85k (13/12/2024), 89k (16/12/2025)\t\t20/12/2026\t\tNavigation HDD, Parking Sensor(s), Air Conditioning, Leather Trim, 18" Alloy Wheels, Privacy Glass\t\tVAT Margin\t\t£ 30,050\t£ 13,495\t£ 11,350\t£ 10,300\t£ 9,200\t\t\t
4/11 00:00\tManchester\te-Auction\tBCA OS Blackhorse/ Fleet\tOBH104\tKK68 OJL\tAUDI\tA3 SPORTBACK\t30 TFSI BLACK ED.\t1.0\tHatchback\tBLACK\t5\tManual Transmission\tPetrol\t4\t85,868\t15/02/2019\tService Print\t1\t0\t25/07/2023\t37420\t21k (05/02/2022), 27k (12/10/2022), 40k (30/09/2023), 55k (09/09/2024), 70k (06/09/2025), 84k (03/09/2026)\t\t08/09/2027\t\tNavigation HDD, Parking Sensor(s), Air Conditioning, Part Leather Trim, Privacy Glass\tKey Condition - Remote Inoperative\tVAT Qualifying\t\t£ 26,625\t£ 10,750\t£ 8,500\t£ 7,500\t£ 6,500`;

  const rawSheet = sampleSpreadsheetText.split('\n').map((l) => l.split('\t'));
  const det = detectHeaders(rawSheet);

  assert.equal(det.headerRowIndex, 0);
  assert.equal(det.mapping.regCol, 'Registration Number');
  assert.equal(det.mapping.makeCol, 'Make');
  assert.equal(det.mapping.modelCol, 'Model');
  assert.equal(det.mapping.milCol, 'Mileage');
  assert.equal(det.mapping.dvsaCol, 'DVSA Mileage');

  const cleanVehicles = extractValidVehicleRows(
    rawSheet,
    det.headerRowIndex,
    det.mapping,
    det.headers
  );
  assert.equal(cleanVehicles.length, 10);

  // Strictly verify against the fixed 20,000 threshold
  const audited20k = cleanVehicles.map((v) => {
    const res = audit(v['Mileage'], v['DVSA Mileage'], 20000);
    return {
      'reg no': v['Registration Number'],
      'make': v['Make'],
      'model': v['Model'],
      'milage': v['Mileage'],
      'dvsaa': v['DVSA Mileage'],
      'd/f': res.df,
      _isFlagged: res.isFlagged,
    };
  });

  const flagged20k = audited20k.filter((r) => r._isFlagged);
  assert.equal(flagged20k.length, 0); // All 10 vehicles in this specific auction batch have diff < 20,000

  // Verify vehicles with difference >= 20,000 are flagged with exact d/f difference
  const sampleVehiclesWithDiscrepancies = [
    { reg: 'TEST 1', make: 'AUDI', model: 'A1', mil: '91,094', dvsa: '57k (01/06/2026)' }, // diff = 34,094 >= 20,000, 2026
    { reg: 'TEST 2', make: 'BMW', model: '3 SERIES', mil: '114,305', dvsa: '78k (15/05/2025)' }, // diff = 36,305 >= 20,000, 2025
    { reg: 'TEST 3', make: 'FORD', model: 'FIESTA', mil: '45,000', dvsa: '42k (10/04/2026)' }, // diff = 3,000 < 20,000
    { reg: 'TEST 4', make: 'VW', model: 'GOLF', mil: '100,000', dvsa: '50k (10/04/2024)' }, // diff = 50,000 >= 20,000 BUT year 2024 -> NOT flagged
  ];

  const auditedDiscrepancies = sampleVehiclesWithDiscrepancies.map((v) => {
    const res = audit(v.mil, v.dvsa, 20000);
    return {
      'reg no': v.reg,
      'make': v.make,
      'model': v.model,
      'milage': v.mil,
      'dvsaa': v.dvsa,
      'd/f': res.df,
      _isFlagged: res.isFlagged,
    };
  });

  const flaggedOnly = auditedDiscrepancies.filter((r) => r._isFlagged);
  assert.equal(flaggedOnly.length, 2);
  assert.deepEqual(
    flaggedOnly.map((r) => r['reg no']),
    ['TEST 1', 'TEST 2']
  );
  assert.deepEqual(
    flaggedOnly.map((r) => r['make']),
    ['AUDI', 'BMW']
  );
  assert.deepEqual(
    flaggedOnly.map((r) => r['model']),
    ['A1', '3 SERIES']
  );
  assert.deepEqual(
    flaggedOnly.map((r) => r['d/f']),
    [34094, 36305]
  );

  // Verify 2026 cars display first (highest d/f to lowest), then 2025 cars (highest d/f to lowest)
  const mixedYearsDiscrepancies = [
    { reg: '2025-LOW', year: 2025, df: 22000 },
    { reg: '2026-LOW', year: 2026, df: 21000 },
    { reg: '2025-HIGH', year: 2025, df: 45000 },
    { reg: '2026-HIGH', year: 2026, df: 48000 },
  ];

  const sortedMixed = [...mixedYearsDiscrepancies].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.df - a.df;
  });

  assert.deepEqual(
    sortedMixed.map((r) => r.reg),
    ['2026-HIGH', '2026-LOW', '2025-HIGH', '2025-LOW']
  );

  // Verify export format includes make and model: reg no, make, model, milage, dvsaa, d/f
  const exportPayload = flaggedOnly.map((r) => ({
    'reg no': r['reg no'],
    'make': r['make'],
    'model': r['model'],
    'milage': r['milage'],
    'dvsaa': r['dvsaa'],
    'd/f': r['d/f'],
  }));
  assert.equal(exportPayload.length, 2);
  assert.deepEqual(Object.keys(exportPayload[0]), [
    'reg no',
    'make',
    'model',
    'milage',
    'dvsaa',
    'd/f',
  ]);
  assert.equal(exportPayload[0]['reg no'], 'TEST 1');
  assert.equal(exportPayload[0]['make'], 'AUDI');
  assert.equal(exportPayload[0]['model'], 'A1');
  assert.equal(exportPayload[0]['milage'], '91,094');
  assert.equal(exportPayload[0]['d/f'], 34094);
});

test('Chronological and reverse chronological DVSA date stamps both identify the latest reading', () => {
  const rAsc = parseLastDvsa('51k (21/10/2022), 62k (18/10/2023), 106k (03/10/2025)');
  assert.equal(rAsc.value, 106000);

  const rDesc = parseLastDvsa('106k (03/10/2025), 62k (18/10/2023), 51k (21/10/2022)');
  assert.equal(rDesc.value, 106000);

  const rIso = parseLastDvsa('40k (2022-01-01), 80k (2024-05-20)');
  assert.equal(rIso.value, 80000);

  assert.equal(parseMileage('85k'), 85000);
  assert.equal(parseMileage('85.5k'), 85500);
  assert.equal(parseMileage(' 120,672 '), 120672);
});
