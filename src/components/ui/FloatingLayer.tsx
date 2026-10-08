import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

interface FloatingLayerProps {
  open: boolean;
  anchorRef?: RefObject<HTMLElement | null>;
  point?: { x: number; y: number };
  onClose: () => void;
  children: ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
  minWidth?: number;
  gap?: number;
  padding?: number;
}

export function FloatingLayer({
  open,
  anchorRef,
  point,
  onClose,
  children,
  className = '',
  role,
  ariaLabel,
  minWidth = 142,
  gap = 6,
  padding = 10,
}: FloatingLayerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    maxHeight: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const panelWidth = Math.max(minWidth, panel.offsetWidth);
    const panelHeight = panel.offsetHeight;
    const anchor = anchorRef?.current?.getBoundingClientRect();
    const anchorLeft = point?.x ?? anchor?.left ?? padding;
    const anchorRight = point?.x ?? anchor?.right ?? anchorLeft;
    const anchorTop = point?.y ?? anchor?.top ?? padding;
    const anchorBottom = point?.y ?? anchor?.bottom ?? anchorTop;
    const below = window.innerHeight - anchorBottom - padding;
    const above = anchorTop - padding;
    const placeAbove = below < panelHeight && above > below;
    const availableHeight = Math.max(72, placeAbove ? above : below);
    const preferredLeft = point ? anchorLeft : anchorRight - panelWidth;
    const left = Math.max(
      padding,
      Math.min(preferredLeft, window.innerWidth - panelWidth - padding),
    );
    const top = placeAbove
      ? Math.max(padding, anchorTop - gap - Math.min(panelHeight, availableHeight))
      : Math.min(window.innerHeight - padding, anchorBottom + gap);
    setPosition({ left, top, maxHeight: availableHeight });
  }, [anchorRef, gap, minWidth, padding, point]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        '[autofocus], [aria-selected="true"], button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      (target ?? panelRef.current)?.focus({ preventScroll: true });
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.requestAnimationFrame(() => {
        const successorLayer = document.querySelector('[aria-modal="true"], .floating-layer-panel');
        if (successorLayer) return;
        previousFocusRef.current?.focus({ preventScroll: true });
      });
    };
  }, [open, updatePosition]);

  if (!open) return null;
  return createPortal(
    <div
      className="floating-layer"
      onPointerDownCapture={(event) => {
        if (panelRef.current?.contains(event.target as Node)) return;
        const { clientX, clientY, timeStamp } = event;
        event.preventDefault();
        event.stopPropagation();
        const blockClick = (clickEvent: MouseEvent) => {
          window.removeEventListener('click', blockClick, true);
          const sameGesture =
            clickEvent.timeStamp - timeStamp < 500 &&
            Math.abs(clickEvent.clientX - clientX) < 4 &&
            Math.abs(clickEvent.clientY - clientY) < 4;
          if (!sameGesture) return;
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
        };
        window.addEventListener('click', blockClick, true);
        window.setTimeout(() => window.removeEventListener('click', blockClick, true), 500);
        onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        className={`floating-layer-panel ${className}`}
        role={role}
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{
          left: position?.left ?? -10000,
          top: position?.top ?? -10000,
          minWidth,
          maxHeight: position?.maxHeight ?? 1000,
          visibility: position ? 'visible' : 'hidden',
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
