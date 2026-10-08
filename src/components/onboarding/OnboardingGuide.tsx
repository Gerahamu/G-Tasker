import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check, Sparkles, ListTodo, CalendarRange, Rocket } from 'lucide-react';
import { useT } from '../../lib/i18n';
import type { Translate } from '../../lib/i18n';

interface Slide {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  action?: { label: string; path: string };
  bg: string;
}

function buildSlides(t: Translate): Slide[] { return [
  {
    icon: Sparkles,
    title: t('ob1Title'), subtitle: t('ob1Subtitle'), description: t('ob1Desc'), highlights: t('ob1Highlights').split('|'),
    bg: 'from-blue-500 to-indigo-600',
  },
  {
    icon: ListTodo,
    title: t('ob2Title'), subtitle: t('ob2Subtitle'), description: t('ob2Desc'), highlights: t('ob2Highlights').split('|'),
    action: { label: t('ob2Action'), path: '/app/today' },
    bg: 'from-violet-500 to-purple-600',
  },
  {
    icon: CalendarRange,
    title: t('ob4Title'), subtitle: t('ob4Subtitle'), description: t('ob4Desc'), highlights: t('ob4Highlights').split('|'),
    action: { label: t('ob4Action'), path: '/app/planning' },
    bg: 'from-amber-500 to-orange-600',
  },
  {
    icon: Rocket,
    title: t('ob6Title'), subtitle: t('ob6Subtitle'), description: t('ob6Desc'), highlights: t('ob6Highlights').split('|').filter(Boolean),
    action: { label: t('ob6Action'), path: '/app/all' },
    bg: 'from-blue-600 to-cyan-500',
  },
]; }

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
  const { t } = useT();
  const slides = buildSlides(t);
  const [step, setStep] = useState(0);
  const goto = (path: string) => { window.location.href = path; };

  useEffect(() => { setStep(0); }, [open]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onClose();
  };

  if (!open) return null;

  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg mx-4 animate-modal-in" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setStep(i)}
              aria-label={t('dayN', { n: i + 1 })} aria-pressed={i === step}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-white' : 'bg-white/40 hover:bg-white/60'
              }`} />
          ))}
        </div>

        {/* Slide card */}
        <div className={`bg-gradient-to-br ${slide.bg} rounded-3xl shadow-2xl overflow-hidden`}>
          {/* Close */}
          <button onClick={finish} aria-label={t('closeDialog')} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors">
            <X size={16} />
          </button>

          <div className="p-8 pt-12 pb-8">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-5">
              <Icon size={28} className="text-white" />
            </div>

            {/* Title */}
            <h2 id="onboarding-title" className="text-2xl font-bold text-white mb-2 tracking-tight">{slide.title}</h2>
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
                    <span className="text-white/85 text-sm leading-relaxed">{h}</span>
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
                {t('onboardingStart')}
              </button>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-5">
              <button onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="flex items-center gap-1 text-white/50 text-xs disabled:opacity-20 hover:text-white/80 transition-colors">
                <ChevronLeft size={14} /> {t('onboardingPrevious')}
              </button>
              <button onClick={finish}
                className="text-white/40 text-xs hover:text-white/70 transition-colors">
                {t('onboardingSkip')}
              </button>
              {!isLast ? (
                <button onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1 text-white/80 text-xs hover:text-white transition-colors">
                  {t('onboardingNext')} <ChevronRight size={14} />
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
