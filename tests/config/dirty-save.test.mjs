import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';

const source = await readFile(new URL('../../src/lib/dirty-save.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { createDirtySaver, acknowledgeSaved } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);

test('an edit arriving during a save is drained without losing the dirty flag', async () => {
  let records = [{ id: 1, title: 'first' }];
  let dirtyIds = new Set([1]);
  const writes = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const save = createDirtySaver({
    snapshot: () => ({ records, dirtyIds }),
    persist: async batch => { writes.push(batch); if (writes.length === 1) await gate; },
    acknowledge: saved => { dirtyIds = acknowledgeSaved(dirtyIds, records, saved); },
  });
  const first = save();
  await Promise.resolve();
  records = [{ id: 1, title: 'second' }, { id: 2, title: 'new edit' }];
  dirtyIds = new Set([1, 2]);
  assert.equal(save(), first);
  release();
  await first;
  assert.deepEqual(writes.map(batch => batch.map(row => row.title)), [['first'], ['second', 'new edit']]);
  assert.equal(dirtyIds.size, 0);
});

test('failed persistence retains dirty data and a later call retries', async () => {
  const records = [{ id: 1, title: 'keep me' }];
  let dirtyIds = new Set([1]);
  let fail = true;
  const save = createDirtySaver({
    snapshot: () => ({ records, dirtyIds }),
    persist: async () => { if (fail) throw new Error('disk failure'); },
    acknowledge: saved => { dirtyIds = acknowledgeSaved(dirtyIds, records, saved); },
  });
  await assert.rejects(save(), /disk failure/);
  assert.equal(dirtyIds.has(1), true);
  fail = false;
  await save();
  assert.equal(dirtyIds.size, 0);
});

test('acknowledging an older object never clears a newer edit', () => {
  const old = { id: 1, title: 'old' };
  assert.deepEqual([...acknowledgeSaved(new Set([1, 2]), [{ ...old }], [old])], [1, 2]);
});
