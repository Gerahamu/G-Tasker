import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

const { db } = await import('../../src/db/database.ts');
const { createTagForTasks, deleteTaskTag, loadTaskTagSnapshot, renameTaskTag, toggleTagForTasks } =
  await import('../../src/db/task-tags.ts');

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
});

after(() => db.close());

function legacyTask(title) {
  return {
    listId: 1,
    title,
    notes: '',
    priority: 'medium',
    isFlagged: false,
    dueDate: null,
    dueTime: null,
    completedAt: null,
    createdAt: '2026-10-06T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    sortOrder: 1,
    recurrenceRuleId: null,
    parentTaskId: null,
    locationTriggerId: null,
    templateId: null,
    dateMode: 'simple',
    dateStart: null,
    dateEnd: null,
    dateTarget: null,
    status: 'active',
    milestones: '[]',
  };
}

test('partial multi-task selection adds the tag to all, then removes it from all', async () => {
  const firstTaskId = await db.tasks.add(legacyTask('First'));
  const secondTaskId = await db.tasks.add(legacyTask('Second'));
  const otherTagId = await createTagForTasks([firstTaskId], 'Unrelated');
  const tagId = await createTagForTasks([firstTaskId], 'Project');

  assert.equal(await toggleTagForTasks([firstTaskId, secondTaskId], tagId), 'added');
  let snapshot = await loadTaskTagSnapshot([firstTaskId, secondTaskId]);
  assert.deepEqual(
    snapshot.relations
      .filter((relation) => relation.tagId === tagId)
      .map((relation) => relation.taskId)
      .sort(),
    [firstTaskId, secondTaskId],
  );
  assert.ok(snapshot.relations.some((relation) => relation.tagId === otherTagId));

  assert.equal(await toggleTagForTasks([firstTaskId, secondTaskId], tagId), 'removed');
  snapshot = await loadTaskTagSnapshot([firstTaskId, secondTaskId]);
  assert.equal(
    snapshot.relations.some((relation) => relation.tagId === tagId),
    false,
  );
  assert.ok(snapshot.relations.some((relation) => relation.tagId === otherTagId));
});

test('tags can be renamed and deleted without changing legacy task records', async () => {
  const taskId = await db.tasks.add({
    ...legacyTask('Kept task'),
    isFlagged: true,
    priority: 'high',
  });
  const tagId = await createTagForTasks([taskId], 'Old name');

  assert.equal(await renameTaskTag(tagId, 'New name'), 1);
  assert.equal((await db.tags.get(tagId)).name, 'New name');
  await deleteTaskTag(tagId);

  const task = await db.tasks.get(taskId);
  assert.equal(task.title, 'Kept task');
  assert.equal(task.isFlagged, true);
  assert.equal(task.priority, 'high');
  assert.equal('tags' in task, false);
  assert.equal(await db.tags.get(tagId), undefined);
  assert.deepEqual(await db.taskTags.where('taskId').equals(taskId).toArray(), []);
});

test('tag records and assignments persist when the database is reopened', async () => {
  const taskId = await db.tasks.add(legacyTask('Persistent task'));
  const tagId = await createTagForTasks([taskId], 'Context');
  db.close();
  await db.open();

  const snapshot = await loadTaskTagSnapshot([taskId]);
  assert.equal(snapshot.tags.find((tag) => tag.id === tagId)?.name, 'Context');
  assert.deepEqual(
    snapshot.relations.map(({ taskId: relationTaskId, tagId: relationTagId }) => [
      relationTaskId,
      relationTagId,
    ]),
    [[taskId, tagId]],
  );
  assert.equal((await db.tasks.get(taskId)).title, 'Persistent task');
});
