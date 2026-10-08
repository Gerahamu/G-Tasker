import { db } from './database';
import { flushAllStores } from '../autosave/autosave-engine';
import { encodeBackupValue } from '../lib/backup-serialization';

export async function exportDatabaseBackup() {
  await flushAllStores();
  // Read every table in one snapshot; encode binary after the transaction commits.
  const raw = await db.transaction('r', db.tables, async () => Object.fromEntries(
    await Promise.all(db.tables.map(async table => [table.name, await table.toArray()])),
  ));
  const tables = await encodeBackupValue(raw) as Record<string, unknown>;
  return {
    format: 'g-tasker-backup',
    formatVersion: 1,
    databaseVersion: db.verno,
    tables,
    // Retain legacy fields so existing consumers can still read these exports.
    tasks: tables.tasks,
    lists: tables.taskLists,
    tags: tables.tags,
    markers: tables.calendarMarkers,
    exportedAt: new Date().toISOString(),
  };
}
