// Serialize snapshots so an older write cannot finish after a newer write.
// Object identity, rather than timestamps, detects edits made during an await.
export function createDirtySaver<T extends { id?: number }>(options: {
  snapshot: () => { records: T[]; dirtyIds: Set<number> };
  persist: (records: T[]) => Promise<unknown>;
  acknowledge: (records: T[]) => void;
}) {
  let pending: Promise<void> | null = null;
  return function save(): Promise<void> {
    if (pending) return pending;
    pending = Promise.resolve().then(async () => {
      for (;;) {
        const { records, dirtyIds } = options.snapshot();
        const batch = records.filter(record => record.id !== undefined && dirtyIds.has(record.id));
        if (batch.length === 0) return;
        await options.persist(batch);
        options.acknowledge(batch);
      }
    }).finally(() => { pending = null; });
    return pending;
  };
}

export function acknowledgeSaved<T extends { id?: number }>(
  dirtyIds: Set<number>, current: T[], saved: T[],
): Set<number> {
  const remaining = new Set(dirtyIds);
  for (const record of saved) {
    if (current.find(item => item.id === record.id) === record) remaining.delete(record.id!);
  }
  return remaining;
}
