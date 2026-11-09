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

  // Non-flagged examples from prompt
  assert.equal(audit('45,000', '42,000'), ''); // diff 3,000 <= 30,000
  assert.equal(audit('31,000', '30,500'), ''); // diff 500 <= 30,000

  // Flagged examples from prompt table
  assert.equal(audit('95,000', '50,000'), 'FLAG'); // diff 45,000 > 30,000
  assert.equal(audit('28,000', '65,000'), 'FLAG'); // diff 37,000 > 30,000
});
