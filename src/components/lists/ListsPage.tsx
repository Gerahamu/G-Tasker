import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, List, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT, getListDisplayName } from '../../lib/i18n';
import { useListStore } from '../../stores/list-store';
import { useTaskStore } from '../../stores/task-store';
import { useUIStore } from '../../stores/ui-store';

export function ListsPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const lists = useListStore((state) => state.lists);
  const loadLists = useListStore((state) => state.loadLists);
  const addList = useListStore((state) => state.addList);
  const tasks = useTaskStore((state) => state.tasks);
  const loadAllTasks = useTaskStore((state) => state.loadAllTasks);
  const addToast = useUIStore((state) => state.addToast);
  const showCreateList = useUIStore((state) => state.showCreateList);
  const setShowCreateList = useUIStore((state) => state.setShowCreateList);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void Promise.all([loadLists(), loadAllTasks()]);
  }, [loadAllTasks, loadLists]);

  useEffect(() => {
    if (showCreate) inputRef.current?.focus();
  }, [showCreate]);

  useEffect(() => {
    if (!showCreateList) return;
    setShowCreate(true);
    setShowCreateList(false);
  }, [setShowCreateList, showCreateList]);

  const userLists = useMemo(() => lists.filter((list) => !list.isSmartList), [lists]);
  const listStats = useMemo(() => {
    const stats = new Map<number, { total: number; completed: number }>();
    for (const task of tasks) {
      if (task.status === 'draft') continue;
      const current = stats.get(task.listId) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (task.completedAt) current.completed += 1;
      stats.set(task.listId, current);
    }
    return stats;
  }, [tasks]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    const duplicate = userLists.find((list) => list.name === name);
    if (duplicate) {
      setNewName('');
      setShowCreate(false);
      setShowCreateList(false);
      navigate(`/app/list/${duplicate.id}`);
      return;
    }
    try {
      const id = await addList({
        name,
        color: '#3b82f6',
        icon: 'List',
        isSmartList: false,
        filterConfig: null,
      });
      setNewName('');
      setShowCreate(false);
      setShowCreateList(false);
      navigate(`/app/list/${id}`);
    } catch {
      addToast(t('operationFailed'), 'error');
    }
  };

  return (
    <div className="lists-page">
      {showCreate && (
        <form
          className="lists-page-create-form animate-slide-down"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          <List size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t('listNamePlaceholder')}
            aria-label={t('listNamePlaceholder')}
          />
          <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
            {t('confirm')}
          </button>
        </form>
      )}

      {userLists.length > 0 ? (
        <div className="lists-page-surface task-list-surface">
          {userLists.map((list) => {
            const displayName = getListDisplayName(list.name, t);
            const stats = listStats.get(list.id!) ?? { total: 0, completed: 0 };
            return (
              <div key={list.id} className="lists-page-row">
                <button
                  type="button"
                  className="lists-page-row-main"
                  onClick={() => navigate(`/app/list/${list.id}`)}
                >
                  <span className="lists-page-row-copy">
                    <strong>{displayName}</strong>
                    <span>
                      {stats.total} {t('taskSection')}
                      {stats.completed > 0 && ` · ${stats.completed} ${t('completed')}`}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="lists-page-empty task-list-surface">
          <CheckCircle2 size={22} aria-hidden="true" />
          <p>{t('noCustomList')}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> {t('newList')}
          </button>
        </div>
      )}
    </div>
  );
}
