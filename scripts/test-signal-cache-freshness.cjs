const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const file = path.resolve(__dirname, '../lib/shared/signal-policy.ts');
const source = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
vm.runInThisContext('(function(module,exports){' + source + '\n})', { filename: file })(loaded, loaded.exports);
const { isCacheFresh } = loaded.exports;
const now = new Date('2026-07-24T12:00:00Z');

test('future ISO cache timestamps are not fresh', () => {
  assert.equal(isCacheFresh('2026-07-25T12:00:00Z', 15, now), false);
});
test('even a Date one millisecond in the future is not fresh', () => {
  assert.equal(isCacheFresh(new Date('2026-07-24T12:00:00.001Z'), 15, now), false);
});
test('exact now and inclusive TTL boundary remain fresh', () => {
  assert.equal(isCacheFresh(now, 15, now), true);
  assert.equal(isCacheFresh('2026-07-24T11:45:00Z', 15, now), true);
});
test('expired and invalid timestamps remain not fresh', () => {
  assert.equal(isCacheFresh('2026-07-24T11:44:59.999Z', 15, now), false);
  assert.equal(isCacheFresh('not-a-date', 15, now), false);
});
