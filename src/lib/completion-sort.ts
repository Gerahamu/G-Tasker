/**
 * Preserves an existing list's unfinished order while placing completed items
 * after it. Completed records are chronological so the newest completion is
 * naturally the final item in the group.
 *
 * Older persisted records may not have a completion timestamp. Those records
 * retain their incoming order until they are completed again.
 */
export function sortCompletedLast<T>(
  items: readonly T[],
  isCompleted: (item: T) => boolean,
  getCompletedAt: (item: T) => string | null | undefined,
  deterministic?: {
    getSortOrder: (item: T) => number;
    getCreatedAt: (item: T) => string | null | undefined;
    getId: (item: T) => number | string | null | undefined;
  },
): T[] {
  const unfinished: T[] = [];
  const completed: T[] = [];

  for (const item of items) {
    if (isCompleted(item)) completed.push(item);
    else unfinished.push(item);
  }

  const compareFallback = (a: T, b: T) => {
    if (!deterministic) return 0;
    const order = deterministic.getSortOrder(a) - deterministic.getSortOrder(b);
    if (order !== 0) return order;
    const created = (deterministic.getCreatedAt(a) ?? '').localeCompare(
      deterministic.getCreatedAt(b) ?? '',
    );
    if (created !== 0) return created;
    return String(deterministic.getId(a) ?? '').localeCompare(
      String(deterministic.getId(b) ?? ''),
      undefined,
      { numeric: true },
    );
  };

  unfinished.sort(compareFallback);

  completed.sort((a, b) => {
    const aCompletedAt = getCompletedAt(a);
    const bCompletedAt = getCompletedAt(b);

    // Keep legacy completed records stable: their actual completion time was
    // never recorded, so inventing one would make their order unreliable.
    if (!aCompletedAt && !bCompletedAt) return compareFallback(a, b);
    if (!aCompletedAt) return -1;
    if (!bCompletedAt) return 1;
    return aCompletedAt.localeCompare(bCompletedAt) || compareFallback(a, b);
  });

  return [...unfinished, ...completed];
}
