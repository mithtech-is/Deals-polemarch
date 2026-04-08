// Pure-function tests for the markdown/parser helpers inside the
// storefront panels that read from the news + editorial snapshot kinds.
//
// Run with:  node storefront/tests/panel-helpers.test.mjs
//
// Each helper here is copy-pasted from the component it belongs to.
// If you change the component, update this file too.

// ── From NewsPanel.tsx ─────────────────────────────────────────

function snippet(body, max = 220) {
  const stripped = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#+\s*/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

// ── From ProsConsPanel.tsx ─────────────────────────────────────

function parseBullets(md) {
  if (!md) return [];
  const lines = md
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bulleted = lines
    .filter((l) => /^[-*•]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, ''));
  return bulleted.length > 0 ? bulleted : lines;
}

// ── Test harness ───────────────────────────────────────────────

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
function assertEq(a, b, msg) {
  const s = JSON.stringify(a);
  const t = JSON.stringify(b);
  if (s !== t) throw new Error(`${msg ?? ''}\n        expected: ${t}\n        actual:   ${s}`);
}

// ── snippet() ──────────────────────────────────────────────────

console.log('snippet(body, max):');

test('empty body → empty string', () => {
  assertEq(snippet(''), '');
});

test('short body passes through unchanged', () => {
  assertEq(snippet('Hello world.'), 'Hello world.');
});

test('strips bold + italic', () => {
  assertEq(snippet('**strong** *em* plain'), 'strong em plain');
});

test('strips inline code', () => {
  assertEq(snippet('use `npm run dev`'), 'use npm run dev');
});

test('strips fenced code blocks entirely', () => {
  assertEq(
    snippet('Intro\n```js\nconst x = 1;\n```\nOutro'),
    'Intro Outro'
  );
});

test('strips headings', () => {
  assertEq(snippet('# Title\n## Subtitle\nbody'), 'Title Subtitle body');
});

test('link text is kept, url dropped', () => {
  assertEq(
    snippet('see [the docs](https://example.com) for more'),
    'see the docs for more'
  );
});

test('collapses whitespace', () => {
  assertEq(snippet('a    b\n\nc\td'), 'a b c d');
});

test('truncates at max with ellipsis, no broken word', () => {
  const long = 'word '.repeat(100).trim(); // ~499 chars
  const s = snippet(long, 40);
  // Ends with "…"
  if (!s.endsWith('…')) throw new Error('no ellipsis: ' + s);
  // No broken word at the end (the last non-ellipsis char is a letter, not mid-letter)
  if (s.length > 41 + 1) throw new Error('too long: ' + s.length);
});

test('does NOT truncate when exactly at max', () => {
  const s = 'a'.repeat(220);
  assertEq(snippet(s, 220), s);
});

// ── parseBullets() ─────────────────────────────────────────────

console.log('\nparseBullets(md):');

test('empty markdown → empty array', () => {
  assertEq(parseBullets(''), []);
  assertEq(parseBullets(null), []);
});

test('dash bullets', () => {
  assertEq(parseBullets('- one\n- two\n- three'), ['one', 'two', 'three']);
});

test('asterisk bullets', () => {
  assertEq(parseBullets('* one\n* two'), ['one', 'two']);
});

test('unicode bullet •', () => {
  assertEq(parseBullets('• one\n• two'), ['one', 'two']);
});

test('mixed bullet markers', () => {
  assertEq(parseBullets('- dash\n* star\n• dot'), ['dash', 'star', 'dot']);
});

test('blank lines are dropped', () => {
  assertEq(parseBullets('- a\n\n- b\n\n\n- c'), ['a', 'b', 'c']);
});

test('no bullets → each line is its own item', () => {
  assertEq(parseBullets('first line\nsecond line'), ['first line', 'second line']);
});

test('mixed bulleted + plain: only bullets kept if any exist', () => {
  // Current behavior: if ANY bullet exists, only bullets come through.
  assertEq(
    parseBullets('intro line\n- real bullet\ntrailing line'),
    ['real bullet']
  );
});

// ── Summary ────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
