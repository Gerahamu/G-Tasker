import { useEffect, useState } from 'react';

type StartupPhase = 'intro' | 'fadeOut';

interface StartupAnimationProps {
  appReady: boolean;
  onReveal: () => void;
  onComplete: () => void;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return reducedMotion;
}

export function StartupAnimation({ appReady, onReveal, onComplete }: StartupAnimationProps) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<StartupPhase>('intro');
  const [minimumHoldComplete, setMinimumHoldComplete] = useState(false);

  useEffect(() => {
    const holdTimer = window.setTimeout(
      () => setMinimumHoldComplete(true),
      reducedMotion ? 220 : 1800,
    );

    return () => window.clearTimeout(holdTimer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!appReady || !minimumHoldComplete) return;

    const frameId = window.requestAnimationFrame(() => {
      setPhase('fadeOut');
      onReveal();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [appReady, minimumHoldComplete, onReveal]);

  useEffect(() => {
    if (phase !== 'fadeOut') return;

    const completeTimer = window.setTimeout(onComplete, reducedMotion ? 240 : 360);
    return () => window.clearTimeout(completeTimer);
  }, [onComplete, phase, reducedMotion]);

  return (
    <div
      className={`startup-overlay startup-overlay--${phase}${reducedMotion ? ' startup-overlay--reduced' : ''}`}
      data-ui="startup-overlay"
      aria-hidden="true"
    >
      <div className="startup-wordmark">G-Tasker</div>
    </div>
  );
}
