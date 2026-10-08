import { useEffect, useState } from 'react';

export type SidebarSectionId = 'tasks' | 'tools';

type SidebarSectionState = Record<SidebarSectionId, boolean>;

const STORAGE_KEY = 'gtasker-sidebar-sections';
const DEFAULT_STATE: SidebarSectionState = {
  tasks: true,
  tools: true,
};

function readState(): SidebarSectionState {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '{}',
    ) as Partial<SidebarSectionState>;
    return {
      ...DEFAULT_STATE,
      ...Object.fromEntries(
        (Object.keys(DEFAULT_STATE) as SidebarSectionId[]).map((id) => [
          id,
          typeof stored[id] === 'boolean' ? stored[id] : DEFAULT_STATE[id],
        ]),
      ),
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useSidebarSection(id: SidebarSectionId, shouldExpand = false) {
  const [expanded, setExpanded] = useState(() => readState()[id]);

  useEffect(() => {
    if (shouldExpand) setExpanded(true);
  }, [shouldExpand]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), [id]: expanded }));
    } catch {
      // Sidebar interaction remains available when storage is unavailable.
    }
  }, [expanded, id]);

  return {
    expanded,
    toggle: () => setExpanded((current) => !current),
    expand: () => setExpanded(true),
  };
}
