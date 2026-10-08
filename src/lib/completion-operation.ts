const revisions = new Map<string, number>();

/** Starts a new completion-state operation for one task or subtask. */
export function beginCompletionOperation(key: string): number {
  const revision = (revisions.get(key) ?? 0) + 1;
  revisions.set(key, revision);
  return revision;
}

/** Lets an Undo action prove it still refers to the latest state change. */
export function isCurrentCompletionOperation(key: string, revision: number): boolean {
  return revisions.get(key) === revision;
}
