import { liveQuery } from 'dexie';
import { Check, MoreHorizontal, Pencil, Tag as TagIcon, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Tag, TaskTag } from '../../lib/types';
import { useT } from '../../lib/i18n';
import { db } from '../../db/database';
import { createTagForTasks, deleteTaskTag, renameTaskTag } from '../../db/task-tags';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';
import { TaskList } from '../task/TaskList';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { FloatingLayer } from '../ui/FloatingLayer';

interface TagOverviewRowProps {
  tag: Tag;
  taskCount: number;
  onOpen: () => void;
  onRename: (tagId: number, name: string) => Promise<boolean>;
  onDelete: (tag: Tag) => void;
}

function TagOverviewRow({ tag, taskCount, onOpen, onRename, onDelete }: TagOverviewRowProps) {
  const { t } = useT();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(tag.name);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(tag.name);
  }, [editing, tag.name]);

  const submitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name || !tag.id) return;
    if (await onRename(tag.id, name)) setEditing(false);
  };

  return (
    <div className="tags-page-row lists-page-row">
      {editing ? (
        <form className="tags-page-edit-form" onSubmit={(event) => void submitRename(event)}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setEditing(false);
              }
            }}
            aria-label={t('tagNamePlaceholder')}
          />
          <button
            type="submit"
            className="icon-button"
            aria-label={t('confirm')}
            disabled={!draft.trim()}
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t('cancelBtn')}
            onClick={() => setEditing(false)}
          >
            <X size={15} />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="tags-page-row-main lists-page-row-main"
          data-ui="tag-overview-main"
          onClick={onOpen}
          aria-label={`${tag.name}, ${t('tagTaskCount', { n: taskCount })}`}
        >
          <span className="lists-page-row-copy">
            <strong>{tag.name}</strong>
          </span>
          <span className="tags-page-task-count">{t('tagTaskCount', { n: taskCount })}</span>
        </button>
      )}
      <button
        ref={anchorRef}
        type="button"
        className="icon-button tags-page-more"
        aria-label={`${t('moreActions')}: ${tag.name}`}
        title={t('moreActions')}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreHorizontal size={18} />
      </button>
      <FloatingLayer
        open={menuOpen}
        anchorRef={anchorRef}
        onClose={() => setMenuOpen(false)}
        role="menu"
        ariaLabel={`${t('moreActions')}: ${tag.name}`}
        minWidth={150}
        className="tags-page-menu floating-panel"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setMenuOpen(false);
            setDraft(tag.name);
            setEditing(true);
          }}
        >
          <Pencil size={14} /> {t('renameTag')}
        </button>
        <button
          type="button"
          role="menuitem"
          className="is-danger"
          onClick={() => {
            setMenuOpen(false);
            onDelete(tag);
          }}
        >
          <Trash2 size={14} /> {t('deleteTag')}
        </button>
      </FloatingLayer>
    </div>
  );
}

