const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function fixture({ read = async () => null, write = async () => {} } = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    cache.set(file, module.exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const mocks = {
      react: { useEffect() {}, useState() {} },
      'expo-secure-store': { getItemAsync: read, setItemAsync: write },
    };
    const requireMock = (name) => mocks[name] || load(path.resolve(path.dirname(file), name + '.ts'));
    vm.runInThisContext('(function(require,module,exports){' + source + '\n})', { filename: file })(
      requireMock, module, module.exports,
    );
    cache.set(file, module.exports);
    return module.exports;
  }
  return {
    store: load(path.resolve(__dirname, '../lib/consent-store.ts')),
    model: load(path.resolve(__dirname, '../lib/shared/consent.ts')),
  };
}

test('a grant is not published until the durable write succeeds', async () => {
  const pending = deferred();
  const started = deferred();
  const { store, model } = fixture({ write: () => { started.resolve(); return pending.promise; } });
  const seen = [];
  store.onConsentChange((record) => seen.push(record));
  const grant = model.acceptAll();
  const save = store.saveConsent(grant);
  await started.promise;
  assert.equal(store.getConsent(), null);
  assert.ok(seen.every((record) => !model.isAllowed(record, 'analytics')));
  pending.resolve();
  await save;
  assert.equal(store.getConsent(), grant);
});

test('failed revocation rejects, denies optional tracking, and later saves recover', async () => {
  let fail = false;
  const { store, model } = fixture({ write: async () => { if (fail) throw new Error('storage unavailable'); } });
  await store.saveConsent(model.acceptAll());
  assert.equal(model.isAllowed(store.getConsent(), 'analytics'), true);
  fail = true;
  await assert.rejects(store.saveConsent(model.rejectAll()), /storage unavailable/);
  assert.equal(store.getConsent(), null);
  assert.equal(model.isAllowed(store.getConsent(), 'analytics'), false);
  fail = false;
  await store.saveConsent(model.rejectAll());
  assert.equal(model.isAllowed(store.getConsent(), 'analytics'), false);
});

test('a pending initial read cannot overwrite the newly persisted choice', async () => {
  const read = deferred();
  const { store, model } = fixture({ read: () => read.promise });
  const initial = store.loadConsent();
  const denied = model.rejectAll();
  const save = store.saveConsent(denied);
  read.resolve(model.serializeConsent(model.acceptAll()));
  await initial;
  await save;
  assert.equal(store.getConsent(), denied);
});

test('concurrent choices persist in order and finish with the latest choice', async () => {
  const pending = deferred();
  const started = deferred();
  const writes = [];
  const { store, model } = fixture({ write: async (_key, value) => {
    writes.push(model.parseConsent(value));
    if (writes.length === 1) { started.resolve(); await pending.promise; }
  } });
  const accept = store.saveConsent(model.acceptAll());
  const reject = store.saveConsent(model.rejectAll());
  await started.promise;
  assert.equal(writes.length, 1);
  pending.resolve();
  await Promise.all([accept, reject]);
  assert.equal(writes.length, 2);
  assert.equal(model.isAllowed(writes[0], 'analytics'), true);
  assert.equal(model.isAllowed(writes[1], 'analytics'), false);
  assert.equal(model.isAllowed(store.getConsent(), 'analytics'), false);
});
