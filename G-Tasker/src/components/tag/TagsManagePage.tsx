import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTagStore } from '../../stores/tag-store';
import { TagBadge } from '../ui/TagBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { TAG_COLORS } from '../../lib/constants';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

const DEFAULT_CATEGORIES: Record<string, { label: string; examples: string }> = {
  '#ef4444': { label: '紧急',  examples: '#urgent #deadline' },
  '#f59e0b': { label: '时间',  examples: '#today #thisweek' },
  '#10b981': { label: '地点',  examples: '#home #office #school' },
  '#3b82f6': { label: '状态',  examples: '#todo #doing #done' },
  '#8b5cf6': { label: '项目',  examples: '#design #coding' },
  '#ec4899': { label: '个人',  examples: '#health #hobby' },
  '#06b6d4': { label: '学习',  examples: '#reading #course' },
  '#84cc16': { label: '灵感',  examples: '#idea #brainstorm' },
};

function loadCategories() {
  try { const s = localStorage.getItem('tag-categories'); return s ? JSON.parse(s) : DEFAULT_CATEGORIES; }
  catch { return DEFAULT_CATEGORIES; }
}
function saveCategories(c: typeof DEFAULT_CATEGORIES) {
  try { localStorage.setItem('tag-categories', JSON.stringify(c)); } catch {}
}

export function TagsManagePage() {
  const navigate = useNavigate();
  const tags = useTagStore((s) => s.tags);
  const addTag = useTagStore((s) => s.addTag);
  const deleteTag = useTagStore((s) => s.deleteTag);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [categories, setCategories] = useState(loadCategories);
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editExamples, setEditExamples] = useState('');

  const startEdit = (color: string) => {
    setEditingColor(color);
    setEditLabel(categories[color]?.label || '');
    setEditExamples(categories[color]?.examples || '');
  };
  const saveEdit = () => {
    if (!editingColor) return;
    const updated = { ...categories, [editingColor]: { label: editLabel || '未定义', examples: editExamples } };
    setCategories(updated);
    saveCategories(updated);
    setEditingColor(null);
  };

  const handleCreate = async () => {
    if (newName.trim() && selectedColor) {
      await addTag(newName.trim(), selectedColor);
      setNewName('');
    }
  };

  // Group tags by color
  const groupedTags = useMemo(() => {
    const map: Record<string, typeof tags> = {};
    for (const c of TAG_COLORS) map[c] = [];
    for (const t of tags) {
      if (map[t.color]) map[t.color].push(t);
      else map[t.color] = [t];
    }
    return map;
  }, [tags]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Color Legend ── */}
      <div className="mb-6">
        <h4 className="text-xs font-medium text-gray-400 mb-3">标签</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TAG_COLORS.map(color => {
            const cat = categories[color];
            const isEditing = editingColor === color;
            return (
              <div key={color} className={`p-2.5 rounded-xl border transition-colors ${isEditing ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="分类名称" className="w-full px-2 py-0.5 text-[11px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" autoFocus />
                    <input type="text" value={editExamples} onChange={(e) => setEditExamples(e.target.value)}
                      placeholder="示例标签" className="w-full px-2 py-0.5 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="p-0.5 text-green-500 hover:bg-green-50 rounded"><Check size={12} /></button>
                      <button onClick={() => setEditingColor(null)} className="p-0.5 text-gray-400 hover:bg-gray-100 rounded"><X size={12} /></button>
                    </div>
                  </div>
                ) : (
                  <div className="group relative cursor-pointer" onClick={() => startEdit(color)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-[11px] font-semibold text-gray-700">{cat?.label || '点击定义'}</span>
                    </div>
                    <p className="text-[9px] text-gray-400 leading-tight">{cat?.examples || ''}</p>
                    <Edit2 size={10} className="absolute top-0 right-0 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Create Tag ── */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-3">
        <h4 className="text-xs font-semibold text-gray-500">细分具体场景</h4>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-400 mb-1">场景名称</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="如: 工作、学习、生活..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">
              场景颜色
              <span className="ml-1 text-gray-300">{categories[selectedColor]?.label || ''}</span>
            </label>
            <div className="flex gap-1.5">
              {TAG_COLORS.map((color) => (
                <button key={color} onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full transition-transform ${selectedColor === color ? 'ring-2 ring-offset-1 ring-blue-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={!newName.trim()}
            className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* ── Tags by Color Group ── */}
      {tags.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">暂无标签，创建一个吧</p>
      ) : (
        <div className="space-y-4">
          {TAG_COLORS.map(color => {
            const group = groupedTags[color] || [];
            if (group.length === 0) return null;
            const cat = categories[color];
            return (
              <div key={color}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-gray-500">{cat?.label || '其他'}</span>
                  <span className="text-[10px] text-gray-300">{group.length} 个标签</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.map(tag => (
                    <div key={tag.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group">
                      <button onClick={() => navigate(`/app/tag/${encodeURIComponent(tag.name)}`)}
                        className="hover:opacity-80 transition-opacity cursor-pointer">
                        <TagBadge name={tag.name} color={tag.color} />
                      </button>
                      <button onClick={() => setDeleteTarget(tag.id!)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget !== null && (
        <ConfirmDialog
          title="删除标签"
          message="删除标签将从所有任务中移除该标签。确定继续？"
          onConfirm={() => { deleteTag(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
