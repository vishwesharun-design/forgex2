import React, { useEffect, useRef } from 'react';
import { ForgeXTheme } from '../types';

interface StarFieldProps {
  theme: ForgeXTheme;
  reduceMotion?: boolean;
  intensity?: 'full' | 'subtle';
}

interface Star {
  x: number;
  y: number;
  roamVx: number;
  roamVy: number;
  pushVx: number;
  pushVy: number;
  wanderAngle: number;
  wanderSpeed: number;
  z: number; // depth factor (0.2 to 1.0)
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  isAmber: boolean;
}

export const StarField: React.FC<StarFieldProps> = ({
  theme,
  reduceMotion = false,
  intensity = 'full',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef<{ 
    x: number; 
    y: number; 
    prevX: number; 
    prevY: number; 
    speedX: number; 
    speedY: number; 
    active: boolean;
    lastActiveTime: number;
  }>({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    speedX: 0,
    speedY: 0,
    active: false,
    lastActiveTime: 0,
  });
  const animFrameId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initStars();
    };

    const initStars = () => {
      const count = intensity === 'full' 
        ? Math.floor((width * height) / 6000) 
        : Math.floor((width * height) / 12000);

      const isDark = theme === 'dark';
      const stars: Star[] = [];

      for (let i = 0; i < Math.max(count, 90); i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const z = 0.25 + Math.random() * 0.75;
        const size = (0.7 + Math.random() * 1.5) * z;
        const baseAlpha = isDark 
          ? 0.25 + Math.random() * 0.65 
          : 0.15 + Math.random() * 0.35;

        // Base roaming direction: slow, organic, drifting velocities
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.15 + Math.random() * 0.35) * z;
        const roamVx = Math.cos(angle) * speed;
        const roamVy = Math.sin(angle) * speed;

        const isAmber = Math.random() < 0.22;
        const color = isDark
          ? isAmber
            ? 'rgba(251, 191, 36,'
            : 'rgba(224, 231, 255,'
          : isAmber
            ? 'rgba(217, 119, 6,'
            : 'rgba(71, 85, 105,';

        stars.push({
          x,
          y,
          roamVx,
          roamVy,
          pushVx: 0,
          pushVy: 0,
          wanderAngle: angle,
          wanderSpeed: (Math.random() - 0.5) * 0.012,
          z,
          size,
          baseAlpha,
          alpha: baseAlpha,
          twinkleSpeed: 0.015 + Math.random() * 0.035,
          twinklePhase: Math.random() * Math.PI * 2,
          color,
          isAmber,
        });
      }
      starsRef.current = stars;
    };

    resize();
    window.addEventListener('resize', resize);

    const updateMouse = (clientX: number, clientY: number) => {
      const mouse = mouseRef.current;
      mouse.prevX = mouse.x === -1000 ? clientX : mouse.x;
      mouse.prevY = mouse.y === -1000 ? clientY : mouse.y;
      mouse.x = clientX;
      mouse.y = clientY;
      mouse.speedX = (clientX - mouse.prevX) * 0.4;
      mouse.speedY = (clientY - mouse.prevY) * 0.4;
      mouse.active = true;
      mouse.lastActiveTime = performance.now();
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMouse(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const stars = starsRef.current;
      const isDark = theme === 'dark';

      // Mouse inactivity decay after 2 seconds
      if (mouse.active && performance.now() - mouse.lastActiveTime > 2500) {
        mouse.active = false;
      }

      const influenceRadius = 190;
      const nearbyStarsForLines: Star[] = [];

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        if (!reduceMotion) {
          // 1. Organic roaming wandering motion
          star.wanderAngle += star.wanderSpeed;
          // Apply slight curve to roaming direction
          const currentSpeed = Math.sqrt(star.roamVx * star.roamVx + star.roamVy * star.roamVy);
          star.roamVx = Math.cos(star.wanderAngle) * currentSpeed;
          star.roamVy = Math.sin(star.wanderAngle) * currentSpeed;

          // 2. Cursor dynamic interaction
          if (mouse.active) {
            const dx = star.x - mouse.x;
            const dy = star.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < influenceRadius && dist > 0.001) {
              const normalDist = dist / influenceRadius;
              // Repulsive and tangential deflection force
              const force = (1 - normalDist) * (star.z * 1.6 + 0.4);
              
              // Radial outward push + directional momentum from cursor drag
              star.pushVx += (dx / dist) * force * 1.1 + mouse.speedX * force * 0.18;
              star.pushVy += (dy / dist) * force * 1.1 + mouse.speedY * force * 0.18;

              // Collect nearby stars for subtle constellation filaments
              if (dist < 110) {
                nearbyStarsForLines.push(star);
              }
            }
          }

          // 3. Apply physics damping to cursor push forces
          star.pushVx *= 0.91;
          star.pushVy *= 0.91;

          // 4. Update coordinates with continuous roaming + push
          star.x += star.roamVx + star.pushVx;
          star.y += star.roamVy + star.pushVy;

          // 5. Seamless screen wrap around borders so stars continuously roam
          const buffer = 24;
          if (star.x < -buffer) {
            star.x = width + buffer;
          } else if (star.x > width + buffer) {
            star.x = -buffer;
          }

          if (star.y < -buffer) {
            star.y = height + buffer;
          } else if (star.y > height + buffer) {
            star.y = -buffer;
          }

          // 6. Twinkle & excitation
          star.twinklePhase += star.twinkleSpeed;
          const twinkle = Math.sin(star.twinklePhase) * 0.25;

          // Near cursor excitation (brightens up)
          let excitation = 0;
          if (mouse.active) {
            const d = Math.hypot(star.x - mouse.x, star.y - mouse.y);
            if (d < influenceRadius) {
              excitation = (1 - d / influenceRadius) * 0.35;
            }
          }

          star.alpha = Math.max(0.08, Math.min(1, star.baseAlpha + twinkle + excitation));
        }

        // 7. Draw star particle with subtle soft halo
        if (star.size > 1.2 || star.isAmber) {
          ctx.save();
          const glowGradient = ctx.createRadialGradient(
            star.x, star.y, 0,
            star.x, star.y, star.size * 2.8
          );
          glowGradient.addColorStop(0, `${star.color} ${star.alpha * 0.5})`);
          glowGradient.addColorStop(1, `${star.color} 0)`);
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.fillStyle = `${star.color} ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Render delicate constellation connections near cursor
      if (mouse.active && nearbyStarsForLines.length > 0) {
        ctx.save();
        for (let i = 0; i < nearbyStarsForLines.length; i++) {
          const s1 = nearbyStarsForLines[i];
          const distToMouse = Math.hypot(s1.x - mouse.x, s1.y - mouse.y);
          const lineAlpha = (1 - distToMouse / 110) * 0.22;

          // Line to cursor
          ctx.strokeStyle = isDark 
            ? `rgba(251, 191, 36, ${lineAlpha})` 
            : `rgba(217, 119, 6, ${lineAlpha * 0.75})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(s1.x, s1.y);
          ctx.stroke();

          // Inter-star line for close pairs
          for (let j = i + 1; j < nearbyStarsForLines.length; j++) {
            const s2 = nearbyStarsForLines[j];
            const pairDist = Math.hypot(s1.x - s2.x, s1.y - s2.y);
            if (pairDist < 75) {
              const pairAlpha = (1 - pairDist / 75) * 0.18;
              ctx.strokeStyle = isDark 
                ? `rgba(251, 191, 36, ${pairAlpha})` 
                : `rgba(180, 83, 9, ${pairAlpha})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(s1.x, s1.y);
              ctx.lineTo(s2.x, s2.y);
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // Smooth decay on mouse velocity
      mouse.speedX *= 0.8;
      mouse.speedY *= 0.8;

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animFrameId.current);
    };
  }, [theme, reduceMotion, intensity]);

  return (
    <canvas
      ref={canvasRef}
      id="forgex-starfield"
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
      style={{ opacity: intensity === 'subtle' ? 0.6 : 1 }}
    />
  );
};
