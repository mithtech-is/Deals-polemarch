#!/usr/bin/env node
// Runs every framework-free test file in the repo and reports a combined
// pass/fail count. These are pure-function regression tests for the
// riskiest logic in the sync pipeline and storefront panels; they don't
// require a database or a test framework.
//
// Run with:  node tests/run-all.mjs
//
// Add new suites by pushing a path into the SUITES array below.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const SUITES = [
  'storefront/tests/downsample.test.mjs',
  'storefront/tests/panel-helpers.test.mjs',
  'backend/tests/sync-helpers.test.mjs',
];

let totalPassed = 0;
let totalFailed = 0;
let suiteFailures = 0;

for (const suite of SUITES) {
  const absolute = resolve(repoRoot, suite);
  console.log(`\n▶ ${suite}`);
  console.log('─'.repeat(60));
  const res = spawnSync('node', [absolute], { stdio: 'pipe', encoding: 'utf8' });
  process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);

  // Parse "N passed, M failed" from the last non-empty line.
  const lines = res.stdout.trim().split('\n').filter(Boolean);
  const summary = lines[lines.length - 1] || '';
  const m = summary.match(/(\d+) passed, (\d+) failed/);
  if (m) {
    totalPassed += parseInt(m[1], 10);
    totalFailed += parseInt(m[2], 10);
  }
  if (res.status !== 0) suiteFailures++;
}

console.log('\n' + '═'.repeat(60));
console.log(
  `TOTAL: ${totalPassed} passed, ${totalFailed} failed across ${SUITES.length} suites`
);
if (suiteFailures > 0) {
  console.log(`${suiteFailures} suite(s) reported failures`);
  process.exit(1);
}
console.log('✅ All suites pass.');
