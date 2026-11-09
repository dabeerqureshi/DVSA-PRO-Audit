import test from 'node:test';
import assert from 'node:assert/strict';

function parseMileage(val) {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str) return null;
  const clean = str.replace(/[^\d.]/g, '');
  if (!clean) return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function parseLastDvsa(str) {
  if (str === null || str === undefined) return { value: null, rawPart: '' };
  const raw = String(str).trim();
  if (!raw) return { value: null, rawPart: '' };

  if (/^[\d,.\s]+$/.test(raw)) {
    const clean = raw.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return { value: isNaN(num) ? null : num, rawPart: raw };
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
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : raw;

  const matchK = lastPart.match(/(\d+(?:\.\d+)?)\s*k/i);
  if (matchK) {
    const base = parseFloat(matchK[1]);
    if (!isNaN(base)) {
      return { value: Math.round(base * 1000), rawPart: lastPart };
    }
  }

  const matchNum = lastPart.match(/(\d[\d,]*)/);
  if (matchNum) {
    const clean = matchNum[1].replace(/,/g, '');
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      return { value: num, rawPart: lastPart };
    }
  }

  return { value: null, rawPart: lastPart };
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

  if (!regCol && headers.length > 5) regCol = headers[5];
  if (!milCol && headers.length > 16) milCol = headers[16];
  if (!dvsaCol && headers.length > 23) dvsaCol = headers[23];

  if (!regCol) regCol = headers[0] || 'Column 1';
  if (!milCol) milCol = headers[1] || 'Column 2';
  if (!dvsaCol) dvsaCol = headers[2] || 'Column 3';

  return {
    headerRowIndex,
    headers,
    mapping: { regCol, milCol, dvsaCol },
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

function audit(milage, dvsaa, threshold = 30000) {
  const milNum = parseMileage(milage);
  const { value: dvsaNum } = parseLastDvsa(dvsaa);
  if (milNum === null || dvsaNum === null) return '';
  return Math.abs(milNum - dvsaNum) > threshold ? 'FLAG' : '';
}

test('parseMileage extracts numbers correctly', () => {
  assert.equal(parseMileage('91,094'), 91094);
  assert.equal(parseMileage('1'), 1);
  assert.equal(parseMileage('999,999'), 999999);
  assert.equal(parseMileage(45000), 45000);
  assert.equal(parseMileage('  114,305 miles '), 114305);
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

test('Exact user prompt vehicles audit correctly against 30,000 threshold', () => {
  // Flagged examples from prompt
  assert.equal(audit('91,094', '35k (21/06/2024), 52k (08/07/2025), 57k (09/06/2026)'), 'FLAG'); // diff 34094
  assert.equal(audit('114,305', '37k (21/12/2022), 57k (30/11/2023), 78k (17/11/2024)'), 'FLAG'); // diff 36305
  assert.equal(audit('99,770', '68k (05/07/2025)'), 'FLAG'); // diff 31770
  assert.equal(audit('1', '37k (07/11/2022), 47k (14/11/2023), 57k (08/11/2024), 65k (18/11/2025)'), 'FLAG'); // diff 64999
  assert.equal(audit('100,951', '27k (13/04/2023), 50k (18/04/2024), 68k (25/03/2025)'), 'FLAG'); // diff 32951
  assert.equal(audit('999,999', '10k (16/11/2021), 16k (16/11/2022), 22k (13/11/2023), 31k (18/11/2024)'), 'FLAG'); // diff 968999
  assert.equal(audit('103,642', '47k (03/09/2024), 73k (14/08/2025)'), 'FLAG'); // diff 30642
  assert.equal(audit('1', '27k (26/04/2024), 57k (24/04/2025)'), 'FLAG'); // diff 56999
  assert.equal(audit('86,392', '30k (25/06/2024), 53k (12/06/2025)'), 'FLAG'); // diff 33392
  assert.equal(audit('113,800', '44k (06/10/2022), 57k (05/10/2023), 70k (03/10/2024), 83k (03/10/2025)'), 'FLAG'); // diff 30800

  // Non-flagged examples
  assert.equal(audit('45,000', '42,000'), ''); // diff 3,000 <= 30,000
  assert.equal(audit('31,000', '30,500'), ''); // diff 500 <= 30,000
  assert.equal(audit('95,000', '50,000'), 'FLAG'); // diff 45,000 > 30,000
  assert.equal(audit('28,000', '65,000'), 'FLAG'); // diff 37,000 > 30,000
});

test('Real-world auction spreadsheet format with CAP/Glass sub-headers parses and audits perfectly', () => {
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

  // 1. Check header detection & mapping
  assert.equal(det.headerRowIndex, 0);
  assert.equal(det.mapping.regCol, 'Registration Number');
  assert.equal(det.mapping.milCol, 'Mileage'); // Must NOT pick Last Service Mileage
  assert.equal(det.mapping.dvsaCol, 'DVSA Mileage');

  // 2. Check extraction filters out the 12 pricing/sub-header rows
  const cleanVehicles = extractValidVehicleRows(
    rawSheet,
    det.headerRowIndex,
    det.mapping,
    det.headers
  );
  assert.equal(cleanVehicles.length, 10);

  // 3. Verify vehicle VRMs match the 10 cars
  const expectedRegs = [
    'LE21 MTX',
    'LB70 HNX',
    'RF69 EGX',
    'DA21 ZHK',
    'BW69 BVH',
    'BD69 WJM',
    'YM19 OOJ',
    'BH19 AYX',
    'RE70 XZR',
    'KK68 OJL',
  ];
  assert.deepEqual(
    cleanVehicles.map((v) => v['Registration Number']),
    expectedRegs
  );

  // 4. Test auditing against 30,000 threshold (all pass)
  const audited30k = cleanVehicles.map((v) => ({
    'reg no': v['Registration Number'],
    'milage': v['Mileage'],
    'dvsaa': v['DVSA Mileage'],
    'd/f': audit(v['Mileage'], v['DVSA Mileage'], 30000),
  }));

  const flagged30k = audited30k.filter((r) => r['d/f'] === 'FLAG');
  assert.equal(flagged30k.length, 0);

  // 5. Test auditing against 10,000 threshold (5 should flag: LB70 HNX, RF69 EGX, BD69 WJM, YM19 OOJ, BH19 AYX)
  const audited10k = cleanVehicles.map((v) => ({
    'reg no': v['Registration Number'],
    'milage': v['Mileage'],
    'dvsaa': v['DVSA Mileage'],
    'd/f': audit(v['Mileage'], v['DVSA Mileage'], 10000),
  }));

  const flagged10k = audited10k.filter((r) => r['d/f'] === 'FLAG');
  assert.equal(flagged10k.length, 5);
  assert.deepEqual(
    flagged10k.map((r) => r['reg no']),
    ['LB70 HNX', 'RF69 EGX', 'BD69 WJM', 'YM19 OOJ', 'BH19 AYX']
  );
});