export function TagsPage() {
  const { tagId: tagIdParam } = useParams<{ tagId?: string }>();
  const tagId = tagIdParam && /^\d+$/.test(tagIdParam) ? Number(tagIdParam) : null;
  const navigate = useNavigate();
  const { t } = useT();
  const tasks = useTaskStore((state) => state.tasks);
  const isLoadingTasks = useTaskStore((state) => state.isLoading);
  const loadAllTasks = useTaskStore((state) => state.loadAllTasks);
  const showCreateTag = useUIStore((state) => state.showCreateTag);
  const setShowCreateTag = useUIStore((state) => state.setShowCreateTag);
  const addToast = useUIStore((state) => state.addToast);
  const [tags, setTags] = useState<Tag[]>([]);
  const [relations, setRelations] = useState<TaskTag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadAllTasks();
  }, [loadAllTasks]);

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const [nextTags, nextRelations] = await Promise.all([
        db.tags.toArray(),
        db.taskTags.toArray(),
      ]);
      return { tags: nextTags, relations: nextRelations };
    }).subscribe({
      next: (snapshot) => {
        setTags(snapshot.tags);
        setRelations(snapshot.relations);
        setIsLoadingTags(false);
      },
      error: () => {
        setIsLoadingTags(false);
        addToast(t('operationFailed'), 'error');
      },
    });
    return () => subscription.unsubscribe();
  }, [addToast, t]);

  useEffect(() => {
    if (!showCreateTag) return;
    setShowCreateForm(true);
    setShowCreateTag(false);
  }, [setShowCreateTag, showCreateTag]);

  useEffect(() => {
    if (showCreateForm) createInputRef.current?.focus();
  }, [showCreateForm]);

  const sortedTags = useMemo(
    () => [...tags].sort((left, right) => left.name.localeCompare(right.name)),
    [tags],
  );
  const validTaskIds = useMemo(
    () =>
      new Set(
        tasks
          .filter((task) => task.status !== 'draft' && task.id !== undefined)
          .map((task) => task.id!),
      ),
    [tasks],
  );
  const tagCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const relation of relations) {
      if (validTaskIds.has(relation.taskId)) {
        counts.set(relation.tagId, (counts.get(relation.tagId) ?? 0) + 1);
      }
    }
    return counts;
  }, [relations, validTaskIds]);
  const currentTag = tagId === null ? null : (sortedTags.find((tag) => tag.id === tagId) ?? null);
  const currentTaskIds = useMemo(
    () =>
      new Set(
        relations.filter((relation) => relation.tagId === tagId).map((relation) => relation.taskId),
      ),
    [relations, tagId],
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.status !== 'draft' && task.id !== undefined && currentTaskIds.has(task.id),
      ),
    [currentTaskIds, tasks],
  );

  useEffect(() => {
    if (tagId !== null && !isLoadingTags && !currentTag) {
      navigate('/app/tags', { replace: true });
    }
  }, [currentTag, isLoadingTags, navigate, tagId]);

  const createTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name || isCreating) return;
    setIsCreating(true);
    try {
      await createTagForTasks([], name);
      setNewTagName('');
      setShowCreateForm(false);
    } catch {
      addToast(t('operationFailed'), 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const renameTag = async (id: number, name: string) => {
    try {
      const updated = await renameTaskTag(id, name);
      if (updated > 0) return true;
      addToast(t('operationFailed'), 'error');
    } catch {
      addToast(t('operationFailed'), 'error');
    }
    return false;
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteTaskTag(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      addToast(t('operationFailed'), 'error');
    }
  };

  if (tagId !== null) {
    if (isLoadingTags || isLoadingTasks || !currentTag) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    return (
      <div className="tags-page">
        <p className="tags-page-detail-meta">
          {t('tagTaskCount', { n: tagCounts.get(tagId) ?? 0 })}
        </p>
        <TaskList key={`tag:${tagId}`} tasks={filteredTasks} emptyMessage={t('noTasksForTag')} />
      </div>
    );
  }

  return (
    <div className="tags-page">
      {showCreateForm && (
        <form
          className="lists-page-create-form animate-slide-down"
          onSubmit={(event) => void createTag(event)}
        >
          <TagIcon size={16} aria-hidden="true" />
          <input
            ref={createInputRef}
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setShowCreateForm(false);
                setNewTagName('');
              }
            }}
            placeholder={t('tagNamePlaceholder')}
            aria-label={t('tagNamePlaceholder')}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!newTagName.trim() || isCreating}
          >
            {t('confirm')}
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={t('cancelBtn')}
            onClick={() => {
              setShowCreateForm(false);
              setNewTagName('');
            }}
          >
            <X size={15} />
          </button>
        </form>
      )}

      {isLoadingTags ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedTags.length > 0 ? (
        <div className="lists-page-surface task-list-surface">
          {sortedTags.map((tag) => (
            <TagOverviewRow
              key={tag.id}
              tag={tag}
              taskCount={tagCounts.get(tag.id!) ?? 0}
              onOpen={() => navigate(`/app/tags/${tag.id}`)}
              onRename={renameTag}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="lists-page-empty task-list-surface">
          <TagIcon size={22} aria-hidden="true" />
          <p>{t('noTags')}</p>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t('deleteTagTitle')}
          message={t('deleteTagConfirm', { name: deleteTarget.name })}
          confirmLabel={t('deleteTag')}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export function LegacyTagRedirect() {
  const { tagName } = useParams<{ tagName: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void db.tags
      .where('name')
      .equals(tagName ?? '')
      .first()
      .then((tag) => {
        if (active) navigate(tag?.id ? `/app/tags/${tag.id}` : '/app/tags', { replace: true });
      })
      .catch(() => {
        if (active) navigate('/app/tags', { replace: true });
      });
    return () => {
      active = false;
    };
  }, [navigate, tagName]);

  return null;
}
