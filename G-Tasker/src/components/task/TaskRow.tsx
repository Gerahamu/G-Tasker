import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../../stores/task-store';
import { useTagStore } from '../../stores/tag-store';
import { db } from '../../db/database';
import { PriorityBadge } from '../ui/PriorityBadge';
import { DueDateBadge } from '../ui/DueDateBadge';
import { Check, Flag, X, ChevronRight, ChevronDown, Clock } from 'lucide-react';
import type { Task, Subtask } from '../../lib/types';

interface TaskRowProps { task: Task }

export function TaskRow({ task }: TaskRowProps) {
  const navigate = useNavigate();
  const completeTask = useTaskStore((s) => s.completeTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const isCompleted = !!task.completedAt;

  // 🔍 调试检查
  useEffect(() => {
    if (task.dateStart || task.dateEnd) {
      console.log('Task Start Debug:', task.title, 'dateStart:', task.dateStart, 'dateEnd:', task.dateEnd);
    }
  }, [task.title, task.dateStart, task.dateEnd]);

  // ✅ 标签
  const allTags = useTagStore((s) => s.tags);
  const allTaskTags = useTagStore((s) => s.taskTags);
  const tags = useMemo(() => {
    const ids = allTaskTags.filter(tt => tt.taskId === task.id).map(tt => tt.tagId);
    return allTags.filter(t => ids.includes(t.id!));
  }, [allTags, allTaskTags, task.id]);

  const [step, setStep] = useState<0 | 1 | 2>(isCompleted ? 2 : 0);
  const [fading, setFading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [pendingSubs, setPendingSubs] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setStep(isCompleted ? 2 : 0); setFading(false); }, [isCompleted]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const loadSubtasks = useCallback(async () => {
    const items = await db.subtasks.where('taskId').equals(task.id!).sortBy('sortOrder');
    setSubtasks(items);
  }, [task.id]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!expanded) { setExpanded(true); loadSubtasks(); }
    else setExpanded(false);
  };

  const doComplete = useCallback(() => {
    setShowConfirm(false); setStep(2);
    timerRef.current = setTimeout(() => {
      setFading(true);
      timerRef.current = setTimeout(() => completeTask(task.id!), 500);
    }, 1000);
  }, [task.id, completeTask]);

  const handleCheck = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (step === 0) { setStep(1); setShowConfirm(true); }
    else if (step === 1) doComplete();
  }, [step, doComplete]);

  const handleCancel = useCallback(() => { setShowConfirm(false); setStep(0); }, []);

  const handleSubCheck = async (s: Subtask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (s.completed) {
      await db.subtasks.update(s.id!, { completed: false });
      setPendingSubs(prev => { const n = new Set(prev); n.delete(s.id!); return n; });
    } else if (pendingSubs.has(s.id!)) {
      await db.subtasks.update(s.id!, { completed: true });
      setPendingSubs(prev => { const n = new Set(prev); n.delete(s.id!); return n; });
    } else {
      setPendingSubs(prev => new Set(prev).add(s.id!));
    }
    loadSubtasks();
  };

  return (
    <>
      <div
        className={`task-row group cursor-pointer transition-all duration-500 ${step === 2 ? (fading ? 'opacity-0 max-h-0 py-0 overflow-hidden' : 'opacity-60') : ''}`}
        onClick={() => { if (step < 2) navigate(`/app/task/${task.id}`); }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
          {/* Expand button */}
          <button onClick={toggleExpand}
            className="flex-shrink-0 p-0.5 text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Complete circle */}
          <button onClick={handleCheck}
            className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              step === 2 ? 'bg-blue-500 border-blue-500' : step === 1 ? 'bg-gray-300 border-gray-300' : 'border-gray-300 bg-white hover:border-gray-400'
            }`}>
            {step >= 1 && <Check size={12} className="text-white" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm truncate transition-colors duration-300 ${step >= 1 ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {task.title}
              </span>
              {task.priority !== 'low' && step < 2 && <PriorityBadge priority={task.priority} />}
              {task.isFlagged && step < 2 && <Flag size={14} className="text-orange-500 fill-orange-500 flex-shrink-0" />}
            </div>
            {/* Due date + brief + countdown */}
            <div className="flex items-center gap-3 mt-0.5">
              <DueDateBadge dueDate={task.dueDate} dueTime={task.dueTime} completed={step >= 1} />
              {/* ✅ 开始日期倒计时 */}
              {task.dateStart && !task.completedAt && (() => {
                const start = new Date(task.dateStart);
                const now = new Date();
                const days = Math.ceil((start.getTime() - now.getTime()) / 86400000);
                if (days > 0) {
                  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{days}天后开始</span>;
                }
                return null;
              })()}
              {task.notes && <span className="text-[11px] text-gray-400 truncate max-w-[200px]">{task.notes.slice(0, 20)}{task.notes.length > 20 ? '...' : ''}</span>}
              {subtasks.length > 0 && !expanded && (
                <span className="text-[10px] text-gray-300">{subtasks.filter(s => s.completed).length}/{subtasks.length}</span>
              )}
            </div>
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                {tags.map(tag => (
                  <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: tag.color + '18', color: tag.color }}>
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {step < 1 && (
            <button onClick={(e) => { e.stopPropagation(); updateTask(task.id!, { isFlagged: !task.isFlagged }); }}
              className={`flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors ${task.isFlagged ? 'text-orange-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`}>
              <Flag size={14} fill={task.isFlagged ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* ── Expanded subtasks ── */}
        {expanded && (
          <div className="bg-gray-50 border-b border-gray-100 pl-10 pr-3 py-2 animate-slide-down">
            {subtasks.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">暂无子任务，点击任务进入详情添加</p>
            ) : (
              <div className="space-y-1.5">
                {subtasks.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs">
                    <button onClick={(e) => handleSubCheck(s, e)}
                      className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        s.completed ? 'bg-blue-500 border-blue-500' :
                        pendingSubs.has(s.id!) ? 'bg-gray-300 border-gray-300' :
                        'border-gray-300 hover:border-gray-400'
                      }`}>
                      {(s.completed || pendingSubs.has(s.id!)) && <Check size={9} className="text-white" />}
                    </button>
                    <span className={`flex-1 transition-colors duration-300 ${
                      s.completed ? 'line-through text-gray-400' :
                      pendingSubs.has(s.id!) ? 'line-through text-gray-400' :
                      'text-gray-600'
                    }`}>{s.title}</span>
                    {s.dueDate && (
                      <span className={`text-[10px] px-1 py-0.5 rounded ${new Date(s.dueDate) < new Date(new Date().toISOString().slice(0,10)) ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100'}`}>
                        <Clock size={10} className="inline mr-0.5" />
                        {s.dueDate}{s.dueTime ? ` ${s.dueTime}` : ''}
                      </span>
                    )}
                    {s.notes && <span className="text-[10px] text-gray-400 italic truncate max-w-[120px]">{s.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 确认弹窗 ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fade-in" onClick={handleCancel}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">确认完成任务</h3>
              <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div><p className="text-xs text-gray-400 mb-1">任务标题</p><p className="text-sm font-semibold text-gray-800">{task.title}</p></div>
              {task.notes && <div><p className="text-xs text-gray-400 mb-1">简介</p><p className="text-sm text-gray-600">{task.notes}</p></div>}
              {task.dueDate && <div><p className="text-xs text-gray-400 mb-1">截止日期</p><DueDateBadge dueDate={task.dueDate} dueTime={task.dueTime} /></div>}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex gap-2.5">
              <button onClick={handleCancel} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200">取消</button>
              <button onClick={doComplete} className="flex-1 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600">确认完成</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
