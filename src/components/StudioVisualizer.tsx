import React, { useEffect, useRef } from 'react';

interface StudioVisualizerProps {
  isPlaying?: boolean;
  tempoBpm?: number;
  theme?: 'dark' | 'light';
  isVocalActive?: boolean;
}

export const StudioVisualizer: React.FC<StudioVisualizerProps> = ({
  isPlaying = false,
  tempoBpm = 120,
  theme = 'dark',
  isVocalActive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    let phase = 0;
    const barCount = 48;
    const barHeights = new Array(barCount).fill(4);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Studio background mesh
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        50,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.7
      );

      if (theme === 'dark') {
        bgGrad.addColorStop(0, isPlaying ? 'rgba(245, 158, 11, 0.05)' : 'rgba(23, 23, 23, 0.4)');
        bgGrad.addColorStop(0.5, isPlaying ? 'rgba(14, 165, 233, 0.03)' : 'rgba(15, 15, 15, 0.6)');
        bgGrad.addColorStop(1, 'rgba(10, 10, 10, 0.85)');
      } else {
        bgGrad.addColorStop(0, 'rgba(245, 158, 11, 0.03)');
        bgGrad.addColorStop(1, 'rgba(245, 245, 245, 0.5)');
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle audio wave spectrum at bottom
      const speed = (tempoBpm / 120) * (isPlaying ? 0.04 : 0.01);
      phase += speed;

      const barWidth = Math.max(3, (width - (barCount - 1) * 4) / barCount);
      const baseY = height - 12;

      for (let i = 0; i < barCount; i++) {
        const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
        const factor = 1 - centerDist * 0.6;
        const targetHeight = isPlaying
          ? (Math.sin(phase * 2 + i * 0.3) * 0.5 + 0.5) * 38 * factor +
            (Math.cos(phase * 1.5 - i * 0.2) * 0.5 + 0.5) * 22 * factor +
            (isVocalActive ? Math.sin(phase * 4 + i) * 14 : 4)
          : 3 + Math.sin(phase + i * 0.2) * 2;

        barHeights[i] += (targetHeight - barHeights[i]) * 0.2;
        const h = Math.max(2, barHeights[i]);

        const x = i * (barWidth + 4);
        const y = baseY - h;

        const barGrad = ctx.createLinearGradient(x, y, x, baseY);
        if (theme === 'dark') {
          if (isVocalActive && i % 3 === 0) {
            barGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)'); // Cyan vocal accent
            barGrad.addColorStop(1, 'rgba(56, 189, 248, 0.08)');
          } else {
            barGrad.addColorStop(0, isPlaying ? 'rgba(245, 158, 11, 0.55)' : 'rgba(163, 163, 163, 0.2)');
            barGrad.addColorStop(1, isPlaying ? 'rgba(245, 158, 11, 0.05)' : 'rgba(115, 115, 115, 0.02)');
          }
        } else {
          barGrad.addColorStop(0, isPlaying ? 'rgba(245, 158, 11, 0.6)' : 'rgba(200, 200, 200, 0.4)');
          barGrad.addColorStop(1, 'rgba(245, 158, 11, 0.05)');
        }

        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, [3, 3, 0, 0]);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying, tempoBpm, theme, isVocalActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full opacity-65 z-0"
    />
  );
};
