// Pure-function tests for the price-chart downsampler + ISO date helpers.
//
// Run with:  node storefront/tests/downsample.test.mjs
//
// Kept framework-free so a new contributor can sanity-check the math
// without setting up jest / vitest. Mirrors the implementation in
// storefront/src/components/product/PriceChart.tsx — keep the two in
// sync. If you change the downsampling rule, update BOTH.

// ── Implementation under test ───────────────────────────────────

function downsample(points, granularity) {
  if (points.length === 0) return points;
  const bucketed = new Map();
  for (const [ts, price] of points) {
    let key;
    if (granularity === 'daily') {
      key = Math.floor(ts / 86_400_000);
    } else {
      const d = new Date(ts);
      const dayOfWeekMon0 = (d.getUTCDay() + 6) % 7;
      const mondayMs = Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate() - dayOfWeekMon0
      );
      key = Math.floor(mondayMs / 86_400_000);
    }
    bucketed.set(key, [ts, price]);
  }
  return Array.from(bucketed.values()).sort((a, b) => a[0] - b[0]);
}

function toIsoDate(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const ms = Date.parse(`${s}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

// ── Test harness ────────────────────────────────────────────────

let failed = 0;
let passed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}`);
    console.log(`      ${e.message}`);
    failed++;
  }
}

function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg ?? ''}\n        expected: ${b}\n        actual:   ${a}`);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? 'assertion failed');
}

// ── downsample() ────────────────────────────────────────────────

console.log('downsample():');

test('empty series → empty', () => {
  assertEq(downsample([], 'daily'), []);
  assertEq(downsample([], 'weekly'), []);
});

test('single point passes through', () => {
  const one = [[Date.UTC(2026, 3, 8, 12), 100]];
  assertEq(downsample(one, 'daily').length, 1);
  assertEq(downsample(one, 'weekly').length, 1);
});

test('daily: 3 same-day points → 1 bucket with last value', () => {
  const sameDay = [
    [Date.UTC(2026, 3, 8, 9), 100],
    [Date.UTC(2026, 3, 8, 11), 105],
    [Date.UTC(2026, 3, 8, 14), 110],
  ];
  const d = downsample(sameDay, 'daily');
  assertEq(d.length, 1);
  assertEq(d[0][1], 110);
});

test('daily: 3 days → 3 buckets, last day keeps its last value', () => {
  const threeDays = [
    [Date.UTC(2026, 3, 8), 100],
    [Date.UTC(2026, 3, 9), 110],
    [Date.UTC(2026, 3, 10, 10), 115],
    [Date.UTC(2026, 3, 10, 15), 120],
  ];
  const d = downsample(threeDays, 'daily');
  assertEq(d.length, 3);
  assertEq(d[2][1], 120);
});

test('weekly: points across 2 ISO weeks → 2 buckets', () => {
  // Apr 6 2026 = Mon (week 1), Apr 13 = Mon (week 2).
  const twoWeeks = [
    [Date.UTC(2026, 3, 6), 100], // Mon wk1
    [Date.UTC(2026, 3, 8), 105], // Wed wk1
    [Date.UTC(2026, 3, 12), 110], // Sun wk1
    [Date.UTC(2026, 3, 13), 115], // Mon wk2
    [Date.UTC(2026, 3, 15), 120], // Wed wk2
  ];
  const w = downsample(twoWeeks, 'weekly');
  assertEq(w.length, 2);
  assertEq(w[0][1], 110); // week 1 keeps Sun=110
  assertEq(w[1][1], 120); // week 2 keeps Wed=120
});

test('weekly: Sun 23:59 and Mon 00:00 land in different buckets', () => {
  const boundary = [
    [Date.UTC(2026, 3, 12, 23, 59), 200], // Sun 23:59 wk1
    [Date.UTC(2026, 3, 13, 0, 0), 300],   // Mon 00:00 wk2
  ];
  const wb = downsample(boundary, 'weekly');
  assertEq(wb.length, 2);
  assertEq(wb[0][1], 200);
  assertEq(wb[1][1], 300);
});

test('output always time-ascending even with scrambled input', () => {
  const scrambled = [
    [Date.UTC(2026, 3, 10), 120],
    [Date.UTC(2026, 3, 8), 100],
    [Date.UTC(2026, 3, 9), 110],
  ];
  const sc = downsample(scrambled, 'daily');
  assert(sc[0][0] < sc[1][0] && sc[1][0] < sc[2][0], 'not ascending');
});

// ── toIsoDate() / fromIsoDate() ─────────────────────────────────

console.log('\ntoIsoDate() / fromIsoDate():');

test('toIsoDate basic', () => {
  assertEq(toIsoDate(Date.UTC(2026, 3, 8, 12)), '2026-04-08');
});

test('toIsoDate: late in day stays same date (UTC)', () => {
  assertEq(toIsoDate(Date.UTC(2026, 3, 8, 23, 59)), '2026-04-08');
});

test('fromIsoDate basic', () => {
  assertEq(fromIsoDate('2026-04-08'), Date.UTC(2026, 3, 8));
});

test('fromIsoDate: invalid format returns null', () => {
  assertEq(fromIsoDate('bad'), null);
  assertEq(fromIsoDate('2026-4-8'), null); // non-padded
  assertEq(fromIsoDate(''), null);
});

test('fromIsoDate: bad month returns null', () => {
  assertEq(fromIsoDate('2026-13-01'), null);
});

test('round-trip: toIsoDate(fromIsoDate(s)) === s', () => {
  const s = '2026-04-08';
  assertEq(toIsoDate(fromIsoDate(s)), s);
});

// ── Summary ─────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
