import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../stores/ui-store';
import { useListStore } from '../../stores/list-store';
import { getListDisplayName, useT } from '../../lib/i18n';
import { ArrowLeft, Menu, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { liveQuery } from 'dexie';
import { db } from '../../db/database';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useT();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setShowCreateModal = useUIStore((s) => s.setShowCreateModal);
  const setShowCreateList = useUIStore((s) => s.setShowCreateList);
  const setShowCreateTag = useUIStore((s) => s.setShowCreateTag);
  const setShowCreatePlan = useUIStore((s) => s.setShowCreatePlan);
  const setPresetListId = useUIStore((s) => s.setPresetListId);
  const addToast = useUIStore((s) => s.addToast);
  const lists = useListStore((s) => s.lists);
  const updateList = useListStore((s) => s.updateList);
  const deleteList = useListStore((s) => s.deleteList);

  const listMatch = location.pathname.match(/^\/app\/list\/(\d+)$/);
  const currentListId = listMatch ? Number(listMatch[1]) : null;
  const isListsPage = location.pathname === '/app/lists';
  const isTagsOverview = location.pathname === '/app/tags';
  const isPlanningPage = location.pathname === '/app/planning';
  const tagPathMatch = location.pathname.match(/^\/app\/tags\/(\d+)$/);
  const currentTagId = tagPathMatch ? Number(tagPathMatch[1]) : null;
  const [currentTagName, setCurrentTagName] = useState('');
  const currentList =
    currentListId === null ? null : (lists.find((list) => list.id === currentListId) ?? null);
  const currentListName = currentList?.name ?? '';
  const [editingListName, setEditingListName] = useState(false);
  const [listNameDraft, setListNameDraft] = useState(currentListName);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const listNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentTagId === null) {
      setCurrentTagName('');
      return;
    }
    const subscription = liveQuery(() => db.tags.get(currentTagId)).subscribe({
      next: (tag) => setCurrentTagName(tag?.name ?? ''),
      error: () => setCurrentTagName(''),
    });
    return () => subscription.unsubscribe();
  }, [currentTagId]);

  useEffect(() => {
    setEditingListName(false);
    setListNameDraft(currentListName);
  }, [currentListId, currentListName]);

  useEffect(() => {
    if (editingListName) listNameInputRef.current?.focus();
  }, [editingListName]);

  const saveListName = () => {
    if (!currentList) return;
    const nextName = listNameDraft.trim();
    if (nextName && nextName !== currentList.name) {
      updateList(currentList.id!, { name: nextName });
    }
    setEditingListName(false);
  };

  const getTitle = () => {
    const path = location.pathname;
    if (path === '/app/today') return t('today');
    if (path === '/app/scheduled') return t('scheduled');
    if (path === '/app/all') return t('allTasks');
    if (path === '/app/flagged') return t('flagged');
    if (path === '/app/overdue') return t('overdue');
    if (isTagsOverview) return t('tagPage');
    if (currentTagId !== null) return currentTagName || t('tagPage');
    if (path === '/app/memo') return t('memoNav');
    if (path === '/app/planning') return t('planNav');
    if (path === '/app/clock') return t('clock');
    if (path === '/app/calendar') return t('calendar');
    if (path === '/app/search') return t('search');
    if (path === '/app/lists') return t('myLists');
    if (path === '/app/settings') return t('settings');
    if (currentList !== null) {
      return getListDisplayName(currentList.name, t);
    }
    if (path.includes('/app/task/')) return t('taskDetail');
    return t('appName');
  };

  const showAddButton =
    !isTagsOverview &&
    ![
      '/app/search',
      '/app/clock',
      '/app/calendar',
      '/app/settings',
      '/app/memo',
      '/app/planning',
    ].includes(location.pathname);

  return (
    <header className="app-navbar gt-material-toolbar" data-ui="toolbar">
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="icon-button navbar-sidebar-toggle"
            aria-label={t('openNavigation')}
          >
            <Menu size={19} />
          </button>
        )}
        {currentList ? (
          <div className="navbar-list-title">
            {editingListName ? (
              <input
                ref={listNameInputRef}
                value={listNameDraft}
                onChange={(event) => setListNameDraft(event.target.value)}
                onBlur={saveListName}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveListName();
                  }
                  if (event.key === 'Escape') {
                    setListNameDraft(currentList.name);
                    setEditingListName(false);
                  }
                }}
                className="navbar-list-name-input"
                aria-label={t('editListName')}
              />
            ) : (
              <button
                type="button"
                className="navbar-title navbar-title-editable"
                onClick={() => setEditingListName(true)}
                aria-label={t('editListName')}
                title={t('editListName')}
              >
                {getTitle()}
              </button>
            )}
            <button
              type="button"
              className="navbar-list-back"
              onClick={() => navigate('/app/lists')}
              aria-label={t('backToList')}
              title={t('backToList')}
            >
              <ArrowLeft size={17} />
            </button>
          </div>
        ) : currentTagId !== null ? (
          <div className="navbar-list-title">
            <h2 className="navbar-title">{getTitle()}</h2>
            <button
              type="button"
              className="navbar-list-back"
              onClick={() => navigate('/app/tags')}
              aria-label={t('tagsNav')}
              title={t('tagsNav')}
            >
              <ArrowLeft size={17} />
            </button>
          </div>
        ) : (
          <h2 className="navbar-title">{getTitle()}</h2>
        )}
      </div>
      <div className={currentList ? 'navbar-list-actions' : undefined}>
        {currentList && (
          <button
            type="button"
            className="icon-button navbar-list-delete"
            aria-label={t('deleteListNamed', { name: getListDisplayName(currentList.name, t) })}
            title={t('deleteListNamed', { name: getListDisplayName(currentList.name, t) })}
            onClick={() =>
              setDeleteTarget({
                id: currentList.id!,
                name: getListDisplayName(currentList.name, t),
              })
            }
          >
            <Trash2 size={17} />
          </button>
        )}
        {(showAddButton || isListsPage || isPlanningPage || isTagsOverview) && (
          <button
            data-ui={
              isTagsOverview
                ? 'create-tag-trigger'
                : isListsPage
                  ? 'create-list-trigger'
                  : isPlanningPage
                    ? 'create-plan-trigger'
                    : 'create-task-trigger'
            }
            onClick={() => {
              if (isTagsOverview) {
                setShowCreateTag(true);
                return;
              }
              if (isListsPage) {
                setShowCreateList(true);
                return;
              }
              if (isPlanningPage) {
                setShowCreatePlan(true);
                return;
              }
              setPresetListId(currentListId);
              setShowCreateModal(true);
            }}
            className="btn btn-primary navbar-create"
          >
            <Plus size={16} />{' '}
            {t(
              isTagsOverview
                ? 'newTag'
                : isListsPage
                  ? 'newList'
                  : isPlanningPage
                    ? 'newPlan'
                    : 'newTask',
            )}
          </button>
        )}
      </div>
      {deleteTarget && (
        <ConfirmDialog
          title={t('deleteListTitle')}
          message={t('deleteListConfirm', { name: deleteTarget.name })}
          onConfirm={async () => {
            try {
              await deleteList(deleteTarget.id);
              setDeleteTarget(null);
              navigate('/app/lists');
            } catch {
              addToast(t('operationFailed'), 'error');
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </header>
  );
}
