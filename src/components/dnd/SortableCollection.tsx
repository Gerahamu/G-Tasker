import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableDragStateContext } from './sortable-drag-state';

const INTERACTIVE_SELECTOR =
  'button, input, textarea, select, a, [contenteditable="true"], [role="menu"], [role="menuitem"], [role="dialog"], [data-no-dnd]';

interface DragPreviewState {
  node: HTMLElement;
  width: number;
  height: number;
}

interface SortableCollectionProps<T> {
  items: readonly T[];
  getId: (item: T) => number;
  onReorder: (orderedIds: number[], activeId: number, overId: number) => void | Promise<void>;
  renderItem: (item: T) => ReactNode;
  itemClassName?: string;
  ariaLabel: string;
  disabled?: boolean;
}

function SortableItem({
  id,
  children,
  className,
  suppressClick,
  registerNode,
  lockedSize,
  disabled,
}: {
  id: number;
  children: ReactNode;
  className?: string;
  suppressClick: boolean;
  registerNode: (id: number, node: HTMLElement | null) => void;
  lockedSize: Pick<DragPreviewState, 'width' | 'height'> | null;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const suppressUntilRef = useRef(0);
  const handleNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setNodeRef(node);
      registerNode(id, node);
    },
    [id, registerNode, setNodeRef],
  );
  useEffect(() => () => registerNode(id, null), [id, registerNode]);
  useEffect(() => {
    if (isDragging) suppressUntilRef.current = Date.now() + 500;
  }, [isDragging]);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 2 : undefined,
    touchAction: 'pan-y',
    ...(isDragging && lockedSize
      ? {
          width: `${lockedSize.width}px`,
          minWidth: `${lockedSize.width}px`,
          maxWidth: `${lockedSize.width}px`,
          height: `${lockedSize.height}px`,
          minHeight: `${lockedSize.height}px`,
          maxHeight: `${lockedSize.height}px`,
        }
      : {}),
  } as const;
  const isInteractive = (target: EventTarget | null, currentTarget: HTMLElement) => {
    if (!(target instanceof Element)) return false;
    const match = target.closest(INTERACTIVE_SELECTOR);
    return Boolean(match && match !== currentTarget);
  };

  return (
    <div
      ref={handleNodeRef}
      data-flip-key={id}
      data-no-dnd
      data-sortable-id={id}
      data-dragging={isDragging ? 'true' : 'false'}
      className={`sortable-row ${className ?? ''}`}
      style={style}
      {...attributes}
      onPointerDown={(event) => {
        if (disabled || isInteractive(event.target, event.currentTarget)) return;
        listeners?.onPointerDown?.(event);
      }}
      onMouseDown={(event) => {
        if (disabled || isInteractive(event.target, event.currentTarget)) return;
        listeners?.onMouseDown?.(event);
      }}
      onTouchStart={(event) => {
        if (disabled || isInteractive(event.target, event.currentTarget)) return;
        listeners?.onTouchStart?.(event);
      }}
      onKeyDown={(event) => {
        if (disabled || isInteractive(event.target, event.currentTarget)) return;
        listeners?.onKeyDown?.(event);
      }}
      onClickCapture={(event) => {
        if (!suppressClick && Date.now() >= suppressUntilRef.current) return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

function StaticDragPreview({ preview }: { preview: DragPreviewState }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren(preview.node);
    return () => host.replaceChildren();
  }, [preview]);

  return (
    <div
      ref={hostRef}
      className="sortable-drag-overlay"
      style={{ width: preview.width, height: preview.height }}
      aria-hidden="true"
      inert
    />
  );
}

const stablePointerCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
};

export function SortableCollection<T>({
  items,
  getId,
  onReorder,
  renderItem,
  itemClassName,
  ariaLabel,
  disabled = false,
}: SortableCollectionProps<T>) {
  const ids = useMemo(() => items.map(getId), [getId, items]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activePreview, setActivePreview] = useState<DragPreviewState | null>(null);
  const [recentlyDraggedId, setRecentlyDraggedId] = useState<number | null>(null);
  const itemNodesRef = useRef(new Map<number, HTMLElement>());
  const registerNode = useCallback((id: number, node: HTMLElement | null) => {
    if (node) itemNodesRef.current.set(id, node);
    else itemNodesRef.current.delete(id);
  }, []);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (recentlyDraggedId === null) return;
    const timer = window.setTimeout(() => setRecentlyDraggedId(null), 250);
    return () => window.clearTimeout(timer);
  }, [recentlyDraggedId]);

  const handleStart = (event: DragStartEvent) => {
    const startedId = Number(event.active.id);
    const source = itemNodesRef.current.get(startedId);
    if (source) {
      const rect = source.getBoundingClientRect();
      const clone = source.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      clone.removeAttribute('data-dragging');
      clone.setAttribute('data-drag-overlay-content', 'true');
      clone.style.removeProperty('transform');
      clone.style.removeProperty('transition');
      clone.style.width = '100%';
      clone.style.height = '100%';
      setActivePreview({ node: clone, width: rect.width, height: rect.height });
    }
    setActiveId(startedId);
    const blockSyntheticClick = (clickEvent: MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      window.removeEventListener('click', blockSyntheticClick, true);
    };
    window.addEventListener('click', blockSyntheticClick, true);
    window.setTimeout(() => window.removeEventListener('click', blockSyntheticClick, true), 200);
  };
  const handleEnd = (event: DragEndEvent) => {
    const movedId = Number(event.active.id);
    setActiveId(null);
    setActivePreview(null);
    setRecentlyDraggedId(movedId);
    if (!event.over || event.active.id === event.over.id) return;
    const overId = Number(event.over.id);
    const from = ids.indexOf(movedId);
    const to = ids.indexOf(overId);
    if (from < 0 || to < 0) return;
    void onReorder(arrayMove(ids, from, to), movedId, overId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={stablePointerCollision}
      onDragStart={handleStart}
      onDragCancel={() => {
        setActiveId(null);
        setActivePreview(null);
      }}
      onDragEnd={handleEnd}
      accessibility={{ container: document.body }}
    >
      <SortableDragStateContext.Provider value={activeId !== null}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div aria-label={ariaLabel} data-sorting={activeId !== null ? 'true' : 'false'}>
            {items.map((item) => {
              const id = getId(item);
              return (
                <SortableItem
                  key={id}
                  id={id}
                  className={itemClassName}
                  suppressClick={recentlyDraggedId === id}
                  registerNode={registerNode}
                  lockedSize={activeId === id ? activePreview : null}
                  disabled={disabled}
                >
                  {renderItem(item)}
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </SortableDragStateContext.Provider>
      {activePreview &&
        createPortal(
          <DragOverlay adjustScale={false} dropAnimation={null} zIndex={80}>
            <StaticDragPreview preview={activePreview} />
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}
