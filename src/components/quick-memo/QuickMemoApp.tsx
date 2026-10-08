import { useCallback, useEffect, useRef, useState } from 'react';

const QUICK_MEMO_DRAFT_KEY = 'gtasker.quick-memo.draft';

function readQuickMemoDraft() {
  try {
    return window.localStorage.getItem(QUICK_MEMO_DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
}

function persistQuickMemoDraft(content: string) {
  try {
    if (content) {
      window.localStorage.setItem(QUICK_MEMO_DRAFT_KEY, content);
    } else {
      window.localStorage.removeItem(QUICK_MEMO_DRAFT_KEY);
    }
  } catch {
    // The in-memory value remains available if local storage is unavailable.
  }
}

export function QuickMemoApp() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(readQuickMemoDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const clearTransientState = useCallback(() => {
    setError('');
  }, []);

  const hideWindow = useCallback(async () => {
    setError('');
    await window.gtaskerQuickMemo?.hide();
  }, []);

  const saveMemo = useCallback(async () => {
    const normalized = content.trim();
    if (!normalized || isSaving) return;

    if (!window.gtaskerQuickMemo) {
      setError('Quick Memo 只能在 G-Tasker App 中使用');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await window.gtaskerQuickMemo.save(normalized);
      setContent('');
      persistQuickMemoDraft('');
      await window.gtaskerQuickMemo.hide();
    } catch {
      setError('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [content, isSaving]);

  useEffect(() => {
    document.title = 'Quick Memo';
    focusInput();
    const unsubscribeActivate = window.gtaskerQuickMemo?.onActivate(focusInput);
    const unsubscribeReset = window.gtaskerQuickMemo?.onReset(clearTransientState);
    return () => {
      unsubscribeActivate?.();
      unsubscribeReset?.();
    };
  }, [clearTransientState, focusInput]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      void hideWindow();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void saveMemo();
    }
  };

  const handleRootMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) {
      void hideWindow();
    }
  };

  return (
    <main className="quick-memo-root" onMouseDown={handleRootMouseDown}>
      <section className="quick-memo-card" aria-label="Quick Memo">
        <div className="quick-memo-header">
          <span className="quick-memo-title">Quick Memo</span>
        </div>
        <textarea
          ref={inputRef}
          className="quick-memo-input"
          value={content}
          onChange={(event) => {
            const nextContent = event.target.value;
            setContent(nextContent);
            persistQuickMemoDraft(nextContent);
          }}
          onKeyDown={handleKeyDown}
          placeholder="快速记录..."
          aria-label="Quick Memo 内容"
          disabled={isSaving}
          rows={4}
        />
        <div className="quick-memo-status" aria-live="polite">
          {error}
        </div>
      </section>
    </main>
  );
}
