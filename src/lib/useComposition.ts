import { useState, useCallback, useRef } from 'react';
import type { KeyboardEvent, CompositionEvent } from 'react';

/**
 * Shared IME composition hook.
 *
 * Fixes CJK input bugs caused by:
 * - Enter key firing submit during IME candidate selection
 * - onChange writing to DB and reloading during active composition
 *
 * Usage:
 *   const { isComposing, onCompositionStart, onCompositionEnd, onKeyDown } = useComposition();
 *   <input onCompositionStart={onCompositionStart} onCompositionEnd={onCompositionEnd}
 *          onKeyDown={(e) => onKeyDown(e, () => handleSubmit())} />
 */
export function useComposition() {
  const [isComposing, setIsComposing] = useState(false);
  // Use a ref for synchronous access in event handlers
  const composingRef = useRef(false);

  const onCompositionStart = useCallback((_e: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    composingRef.current = true;
    setIsComposing(true);
  }, []);

  const onCompositionEnd = useCallback((_e: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    composingRef.current = false;
    setIsComposing(false);
  }, []);

  /**
   * Safe onKeyDown that prevents Enter from firing during IME composition.
   * Also checks nativeEvent.isComposing for browsers that support it.
   */
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, handler: () => void) => {
      if (e.key !== 'Enter') return;

      // Check native isComposing flag (Chromium-based browsers)
      const nativeComposing = (e.nativeEvent as { isComposing?: boolean }).isComposing;
      if (nativeComposing === true || composingRef.current) {
        // User is selecting an IME candidate — don't submit
        e.preventDefault();
        return;
      }

      handler();
    },
    [],
  );

  /** Check if currently composing (for use in non-keyboard handlers) */
  const checkComposing = useCallback((): boolean => {
    return composingRef.current;
  }, []);

  return { isComposing, onCompositionStart, onCompositionEnd, onKeyDown, checkComposing };
}
