import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/lib/language-preference.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { initializeLanguage } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
function storage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (_key, next) => { value = next; } };
}
for (const [locale, expected] of [['zh-TW', 'zh'], ['en-GB', 'en'], ['ja-JP', 'ja'], ['fr-FR', 'zh']]) {
  test(`first launch saves ${locale} as ${expected}`, () => {
    const saved = storage();
    assert.equal(initializeLanguage(saved, locale), expected);
    assert.equal(saved.getItem(), expected);
    assert.equal(initializeLanguage(saved, expected === 'ja' ? 'en-US' : 'ja-JP'), expected);
  });
}
test('existing manual choice wins over system language', () => {
  assert.equal(initializeLanguage(storage('en'), 'ja-JP'), 'en');
});
test('legacy auto is migrated once', () => {
  const saved = storage('auto');
  assert.equal(initializeLanguage(saved, 'ja-JP'), 'ja');
  assert.equal(saved.getItem(), 'ja');
  assert.equal(initializeLanguage(saved, 'en-US'), 'ja');
});
test('invalid preference is replaced and blocked storage does not crash', () => {
  const saved = storage('invalid');
  assert.equal(initializeLanguage(saved, 'en-US'), 'en');
  assert.equal(saved.getItem(), 'en');
  assert.equal(initializeLanguage({ getItem() { throw Error(); }, setItem() { throw Error(); } }, 'ja-JP'), 'ja');
});
