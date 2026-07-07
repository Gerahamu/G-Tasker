import { useState, useEffect } from 'react';
import { usePlanStore } from '../../stores/plan-store';
import { useUIStore } from '../../stores/ui-store';
import { useT } from '../../lib/i18n';
import { Plus, Trash2, Copy, ChevronLeft } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month' | 'custom';
const WEEKDAYS = ['周一','周二','周三','周四','周五','周六','周日'];

export function PlanPage() {
  const store = usePlanStore();
  const { t } = useT();
  const addToast = useUIStore((s) => s.addToast);
  const [view, setView] = useState<ViewMode>('day');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planGoal, setPlanGoal] = useState('');
  const [planNote, setPlanNote] = useState('');
  const [customDays, setCustomDays] = useState(7);
  const [monthDays, setMonthDays] = useState(30);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const viewLabel = (v:string) => v==='day'?t('dayView'):v==='week'?t('weekView'):v==='month'?t('monthView'):t('customView');

  useEffect(() => { store.load(); }, []);
  const selectedPlan = store.plans.find(p => p.id === selectedPlanId) || null;

  const getDaysCount = (): number => {
    if (view === 'day') return 1;
    if (view === 'week') return 7;
    if (view === 'month') return monthDays;
    return customDays;
  };

  const createPlan = async () => {
    if (!planName.trim()) return;
    await store.addPlan({ name: planName.trim(), type: view, goal: planGoal, note: planNote, daysCount: getDaysCount(), createdAt: new Date().toISOString() });
    setShowCreate(false); setPlanName(''); setPlanGoal(''); setPlanNote('');
    addToast(t('planCreated'), 'success');
  };

  const addBlock = async (dayIndex: number) => {
    if (!selectedPlanId) return;
    const max = store.blocks.filter(b => b.planId === selectedPlanId && b.dayIndex === dayIndex).reduce((m, b) => Math.max(m, b.sortOrder), 0);
    await store.addBlock({ planId: selectedPlanId, dayIndex, startTime: '09:00', endTime: '10:00', title: '', description: '', sortOrder: max + 1, createdAt: new Date().toISOString() });
  };

  const dayBlocks = (dayIndex: number) => store.blocks.filter(b => b.planId === selectedPlanId && b.dayIndex === dayIndex).sort((a, b) => a.sortOrder - b.sortOrder);
  const filteredPlans = store.plans.filter(p => p.type === view);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(['day','week','month','custom'] as const).map(v => (
              <button key={v} onClick={() => { setView(v); setSelectedPlanId(null); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view===v?'bg-white shadow text-gray-800':'text-gray-500'}`}>
                {viewLabel(v)}
              </button>
            ))}
          </div>
        </div>
        {!showCreate && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"><Plus size={14} /> {t('newPlan')}</button>
        )}
      </div>

      {showCreate && (
        <div className="mb-6 p-5 bg-gray-50 rounded-2xl space-y-3 animate-slide-down">
          <h4 className="text-sm font-semibold text-gray-700">{t('newPlan')}</h4>
          <input type="text" value={planName} onChange={e=>setPlanName(e.target.value)} placeholder={t('planName')} className="w-full px-3 py-2 text-sm border rounded-lg" autoFocus />
          <input type="text" value={planGoal} onChange={e=>setPlanGoal(e.target.value)} placeholder={t('planGoal')} className="w-full px-3 py-2 text-sm border rounded-lg" />
          <textarea value={planNote} onChange={e=>setPlanNote(e.target.value)} placeholder={t('planNote')} rows={2} className="w-full px-3 py-2 text-sm border rounded-lg resize-none" />
          {view === 'month' && (
            <div className="flex items-center gap-2"><span className="text-xs text-gray-500">{'天数'}:</span>
              {[28,29,30,31].map(d => <button key={d} onClick={()=>setMonthDays(d)} className={`px-3 py-1 rounded-lg text-xs ${monthDays===d?'bg-blue-500 text-white':'bg-white border text-gray-600'}`}>{d}{'天'}</button>)}
            </div>
          )}
          {view === 'custom' && (
            <div className="flex items-center gap-2"><span className="text-xs text-gray-500">{'天数'}:</span>
              <input type="number" value={customDays} onChange={e=>setCustomDays(Math.max(1,Math.min(100,Number(e.target.value))))} min={1} max={100} className="w-20 px-2 py-1 text-sm border rounded-lg" />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={createPlan} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">{t('create3')}</button>
            <button onClick={()=>setShowCreate(false)} className="px-4 py-2 text-sm text-gray-500">{t('cancel3')}</button>
          </div>
        </div>
      )}

      {!showCreate && !selectedPlan && (
        <div className="space-y-3">
          {filteredPlans.map(plan => (
            <div key={plan.id} onClick={()=>setSelectedPlanId(plan.id!)} className="card p-4 cursor-pointer hover:border-blue-300 transition-colors flex items-center justify-between group">
              <div><h4 className="text-sm font-semibold text-gray-800">{plan.name}</h4>
                <p className="text-xs text-gray-400">{plan.goal}{plan.note ? ` · ${plan.note.slice(0,30)}` : ''}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">{plan.daysCount}{'天'} · {store.blocks.filter(b=>b.planId===plan.id).length} {t('blocks')}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e=>{e.stopPropagation();store.duplicatePlan(plan.id!);addToast(t('copied'),'success');}} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-500"><Copy size={13}/></button>
                <button onClick={e=>{e.stopPropagation();setDeleteTarget(plan.id!);}} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
          {filteredPlans.length===0 && !showCreate && <div className="text-center py-16 text-gray-400">{t('noPlans')}</div>}
        </div>
      )}

      {selectedPlan && (
        <div>
          <button onClick={()=>setSelectedPlanId(null)} className="text-sm text-blue-500 mb-4 flex items-center gap-1"><ChevronLeft size={14}/> {t('backToList')}</button>
          <div className="flex items-center justify-between mb-4">
            <div><h4 className="text-base font-bold text-gray-800">{selectedPlan.name}</h4>
              <p className="text-xs text-gray-400">{selectedPlan.goal}{selectedPlan.note ? ` · ${selectedPlan.note}` : ''} · {selectedPlan.daysCount}{'天'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{store.duplicatePlan(selectedPlan.id!);addToast(t('copied'),'success');}} className="px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50"><Copy size={12} className="inline mr-1"/>{t('copy')}</button>
              <button onClick={()=>setDeleteTarget(selectedPlan.id!)} className="px-3 py-1.5 border border-red-200 rounded-lg text-xs text-red-500 hover:bg-red-50"><Trash2 size={12} className="inline mr-1"/>{t('delete3')}</button>
            </div>
          </div>
          {Array.from({length: selectedPlan.daysCount}, (_, dayIndex) => {
            const blocks = dayBlocks(dayIndex);
            const label = view==='week' ? WEEKDAYS[dayIndex] : view==='day' ? t('dayView') : `${'第'}${dayIndex+1}${'天'}`;
            return (
              <div key={dayIndex} className="mb-3 border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-semibold text-gray-700">{label}</h5>
                  <button onClick={()=>addBlock(dayIndex)} className="text-[10px] text-blue-500 hover:text-blue-700"><Plus size={12} className="inline mr-0.5"/>{t('addBlock')}</button>
                </div>
                <div className="space-y-1.5">
                  {blocks.map(b => (
                    <div key={b.id} className="flex items-center gap-2 text-xs group">
                      <input type="time" value={b.startTime} onChange={e=>store.updateBlock(b.id!,{startTime:e.target.value})} className="border rounded px-1 py-0.5 w-20" />
                      <span className="text-gray-300">-</span>
                      <input type="time" value={b.endTime} onChange={e=>store.updateBlock(b.id!,{endTime:e.target.value})} className="border rounded px-1 py-0.5 w-20" />
                      <input type="text" value={b.title} onChange={e=>store.updateBlock(b.id!,{title:e.target.value})} placeholder={t('planName')} className="flex-1 border rounded px-2 py-0.5 outline-none" />
                      <input type="text" value={b.description} onChange={e=>store.updateBlock(b.id!,{description:e.target.value})} placeholder={t('planNote')} className="w-24 border rounded px-2 py-0.5 outline-none" />
                      <button onClick={()=>store.deleteBlock(b.id!)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                  ))}
                  {blocks.length===0 && <p className="text-[10px] text-gray-300 italic">{t('noPlans')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-fade-in" onClick={()=>setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-modal-in" onClick={e=>e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">{t('delPlan')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('delPlanConfirm')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={()=>setDeleteTarget(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">{t('cancel3')}</button>
              <button onClick={()=>{store.deletePlan(deleteTarget);setDeleteTarget(null);setSelectedPlanId(null);addToast(t('deleted3'),'success');}} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">{t('delete3')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
