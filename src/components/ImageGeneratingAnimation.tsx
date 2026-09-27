import React, { useRef, useEffect, useState } from 'react';
import { ForgeXTheme } from '../types';

interface ImageGeneratingAnimationProps {
  progress: number;
  theme: ForgeXTheme;
}

const DOT_PALETTE = [
  '#f43f5e', // rose
  '#ec4899', // pink
  '#d946ef', // fuchsia
  '#c026d3', // purple
  '#a855f7', // violet
  '#8b5cf6', // purple-violet
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#0ea5e9', // sky
  '#06b6d4', // cyan
];

export const ImageGeneratingAnimation: React.FC<ImageGeneratingAnimationProps> = ({
  progress,
  theme,
}) => {
  const isDark = theme === 'dark';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayProgress, setDisplayProgress] = useState(() => Math.max(1, Math.min(100, Math.round(progress))));

  // Smoothly interpolate the display percentage
  useEffect(() => {
    const target = Math.max(1, Math.min(100, Math.round(progress)));
    let animationFrameId: number;

    const step = () => {
      setDisplayProgress((prev) => {
        if (prev === target) return prev;
        const diff = target - prev;
        if (Math.abs(diff) <= 1) return target;
        return prev + (diff > 0 ? 1 : -1);
      });
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [progress]);

  // Ultra-smooth 60fps GPU-accelerated Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let startTime = performance.now();

    // Resize handler for high DPI screens
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.scale(dpr, dpr);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas);

    const cols = 26;
    const rows = 13;

    const render = (now: number) => {
      const elapsed = (now - startTime) * 0.001;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const spacingX = w / (cols + 1);
      const spacingY = h / (rows + 1);
      const baseRadius = Math.max(2, Math.min(3.2, Math.min(spacingX, spacingY) * 0.22));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 1) * spacingX;
          const y = (r + 1) * spacingY;

          // Diagonal traveling wave
          const wavePhase = (c * 0.28 + r * 0.35) - elapsed * 3.2;
          const waveIntensity = (Math.sin(wavePhase) + 1) * 0.5; // 0 to 1

          const colorIdx = (c + r * 2) % DOT_PALETTE.length;
          const colorHex = DOT_PALETTE[colorIdx];

          const radius = baseRadius * (0.8 + waveIntensity * 0.65);
          const alpha = isDark
            ? 0.22 + waveIntensity * 0.78
            : 0.25 + waveIntensity * 0.75;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = colorHex;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [isDark]);

  return (
    <div className="flex flex-col gap-2 max-w-xl w-full select-none animate-in fade-in duration-200">
      {/* Aspect-ratio rectangular card with zero text */}
      <div
        className={`relative w-full aspect-16/10 rounded-2xl sm:rounded-3xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-neutral-950/80 border-neutral-800/90 shadow-xl shadow-black/40'
            : 'bg-neutral-50/90 border-neutral-200 shadow-md'
        }`}
      >
        {/* Hardware-accelerated 60fps Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block pointer-events-none"
        />

        {/* Ambient soft glow center */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity ${
            isDark
              ? 'bg-radial from-amber-500/5 via-transparent to-transparent'
              : 'bg-radial from-amber-500/10 via-transparent to-transparent'
          }`}
        />

        {/* Progress pill showing completion percentage (zero text words) */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all ${
              isDark
                ? 'bg-neutral-900/90 border-neutral-700/80 text-white'
                : 'bg-white/95 border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Circular mini progress track */}
            <svg className="w-3.5 h-3.5 -rotate-90 shrink-0" viewBox="0 0 36 36">
              <path
                className={isDark ? 'text-neutral-700' : 'text-neutral-200'}
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-amber-500 transition-all duration-150 ease-out"
                strokeDasharray={`${displayProgress}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="text-xs font-mono font-bold tracking-tight">
              {displayProgress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
