import { useState } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { resetOnboarding } from '../onboarding/OnboardingGuide';
import { db } from '../../db/database';
import { LANGUAGE_LABELS, useT, useCalendarCountry, getCountryName, type AppLanguage } from '../../lib/i18n';
import { COUNTRY_NAMES } from '../../lib/holiday-data';
import type { CountryCode } from '../../lib/types';
import { Sun, Moon, Monitor, Bell, PlusCircle, Trash2, Download, RotateCcw, Info, MessageSquare, ChevronRight, HelpCircle, Globe, Sparkles } from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'normal' | 'large';
function load<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } }
function save(key: string, val: any) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

export function SettingsPage() {
  const { t, rawLang, setLang, lang } = useT();
  const { calendarCountry, setCalendarCountry } = useCalendarCountry();
  const addToast = useUIStore((s) => s.addToast);

  const [theme, setTheme] = useState<ThemeMode>(load('theme-mode', 'system'));
  const [fontSize, setFontSize] = useState<FontSize>(load('font-size', 'normal'));
  const [draftLang, setDraftLang] = useState<AppLanguage>(rawLang);
  const [draftCountry, setDraftCountry] = useState<CountryCode>(calendarCountry);
  const [notifyEnabled, setNotifyEnabled] = useState(load('notify-enabled', true));
  const [defaultReminder, setDefaultReminder] = useState(load('notify-reminder', 15));
  const [overdueReminder, setOverdueReminder] = useState(load('notify-overdue', true));
  const [notifySound, setNotifySound] = useState(load('notify-sound', true));
  const [defaultPriority, setDefaultPriority] = useState<'high'|'medium'|'low'>(load('task-default-priority', 'medium'));
  const [defaultDueDate, setDefaultDueDate] = useState(load('task-default-due', false));
  const [sections, setSections] = useState<Record<string,boolean>>({appearance:true,lang:true,notify:true,task:true,data:false,about:false});
  const [showHelp, setShowHelp] = useState<Record<string,boolean>>({});
  const toggle = (s:string) => setSections(p=>({...p,[s]:!p[s]}));
  const toggleHelp = (k:string) => setShowHelp(p=>({...p,[k]:!p[k]}));

  const applyTheme = (m:ThemeMode) => { setTheme(m); save('theme-mode',m); if(m==='dark') document.documentElement.classList.add('dark'); else if(m==='light') document.documentElement.classList.remove('dark'); else document.documentElement.classList.toggle('dark',window.matchMedia('(prefers-color-scheme:dark)').matches); addToast(t('themeUpdated'),'success'); };
  const applyFont = (s:FontSize) => { setFontSize(s); save('font-size',s); document.documentElement.classList.remove('font-scale-small','font-scale-normal','font-scale-large'); document.documentElement.classList.add(`font-scale-${s}`); addToast(t('fontUpdated'),'success'); };
  const handleSaveLang = () => { setLang(draftLang); setCalendarCountry(draftCountry); addToast(t('langUpdated'),'success'); };
  const langModified = draftLang!==rawLang||draftCountry!==calendarCountry;
  const saveAndToast = (k:string,v:any,m:string) => { save(k,v); addToast(m,'success'); };

  const handleClearAll = async () => {
    if(!confirm(t('confirmClearAll'))) return;
    await db.tasks.clear(); await db.taskLists.clear(); await db.tags.clear(); await db.taskTags.clear(); await db.calendarMarkers.clear(); await db.subtasks.clear();
    addToast(t('dataCleared'),'success'); setTimeout(()=>window.location.reload(),500);
  };
  const handleExport = async () => {
    const data = {tasks:await db.tasks.toArray(),lists:await db.taskLists.toArray(),tags:await db.tags.toArray(),markers:await db.calendarMarkers.toArray(),exportedAt:new Date().toISOString()};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`g-tasker-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
    addToast(t('dataExported'),'success');
  };
  const handleReset = () => {
    if(!confirm(t('confirmReset'))) return;
    applyTheme('system'); applyFont('normal');
    save('notify-enabled',true); setNotifyEnabled(true); save('notify-reminder',15); setDefaultReminder(15);
    save('notify-overdue',true); setOverdueReminder(true); save('notify-sound',true); setNotifySound(true);
    save('task-default-priority','medium'); setDefaultPriority('medium'); save('task-default-due',false); setDefaultDueDate(false);
    try { localStorage.removeItem('tag-categories'); } catch {}
    addToast(t('settingsReset'),'success');
    setTimeout(() => window.location.reload(), 500);
  };

  const L = {
    settings: t('settingsTitle'), themeMode: t('themeMode'), light: t('light'), dark: t('dark'), followSystem: t('followSystem'),
    fontSize: t('fontSize'), fontSmall: t('fontSmall'), fontNormal: t('fontNormal'), fontLarge: t('fontLarge'),
    langTitle: t('langTitle'), uiLang: t('uiLang'), calCountry: t('calCountry'), save: t('save'),
    notifyTitle: t('notifyTitle'), notifySwitch: t('notifySwitch'), notifyReminder: t('notifyReminder'),
    notifyOverdue: t('notifyOverdue'), notifySound: t('notifySound'),
    taskDefaults: t('taskDefaults'), defaultPriority: t('defaultPriority'), defaultDue: t('defaultDue'),
    dataMgmt: t('dataMgmt'), exportData: t('exportData'), resetSettings: t('resetSettings'), clearAll: t('clearAll'),
    about: t('about'), version: t('version'), developer: t('developer'), techStack: t('techStack'),
    sendFeedback: t('sendFeedback'), aboutDesc: t('aboutDesc'), appearance: t('appearance'),
  };

  const SectionHeader = ({id,icon:Icon,title}:{id:string;icon:any;title:string})=>(
    <button onClick={()=>toggle(id)} className="w-full flex items-center justify-between py-3 cursor-pointer">
      <div className="flex items-center gap-2.5"><Icon size={17} className="text-gray-500"/><span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</span></div>
      <ChevronRight size={16} className={`text-gray-400 transition-transform duration-200 ${sections[id]?'rotate-90':''}`}/>
    </button>
  );
  const Toggle = ({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void})=>(
    <button onClick={()=>onChange(!checked)} className={`w-9 h-5 rounded-full transition-colors relative ${checked?'bg-blue-500':'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked?'left-4':'left-0.5'}`}/>
    </button>
  );
  const HelpBtn = ({id}:{id:string})=>(
    <button onClick={(e)=>{e.stopPropagation();toggleHelp(id)}} className="text-gray-300 hover:text-blue-400"><HelpCircle size={13}/></button>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6">{L.settings}</h3>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <SectionHeader id="appearance" icon={Sun} title={`🎨 ${L.appearance}`}/>
        {sections.appearance&&<div className="pb-4 space-y-4 animate-slide-down">
          <div>
            <p className="text-xs text-gray-400 mb-2">{L.themeMode}</p>
            <div className="flex gap-2">
              {([['light',Sun,L.light],['dark',Moon,L.dark],['system',Monitor,L.followSystem]]as const).map(([v,Ic,lb])=>(
                <button key={v} onClick={()=>applyTheme(v)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-colors ${theme===v?'bg-blue-50 border-blue-300 text-blue-700':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}><Ic size={14}/> {lb}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">{L.fontSize}</p>
            <div className="flex gap-2">
              {(['small','normal','large']as const).map(s=>(
                <button key={s} onClick={()=>applyFont(s)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${fontSize===s?'bg-blue-50 border-blue-300 text-blue-700':'border-gray-200 text-gray-500'}`}>
                  {s==='small'?L.fontSmall:s==='normal'?L.fontNormal:L.fontLarge}
                </button>
              ))}
            </div>
          </div>
        </div>}
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <SectionHeader id="lang" icon={Globe} title={`🌐 ${L.langTitle}`}/>
          {langModified&&<button onClick={handleSaveLang} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 flex-shrink-0 ml-2">{L.save}</button>}
        </div>
        {sections.lang&&<div className="pb-4 space-y-4 animate-slide-down">
          <div>
            <p className="text-xs text-gray-400 mb-2">{L.uiLang}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.entries(LANGUAGE_LABELS)as[AppLanguage,string][]).map(([code,name])=>(
                <button key={code} onClick={()=>setDraftLang(code)} className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${draftLang===code?'bg-blue-50 border-blue-300 text-blue-700':'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  {code==='auto'?`🔄 ${LANGUAGE_LABELS[rawLang]}`:name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">{L.calCountry}</p>
            <select value={draftCountry} onChange={e=>setDraftCountry(e.target.value as CountryCode)} className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
              {(Object.keys(COUNTRY_NAMES)as CountryCode[]).map(code=><option key={code} value={code}>{getCountryName(code,lang)}</option>)}
            </select>
          </div>
        </div>}
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <SectionHeader id="notify" icon={Bell} title={`🔔 ${L.notifyTitle}`}/>
        {sections.notify&&<div className="pb-4 space-y-4 animate-slide-down">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5"><span className="text-sm text-gray-600 dark:text-gray-400">{L.notifySwitch}</span><HelpBtn id="n0"/></div>
            <Toggle checked={notifyEnabled} onChange={v=>{setNotifyEnabled(v);saveAndToast('notify-enabled',v,v?t('notifyOn'):t('notifyOff'));}}/>
          </div>
          {showHelp.n0&&<p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">{t('helpNotifySwitch')}</p>}
          <div>
            <div className="flex items-center gap-1.5 mb-2"><span className="text-sm text-gray-600 dark:text-gray-400">{L.notifyReminder}</span><HelpBtn id="n1"/></div>
            {showHelp.n1&&<p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mb-2">{t('helpNotifyReminder')}</p>}
            <div className="flex gap-2">
              {[5,15,60].map(m=><button key={m} onClick={()=>{setDefaultReminder(m);saveAndToast('notify-reminder',m,`${L.notifyReminder}: ${m}${t('minAgo')}`);}} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${defaultReminder===m?'bg-blue-50 border-blue-300 text-blue-700':'border-gray-200 text-gray-500'}`}>{m<60?`${m}${t('minAgo')}`:`1${t('hrAgo')}`}</button>)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5"><span className="text-sm text-gray-600 dark:text-gray-400">{L.notifyOverdue}</span><HelpBtn id="n2"/></div>
            <Toggle checked={overdueReminder} onChange={v=>{setOverdueReminder(v);save('notify-overdue',v);}}/>
          </div>
          {showHelp.n2&&<p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">{t('helpNotifyOverdue')}</p>}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5"><span className="text-sm text-gray-600 dark:text-gray-400">{L.notifySound}</span><HelpBtn id="n3"/></div>
            <Toggle checked={notifySound} onChange={v=>{setNotifySound(v);save('notify-sound',v);}}/>
          </div>
          {showHelp.n3&&<p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">{t('helpNotifySound')}</p>}
        </div>}
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <SectionHeader id="task" icon={PlusCircle} title={`➕ ${L.taskDefaults}`}/>
        {sections.task&&<div className="pb-4 space-y-4 animate-slide-down">
          <div>
            <div className="flex items-center gap-1.5 mb-2"><span className="text-sm text-gray-600 dark:text-gray-400">{L.defaultPriority}</span><HelpBtn id="t0"/></div>
            {showHelp.t0&&<p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mb-2">{t('helpDefaultPriority')}</p>}
            <div className="flex gap-2">
              {[{v:'high'as const,l:`🔴 ${t('high')}`},{v:'medium'as const,l:`🟡 ${t('medium')}`},{v:'low'as const,l:`⚪ ${t('low')}`}].map(({v,l})=>(
                <button key={v} onClick={()=>{setDefaultPriority(v);saveAndToast('task-default-priority',v,`${L.defaultPriority}: ${l}`);}} className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${defaultPriority===v?'bg-blue-50 border-blue-300 text-blue-700':'border-gray-200 text-gray-500'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5"><span className="text-sm text-gray-600 dark:text-gray-400">{L.defaultDue}</span><HelpBtn id="t1"/></div>
            <Toggle checked={defaultDueDate} onChange={v=>{setDefaultDueDate(v);save('task-default-due',v);}}/>
          </div>
          {showHelp.t1&&<p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2">{t('helpDefaultDue')}</p>}
          <div>
            {showHelp.t2&&<p className="text-xs text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded-lg p-2 mb-2">{t('helpDefaultView')}</p>}
            <div className="flex gap-2">
            </div>
          </div>
        </div>}
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <SectionHeader id="data" icon={Trash2} title={`🧹 ${L.dataMgmt}`}/>
        {sections.data&&<div className="pb-4 space-y-3 animate-slide-down">
          <button onClick={handleExport} className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors"><Download size={16}/> {L.exportData}</button>
          <button onClick={handleReset} className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors"><RotateCcw size={16}/> {L.resetSettings}</button>
          <button onClick={handleClearAll} className="w-full flex items-center gap-3 px-3 py-2.5 bg-red-50 rounded-xl text-sm text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={16}/> {L.clearAll}</button>
        </div>}
      </div>

      <div className="border-b border-gray-100 dark:border-gray-700">
        <SectionHeader id="about" icon={Info} title={`📱 ${L.about}`}/>
        {sections.about&&<div className="pb-6 space-y-3 animate-slide-down text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between py-1"><span className="text-gray-400">{L.version}</span><span className="font-medium">v0.1</span></div>
          <div className="flex justify-between py-1"><span className="text-gray-400">{L.developer}</span><span>Gerahamu</span></div>
          <div className="flex justify-between py-1"><span className="text-gray-400">{L.techStack}</span><span>React + TypeScript + Dexie</span></div>
          <button onClick={()=>{resetOnboarding();window.location.reload();}} className="flex items-center gap-2 text-blue-500 hover:text-blue-700 text-sm"><Sparkles size={14}/> 重新查看使用引导</button>
          <a href="#" onClick={e=>{e.preventDefault();addToast('算了，待会再说','info');}} className="flex items-center gap-2 text-blue-500 hover:text-blue-700"><MessageSquare size={14}/> {L.sendFeedback}</a>
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"><p className="text-xs text-gray-400">{L.aboutDesc}</p></div>
        </div>}
      </div>

      <div className="h-12"/>
    </div>
  );
}
