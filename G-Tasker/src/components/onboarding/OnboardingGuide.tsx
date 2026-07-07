import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Sparkles, ListTodo, CalendarRange, Lightbulb, Rocket } from 'lucide-react';

interface Slide {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  action?: { label: string; path: string };
  bg: string;
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: '欢迎来到 G-Tasker',
    subtitle: '不只是任务管理，更是你的时间规划伙伴',
    description: '把想法变成清晰的行动，把行动变成完成的成就。',
    highlights: ['任务管理', '时间规划', '目标追踪', '灵感收集'],
    bg: 'from-blue-500 to-indigo-600',
  },
  {
    icon: ListTodo,
    title: '任务管理系统',
    subtitle: '把所有重要事情放在一个地方',
    description: '无论是学习计划、项目目标还是日常待办，都可以在这里管理。',
    highlights: ['创建任务 · 设置优先级 · 添加截止日期', '子任务拆解 · 标签分类 · 两步确认完成', '智能筛选：今天 / 已计划 / 逾期 / 全部'],
    action: { label: '去看看任务', path: '/app/today' },
    bg: 'from-violet-500 to-purple-600',
  },
  {
    icon: CalendarRange,
    title: '智能列表 & 分类管理',
    subtitle: '用你自己的方式组织一切',
    description: '通过列表、标签和筛选器，快速找到当前最重要的事。',
    highlights: ['自定义列表：工作 / 学习 / 个人', '多标签分类：紧急、重要、项目类', '侧边栏实时显示各分类任务数量'],
    action: { label: '管理标签', path: '/app/tags' },
    bg: 'from-emerald-500 to-teal-600',
  },
  {
    icon: CalendarRange,
    title: '时间规划系统',
    subtitle: '日 · 周 · 月 · 自定义 — 自由组合',
    description: '不仅要完成，更要安排好。四种规划模式覆盖所有时间维度。',
    highlights: ['日规划：创建一天的时间模板', '周规划：七天节奏 · 每日本均可独立编排', '月规划：28-31天长期安排', '自定义规划：3天 / 10天 / 任意周期'],
    action: { label: '创建规划', path: '/app/planning' },
    bg: 'from-amber-500 to-orange-600',
  },
  {
    icon: Lightbulb,
    title: '日历 · 备忘录 · 灵感箱',
    subtitle: '更多工具，应对各种场景',
    description: '日立日历支持农历和多国节日。灵感箱作为信息入口，记录无需分类。',
    highlights: ['日历：阳历/农历切换 · 节日标记 · 任务截止显示', '备忘录：轻量记录 · 置顶 · 卡片式浏览', '灵感箱：3秒快速记录 · 一键转为任务或备忘录'],
    action: { label: '打开日历', path: '/app/calendar' },
    bg: 'from-rose-500 to-pink-600',
  },
  {
    icon: Rocket,
    title: '你的第一个计划，从现在开始',
    subtitle: '',
    description: 'G-Tasker 已准备好。去创建你的第一个任务或规划吧。',
    highlights: [],
    action: { label: '创建第一个任务', path: '/app/all' },
    bg: 'from-blue-600 to-cyan-500',
  },
];

const STORAGE_KEY = 'gtasker-onboarding-done';

export function isOnboardingDone(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
}
export function resetOnboarding(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function OnboardingGuide({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const goto = (path: string) => { window.location.href = path; };

  useEffect(() => { setStep(0); }, [open]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onClose();
  };

  if (!open) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg mx-4 animate-modal-in">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-white' : 'bg-white/40 hover:bg-white/60'
              }`} />
          ))}
        </div>

        {/* Slide card */}
        <div className={`bg-gradient-to-br ${slide.bg} rounded-3xl shadow-2xl overflow-hidden`}>
          {/* Close */}
          <button onClick={finish} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors">
            <X size={16} />
          </button>

          <div className="p-8 pt-12 pb-8">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-5">
              <Icon size={28} className="text-white" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{slide.title}</h2>
            {slide.subtitle ? (
              <p className="text-white/80 text-sm mb-4 leading-relaxed">{slide.subtitle}</p>
            ) : null}
            <p className="text-white/70 text-sm mb-5">{slide.description}</p>

            {/* Highlights */}
            {slide.highlights.length > 0 && (
              <div className="space-y-2 mb-6">
                {slide.highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check size={14} className="text-white/60 mt-0.5 flex-shrink-0" />
                    <span className="text-white/85 text-[13px] leading-relaxed">{h}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action button */}
            {slide.action && (
              <button onClick={() => { finish(); goto(slide.action!.path); }}
                className="w-full py-3 bg-white text-gray-800 rounded-xl font-semibold text-sm hover:bg-white/95 transition-colors shadow-lg mb-3">
                {slide.action.label}
              </button>
            )}

            {isLast && (
              <button onClick={finish}
                className="w-full py-3 bg-white/15 text-white rounded-xl font-semibold text-sm hover:bg-white/25 transition-colors">
                开始使用
              </button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-5">
              <button onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="flex items-center gap-1 text-white/50 text-xs disabled:opacity-20 hover:text-white/80 transition-colors">
                <ChevronLeft size={14} /> 上一步
              </button>
              <button onClick={finish}
                className="text-white/40 text-xs hover:text-white/70 transition-colors">
                跳过
              </button>
              {!isLast ? (
                <button onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1 text-white/80 text-xs hover:text-white transition-colors">
                  下一步 <ChevronRight size={14} />
                </button>
              ) : (
                <div className="w-16" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
