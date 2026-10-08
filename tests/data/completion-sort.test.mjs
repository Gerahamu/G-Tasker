import assert from 'node:assert/strict';
import test from 'node:test';
import { sortCompletedLast } from '../../src/lib/completion-sort.ts';

const completionTime = (item) => item.completedAt;

test('keeps the incomplete order and places completed items chronologically at the end', () => {
  const items = [
    { title: 'A', completed: false, completedAt: null },
    { title: 'B', completed: true, completedAt: '2026-09-05T10:00:00.000Z' },
    { title: 'C', completed: false, completedAt: null },
    { title: 'D', completed: true, completedAt: '2026-09-05T10:10:00.000Z' },
    { title: 'E', completed: true, completedAt: '2026-09-05T10:05:00.000Z' },
  ];

  const sorted = sortCompletedLast(items, (item) => item.completed, completionTime);
  assert.deepEqual(
    sorted.map((item) => item.title),
    ['A', 'C', 'B', 'E', 'D'],
  );
});

test('keeps legacy completed items stable when their completion time was never stored', () => {
  const items = [
    { title: 'unfinished first', completed: false },
    { title: 'legacy one', completed: true },
    { title: 'legacy two', completed: true },
    { title: 'recent', completed: true, completedAt: '2026-09-05T10:00:00.000Z' },
  ];

  const sorted = sortCompletedLast(items, (item) => item.completed, completionTime);
  assert.deepEqual(
    sorted.map((item) => item.title),
    ['unfinished first', 'legacy one', 'legacy two', 'recent'],
  );
});
