import { createContext, useContext } from 'react';

export const SortableDragStateContext = createContext(false);

export function useSortableDragActive() {
  return useContext(SortableDragStateContext);
}
