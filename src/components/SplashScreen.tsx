import React, { useState, useEffect, useRef } from 'react';
import { PesOSLogo } from './PesOSLogo';

interface SplashScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

const SESSION_BOOT_KEY = 'pesos_has_booted';

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 800,
}) => {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_BOOT_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Loading catalog...');
  const dismissedRef = useRef(false);

  const dismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setProgress(100);
    setStatusText('Ready');
    setIsFadingOut(true);

    try {
      sessionStorage.setItem(SESSION_BOOT_KEY, 'true');
    } catch {
      // Ignore sessionStorage issues
    }

    setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 300);
  };

  useEffect(() => {
    if (!isVisible) return;

    // Phase 1: 0ms -> 300ms: Catalog loading
    const timer1 = setTimeout(() => {
      if (!dismissedRef.current) {
        setProgress(45);
        setStatusText('Checking offline sync...');
      }
    }, 300);

    // Phase 2: 300ms -> 650ms: Sync & Ready check
    const timer2 = setTimeout(() => {
      if (!dismissedRef.current) {
        setProgress(85);
        setStatusText('Initializing counter...');
      }
    }, 600);

    // Phase 3: Finalize at minDurationMs (or max 1000ms)
    const timer3 = setTimeout(() => {
      if (!dismissedRef.current) {
        setProgress(100);
        setStatusText('Ready');
        setTimeout(() => dismiss(), 150);
      }
    }, Math.min(minDurationMs, 1000));

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isVisible, minDurationMs]);

  if (!isVisible) return null;

  return (
    <div
      onClick={dismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') dismiss();
      }}
      aria-label="Click anywhere to skip startup splash screen"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between bg-slate-950 text-white select-none cursor-pointer transition-all duration-300 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-98 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Top Spacer / Ambient Glow */}
      <div className="w-full h-16 pointer-events-none relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Center Section: Animated pesOS Logo, Slim Loading Track, Status Text */}
      <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* pesOS Brand Logo with subtle glow */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-110 pointer-events-none" />
          <PesOSLogo
            className="relative z-10"
            imageHeightClass="h-14 sm:h-16 md:h-20"
            showTagline={false}
          />
        </div>

        {/* Sleek 2px Slim Loading Track */}
        <div className="w-48 sm:w-56 h-[2px] bg-slate-800 rounded-full overflow-hidden mt-7 relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-[#006AFF] rounded-full shadow-[0_0_8px_rgba(0,106,255,0.8)] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Status Micro-Text */}
        <div className="mt-3.5 h-5 flex items-center justify-center">
          <p className="text-[11px] font-mono tracking-wide text-slate-400 animate-pulse">
            {statusText}
          </p>
        </div>
      </div>

      {/* Footer Section: Terminal Version & Tap to Skip Hint */}
      <div className="pb-8 px-4 flex flex-col items-center text-center space-y-1">
        <div className="text-[11px] text-slate-500 font-mono tracking-wider">
          pesOS v1.0 • Ready for Counter
        </div>
        <div className="text-[10px] text-slate-600 font-mono">
          Tap anywhere to skip
        </div>
      </div>
    </div>
  );
};
