import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../../stores/task-store';
import { useTagStore } from '../../stores/tag-store';
import { useMemoStore } from '../../stores/memo-store';
import { usePlanStore } from '../../stores/plan-store';
import { useT } from '../../lib/i18n';
import { db } from '../../db/database';
import { TaskRow } from '../task/TaskRow';
import { Search, Lightbulb, StickyNote, ArrowRight, Layout } from 'lucide-react';
import type { InboxItem } from '../../lib/types';

export function SearchPage() {
  const { tagName } = useParams<{ tagName?: string }>();
  const [query, setQuery] = useState(tagName || '');
  const navigate = useNavigate();
  const { t } = useT();
  const allTasks = useTaskStore((s) => s.tasks);
  const allTags = useTagStore((s) => s.tags);
  const allTaskTags = useTagStore((s) => s.taskTags);
  const allMemos = useMemoStore((s) => s.memos);
  const loadMemos = useMemoStore((s) => s.loadMemos);
  const planStore = usePlanStore();
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);

  useEffect(() => { loadMemos(); planStore.load(); }, [loadMemos]);
  useEffect(() => { db.inboxItems.toArray().then(setInboxItems); }, [query]);

  const { taskResults, memoResults, inboxResults, planResults } = useMemo(() => {
    if (!query.trim()) return { taskResults: [], memoResults: [], inboxResults: [], planResults: [] };
    const lower = query.toLowerCase();
    const matchingTagIds = new Set(allTags.filter(x => x.name.toLowerCase().includes(lower)).map(x => x.id!));
    const tasksWithMatchingTag = new Set(allTaskTags.filter(tt => matchingTagIds.has(tt.tagId)).map(tt => tt.taskId));
    const tasks = allTasks.filter(x => x.title.toLowerCase().includes(lower) || x.notes.toLowerCase().includes(lower) || tasksWithMatchingTag.has(x.id!));
    const memos = allMemos.filter(m => m.title.toLowerCase().includes(lower) || m.content.toLowerCase().includes(lower));
    const inbox = inboxItems.filter(i => i.title.toLowerCase().includes(lower) || (i.content || '').toLowerCase().includes(lower));
    const plans = planStore.plans.filter(p => p.name.toLowerCase().includes(lower) || p.goal.toLowerCase().includes(lower) || p.note.toLowerCase().includes(lower));
    return { taskResults: tasks, memoResults: memos, inboxResults: inbox, planResults: plans };
  }, [query, allTasks, allTags, allTaskTags, allMemos, inboxItems, planStore.plans]);

  const total = taskResults.length + memoResults.length + inboxResults.length + planResults.length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchAll')}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" autoFocus />
      </div>
      {!query.trim() ? (
        <div className="text-center py-12"><p className="text-gray-400 text-sm">{t('searchHint3')}</p></div>
      ) : total === 0 ? (
        <div className="text-center py-12"><p className="text-gray-400 text-sm">{t('noResults3')}</p></div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-gray-400">{t('foundResults3', { n: String(total) })}</p>

          {taskResults.length > 0 && (
            <div><h4 className="text-xs font-semibold text-gray-500 mb-2">{t('taskSection')} ({taskResults.length})</h4>
              <div className="bg-white rounded-lg border border-gray-200">{taskResults.map(t => <TaskRow key={t.id} task={t} />)}</div></div>)}
          {memoResults.length > 0 && (
            <div><h4 className="text-xs font-semibold text-gray-500 mb-2">{t('memoSection')} ({memoResults.length})</h4>
              <div className="space-y-2">{memoResults.map(m => (
                <div key={m.id} onClick={() => navigate('/app/memo')} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-purple-300 cursor-pointer">
                  <StickyNote size={14} className="text-purple-400 flex-shrink-0" /><span className="flex-1 text-sm text-gray-700 truncate">{m.title}</span><ArrowRight size={14} className="text-gray-300" /></div>))}
              </div></div>)}
          {planResults.length > 0 && (
            <div><h4 className="text-xs font-semibold text-gray-500 mb-2">📅 时段规划 ({planResults.length})</h4>
              <div className="space-y-2">{planResults.map(p => (
                <div key={p.id} onClick={() => navigate('/app/planning')} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 cursor-pointer">
                  <Layout size={14} className="text-blue-400 flex-shrink-0" /><span className="flex-1 text-sm text-gray-700 truncate">{p.name}</span><span className="text-xs text-gray-400">{p.goal}</span><ArrowRight size={14} className="text-gray-300" /></div>))}
              </div></div>)}
          {inboxResults.length > 0 && (
            <div><h4 className="text-xs font-semibold text-gray-500 mb-2">{t('inboxSection')} ({inboxResults.length})</h4>
              <div className="space-y-2">{inboxResults.map(i => (
                <div key={i.id} onClick={() => navigate('/app/inbox')} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-amber-300 cursor-pointer">
                  <Lightbulb size={14} className="text-amber-400 flex-shrink-0" /><span className="flex-1 text-sm text-gray-700 truncate">{i.title}</span><ArrowRight size={14} className="text-gray-300" /></div>))}
              </div></div>)}
        </div>)}
    </div>
  );
}
