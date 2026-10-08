import { useLayoutEffect, useRef, type RefObject } from 'react';

export function useFlipList<T extends HTMLElement>(
  changeKey: string,
  skipAnimationRef?: RefObject<boolean>,
): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const previousRects = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rows = [...container.querySelectorAll<HTMLElement>('[data-flip-key]')];
    const currentRects = new Map<string, DOMRect>();
    const sorting = Boolean(container.querySelector('[data-sorting="true"]'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const row of rows) {
      const key = row.dataset.flipKey;
      if (key) currentRects.set(key, row.getBoundingClientRect());
    }
    if (!sorting && !reducedMotion && !skipAnimationRef?.current) {
      for (const row of rows) {
        const key = row.dataset.flipKey;
        const before = key ? previousRects.current.get(key) : undefined;
        const after = key ? currentRects.get(key) : undefined;
        if (!before || !after) continue;
        const deltaY = before.top - after.top;
        if (Math.abs(deltaY) < 1) continue;
        row.animate(
          [
            { transform: `translateY(${deltaY}px)`, opacity: 0.82 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 300,
            easing: 'cubic-bezier(.16,1,.3,1)',
          },
        );
      }
    }
    previousRects.current = currentRects;
  }, [changeKey, skipAnimationRef]);

  return containerRef;
}
