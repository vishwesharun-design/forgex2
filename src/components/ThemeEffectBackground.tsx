import React, { useEffect, useRef } from 'react';
import { ForgeXTheme, ThemeEffectType } from '../types';

export interface ThemeEffectProps {
  effect: ThemeEffectType;
  theme: ForgeXTheme;
  reduceMotion?: boolean;
  intensity?: 'full' | 'subtle';
}

export const THEME_EFFECTS_META: {
  id: ThemeEffectType;
  name: string;
  description: string;
  badge: string;
  iconName: string;
}[] = [
  {
    id: 'connected_dots',
    name: 'Connected Dots',
    description: 'Interactive neural node network with dynamic proximity lines',
    badge: 'Popular',
    iconName: 'Network',
  },
  {
    id: 'stars',
    name: 'Starlight Parallax',
    description: '3D depth cosmic starfield with cursor momentum & twinkle',
    badge: 'Cosmic',
    iconName: 'Sparkles',
  },
  {
    id: 'cyber_matrix',
    name: 'Cyber Matrix',
    description: 'Glowing amber digital stream and falling tech glyph rain',
    badge: 'Cyberpunk',
    iconName: 'Terminal',
  },
  {
    id: 'neon_waves',
    name: 'Aurora Waves',
    description: 'Fluid undulating sine waves that ripple with cursor motion',
    badge: 'Fluid',
    iconName: 'Activity',
  },
  {
    id: 'floating_particles',
    name: 'Floating Embers',
    description: 'Warm glowing ambient embers drifting with organic air currents',
    badge: 'Warm',
    iconName: 'Flame',
  },
  {
    id: 'geometric_grid',
    name: 'Perspective Grid',
    description: 'Retro-futuristic 3D perspective grid with horizon tilt',
    badge: 'Retro 3D',
    iconName: 'Grid',
  },
  {
    id: 'none',
    name: 'Clean Minimal',
    description: 'No canvas animations for distraction-free performance',
    badge: 'Off',
    iconName: 'EyeOff',
  },
];

interface NodeDot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  isAmber: boolean;
  pulsePhase: number;
  pulseSpeed: number;
}

interface StarParticle {
  x: number;
  y: number;
  roamVx: number;
  roamVy: number;
  pushVx: number;
  pushVy: number;
  wanderAngle: number;
  wanderSpeed: number;
  z: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  isAmber: boolean;
}

interface MatrixDrop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
  switchCounter: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  swaySpeed: number;
  swayPhase: number;
  hue: number;
}

export const ThemeEffectBackground: React.FC<ThemeEffectProps> = ({
  effect,
  theme,
  reduceMotion = false,
  intensity = 'full',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Storage for different effect engines
  const dotsRef = useRef<NodeDot[]>([]);
  const starsRef = useRef<StarParticle[]>([]);
  const matrixRef = useRef<MatrixDrop[]>([]);
  const embersRef = useRef<EmberParticle[]>([]);
  const waveTimeRef = useRef<number>(0);
  const gridOffsetRef = useRef<number>(0);

  const mouseRef = useRef<{
    x: number;
    y: number;
    prevX: number;
    prevY: number;
    speedX: number;
    speedY: number;
    active: boolean;
    lastActiveTime: number;
    clickPulse: number;
  }>({
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    speedX: 0,
    speedY: 0,
    active: false,
    lastActiveTime: 0,
    clickPulse: 0,
  });

  const animFrameId = useRef<number>(0);

  useEffect(() => {
    if (effect === 'none') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const isDark = theme === 'dark';

    // -------------------------------------------------------------
    // Initializers for each effect type
    // -------------------------------------------------------------
    const initEffect = () => {
      if (width === 0 || height === 0) return;

      if (effect === 'connected_dots') {
        const count = intensity === 'full' 
          ? Math.min(110, Math.floor((width * height) / 12000) + 40)
          : Math.min(60, Math.floor((width * height) / 22000) + 25);

        const dots: NodeDot[] = [];
        for (let i = 0; i < count; i++) {
          const isAmber = Math.random() < 0.28;
          dots.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.7,
            vy: (Math.random() - 0.5) * 0.7,
            radius: isAmber ? 2 + Math.random() * 2 : 1.2 + Math.random() * 1.5,
            baseAlpha: isDark ? (isAmber ? 0.75 : 0.45) : (isAmber ? 0.6 : 0.35),
            isAmber,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.03,
          });
        }
        dotsRef.current = dots;
      } else if (effect === 'stars') {
        const count = intensity === 'full' 
          ? Math.floor((width * height) / 6000) 
          : Math.floor((width * height) / 12000);

        const stars: StarParticle[] = [];
        for (let i = 0; i < Math.max(count, 90); i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const z = 0.25 + Math.random() * 0.75;
          const size = (0.7 + Math.random() * 1.5) * z;
          const baseAlpha = isDark ? 0.25 + Math.random() * 0.65 : 0.15 + Math.random() * 0.35;
          const angle = Math.random() * Math.PI * 2;
          const speed = (0.15 + Math.random() * 0.35) * z;
          const isAmber = Math.random() < 0.22;
          const color = isDark
            ? isAmber ? 'rgba(251, 191, 36,' : 'rgba(224, 231, 255,'
            : isAmber ? 'rgba(217, 119, 6,' : 'rgba(71, 85, 105,';

          stars.push({
            x,
            y,
            roamVx: Math.cos(angle) * speed,
            roamVy: Math.sin(angle) * speed,
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
      } else if (effect === 'cyber_matrix') {
        const glyphs = '0123456789ABCDEFλΨ◈⬡X<>+-*#';
        const colWidth = 24;
        const columns = Math.floor(width / colWidth);
        const matrixDrops: MatrixDrop[] = [];

        for (let i = 0; i < columns; i++) {
          const len = 8 + Math.floor(Math.random() * 16);
          const chars: string[] = [];
          for (let j = 0; j < len; j++) {
            chars.push(glyphs[Math.floor(Math.random() * glyphs.length)]);
          }
          matrixDrops.push({
            x: i * colWidth + 6,
            y: Math.random() * height - height,
            speed: 1.2 + Math.random() * 2.2,
            chars,
            length: len,
            switchCounter: 0,
          });
        }
        matrixRef.current = matrixDrops;
      } else if (effect === 'floating_particles') {
        const count = intensity === 'full' ? 55 : 30;
        const embers: EmberParticle[] = [];
        for (let i = 0; i < count; i++) {
          embers.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -0.4 - Math.random() * 0.8,
            size: 1.5 + Math.random() * 3.5,
            baseAlpha: isDark ? 0.3 + Math.random() * 0.5 : 0.2 + Math.random() * 0.35,
            alpha: 0.4,
            swaySpeed: 0.015 + Math.random() * 0.025,
            swayPhase: Math.random() * Math.PI * 2,
            hue: 35 + Math.random() * 18, // Warm golden-amber hue range
          });
        }
        embersRef.current = embers;
      }
    };

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
      initEffect();
    };

    resize();
    window.addEventListener('resize', resize);

    // Mouse handlers
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

    const handleMouseMove = (e: MouseEvent) => updateMouse(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateMouse(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    const handleClick = () => {
      mouseRef.current.clickPulse = 1.0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    // -------------------------------------------------------------
    // Master Animation Loop
    // -------------------------------------------------------------
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const mouse = mouseRef.current;

      // Mouse inactivity decay
      if (mouse.active && performance.now() - mouse.lastActiveTime > 3000) {
        mouse.active = false;
      }

      // Fade click pulse
      if (mouse.clickPulse > 0.01) {
        mouse.clickPulse *= 0.92;
      } else {
        mouse.clickPulse = 0;
      }

      // ===========================================================
      // EFFECT 1: CONNECTED DOTS (Neural Mesh)
      // ===========================================================
      if (effect === 'connected_dots') {
        const dots = dotsRef.current;
        const maxDist = isDark ? 135 : 115;
        const mouseRadius = 180;

        // 1. Move dots and handle bounds
        for (let i = 0; i < dots.length; i++) {
          const dot = dots[i];

          if (!reduceMotion) {
            // Mouse push / deflection
            if (mouse.active) {
              const dx = dot.x - mouse.x;
              const dy = dot.y - mouse.y;
              const dist = Math.hypot(dx, dy);
              if (dist < mouseRadius && dist > 0.1) {
                const force = (1 - dist / mouseRadius) * 1.5;
                dot.vx += (dx / dist) * force * 0.35 + mouse.speedX * 0.04;
                dot.vy += (dy / dist) * force * 0.35 + mouse.speedY * 0.04;
              }
            }

            // Click pulse expansion
            if (mouse.clickPulse > 0.05 && mouse.active) {
              const dx = dot.x - mouse.x;
              const dy = dot.y - mouse.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 320 && dist > 0.1) {
                const pForce = (1 - dist / 320) * mouse.clickPulse * 3;
                dot.vx += (dx / dist) * pForce;
                dot.vy += (dy / dist) * pForce;
              }
            }

            // Velocity friction damping
            dot.vx *= 0.98;
            dot.vy *= 0.98;

            dot.x += dot.vx;
            dot.y += dot.vy;

            // Screen wrap
            if (dot.x < -10) dot.x = width + 10;
            else if (dot.x > width + 10) dot.x = -10;
            if (dot.y < -10) dot.y = height + 10;
            else if (dot.y > height + 10) dot.y = -10;

            dot.pulsePhase += dot.pulseSpeed;
          }

          // Draw node
          const pulse = Math.sin(dot.pulsePhase) * 0.2;
          const currentAlpha = Math.max(0.15, Math.min(1, dot.baseAlpha + pulse));
          
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
          if (dot.isAmber) {
            ctx.fillStyle = isDark 
              ? `rgba(245, 158, 11, ${currentAlpha})` 
              : `rgba(217, 119, 6, ${currentAlpha})`;
            // Amber glow aura
            ctx.shadowColor = isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(217, 119, 6, 0.25)';
            ctx.shadowBlur = dot.radius * 2;
          } else {
            ctx.fillStyle = isDark 
              ? `rgba(224, 231, 255, ${currentAlpha})` 
              : `rgba(100, 116, 139, ${currentAlpha})`;
            ctx.shadowBlur = 0;
          }
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // 2. Connect inter-dot lines
        ctx.lineWidth = 0.65;
        for (let i = 0; i < dots.length; i++) {
          const d1 = dots[i];
          for (let j = i + 1; j < dots.length; j++) {
            const d2 = dots[j];
            const dist = Math.hypot(d1.x - d2.x, d1.y - d2.y);
            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * (isDark ? 0.24 : 0.16);
              const hasAmber = d1.isAmber || d2.isAmber;
              ctx.strokeStyle = isDark
                ? hasAmber ? `rgba(245, 158, 11, ${alpha * 1.3})` : `rgba(203, 213, 225, ${alpha})`
                : hasAmber ? `rgba(217, 119, 6, ${alpha * 1.2})` : `rgba(148, 163, 184, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(d1.x, d1.y);
              ctx.lineTo(d2.x, d2.y);
              ctx.stroke();
            }
          }
        }

        // 3. Connect lines to mouse cursor
        if (mouse.active) {
          ctx.lineWidth = 0.85;
          for (let i = 0; i < dots.length; i++) {
            const dot = dots[i];
            const dist = Math.hypot(dot.x - mouse.x, dot.y - mouse.y);
            if (dist < mouseRadius) {
              const alpha = (1 - dist / mouseRadius) * (isDark ? 0.45 : 0.3);
              ctx.strokeStyle = isDark 
                ? `rgba(245, 158, 11, ${alpha})` 
                : `rgba(217, 119, 6, ${alpha})`;
              ctx.beginPath();
              ctx.moveTo(mouse.x, mouse.y);
              ctx.lineTo(dot.x, dot.y);
              ctx.stroke();
            }
          }

          // Cursor focal node
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.8)' : 'rgba(217, 119, 6, 0.8)';
          ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // ===========================================================
      // EFFECT 2: STARS (Starlight Parallax)
      // ===========================================================
      else if (effect === 'stars') {
        const stars = starsRef.current;
        const influenceRadius = 190;
        const nearbyStarsForLines: StarParticle[] = [];

        for (let i = 0; i < stars.length; i++) {
          const star = stars[i];

          if (!reduceMotion) {
            star.wanderAngle += star.wanderSpeed;
            const currentSpeed = Math.sqrt(star.roamVx * star.roamVx + star.roamVy * star.roamVy);
            star.roamVx = Math.cos(star.wanderAngle) * currentSpeed;
            star.roamVy = Math.sin(star.wanderAngle) * currentSpeed;

            if (mouse.active) {
              const dx = star.x - mouse.x;
              const dy = star.y - mouse.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < influenceRadius && dist > 0.001) {
                const normalDist = dist / influenceRadius;
                const force = (1 - normalDist) * (star.z * 1.6 + 0.4);
                star.pushVx += (dx / dist) * force * 1.1 + mouse.speedX * force * 0.18;
                star.pushVy += (dy / dist) * force * 1.1 + mouse.speedY * force * 0.18;

                if (dist < 110) nearbyStarsForLines.push(star);
              }
            }

            star.pushVx *= 0.91;
            star.pushVy *= 0.91;
            star.x += star.roamVx + star.pushVx;
            star.y += star.roamVy + star.pushVy;

            const buffer = 24;
            if (star.x < -buffer) star.x = width + buffer;
            else if (star.x > width + buffer) star.x = -buffer;
            if (star.y < -buffer) star.y = height + buffer;
            else if (star.y > height + buffer) star.y = -buffer;

            star.twinklePhase += star.twinkleSpeed;
            const twinkle = Math.sin(star.twinklePhase) * 0.25;

            let excitation = 0;
            if (mouse.active) {
              const d = Math.hypot(star.x - mouse.x, star.y - mouse.y);
              if (d < influenceRadius) excitation = (1 - d / influenceRadius) * 0.35;
            }

            star.alpha = Math.max(0.08, Math.min(1, star.baseAlpha + twinkle + excitation));
          }

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

        // Constellation filaments near cursor
        if (mouse.active && nearbyStarsForLines.length > 0) {
          ctx.save();
          for (let i = 0; i < nearbyStarsForLines.length; i++) {
            const s1 = nearbyStarsForLines[i];
            const distToMouse = Math.hypot(s1.x - mouse.x, s1.y - mouse.y);
            const lineAlpha = (1 - distToMouse / 110) * 0.22;

            ctx.strokeStyle = isDark 
              ? `rgba(251, 191, 36, ${lineAlpha})` 
              : `rgba(217, 119, 6, ${lineAlpha * 0.75})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(s1.x, s1.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // ===========================================================
      // EFFECT 3: CYBER MATRIX (Falling Digital Glyphs)
      // ===========================================================
      else if (effect === 'cyber_matrix') {
        const glyphs = '0123456789ABCDEFλΨ◈⬡X<>+-*#';
        const matrixDrops = matrixRef.current;
        ctx.font = '12px monospace';

        for (let i = 0; i < matrixDrops.length; i++) {
          const drop = matrixDrops[i];

          if (!reduceMotion) {
            drop.y += drop.speed;
            drop.switchCounter++;
            if (drop.switchCounter % 15 === 0) {
              const changeIdx = Math.floor(Math.random() * drop.chars.length);
              drop.chars[changeIdx] = glyphs[Math.floor(Math.random() * glyphs.length)];
            }

            if (drop.y > height + 200) {
              drop.y = -drop.length * 18 - Math.random() * 80;
              drop.speed = 1.2 + Math.random() * 2.2;
            }
          }

          // Proximity to cursor illuminates characters
          let mouseExcitement = 0;
          if (mouse.active) {
            const dist = Math.abs(drop.x - mouse.x);
            if (dist < 80) mouseExcitement = (1 - dist / 80) * 0.4;
          }

          for (let j = 0; j < drop.chars.length; j++) {
            const charY = drop.y + j * 16;
            if (charY < -20 || charY > height + 20) continue;

            const isHead = j === drop.chars.length - 1;
            const progress = j / drop.chars.length;
            const alpha = Math.min(1, (isHead ? 0.95 : progress * 0.45) + mouseExcitement);

            if (isHead) {
              ctx.fillStyle = isDark ? '#fef08a' : '#b45309';
              ctx.shadowColor = isDark ? 'rgba(251, 191, 36, 0.7)' : 'rgba(217, 119, 6, 0.4)';
              ctx.shadowBlur = 6;
            } else {
              ctx.fillStyle = isDark 
                ? `rgba(245, 158, 11, ${alpha * 0.75})` 
                : `rgba(180, 83, 9, ${alpha * 0.65})`;
              ctx.shadowBlur = 0;
            }

            ctx.fillText(drop.chars[j], drop.x, charY);
          }
          ctx.shadowBlur = 0;
        }
      }

      // ===========================================================
      // EFFECT 4: NEON WAVES (Aurora Harmonic Waves)
      // ===========================================================
      else if (effect === 'neon_waves') {
        if (!reduceMotion) {
          waveTimeRef.current += 0.012;
        }
        const time = waveTimeRef.current;
        const waveCount = 4;
        const baseHeight = height * 0.65;

        for (let w = 0; w < waveCount; w++) {
          const wProgress = w / waveCount;
          const amplitude = 35 + w * 18;
          const frequency = 0.0018 + w * 0.0006;
          const speed = time * (1 + w * 0.35);

          ctx.beginPath();
          ctx.moveTo(0, height);

          for (let x = 0; x <= width; x += 12) {
            let y = baseHeight + Math.sin(x * frequency + speed) * amplitude;
            y += Math.cos(x * 0.001 + speed * 0.8) * (amplitude * 0.4);

            // Mouse displacement ripple
            if (mouse.active) {
              const dx = x - mouse.x;
              const dy = y - mouse.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 180) {
                const push = (1 - dist / 180) * 35;
                y -= push;
              }
            }

            if (x === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.lineTo(width, height);
          ctx.closePath();

          const waveAlpha = (0.12 + wProgress * 0.15) * (isDark ? 1 : 0.7);
          const grad = ctx.createLinearGradient(0, baseHeight - 60, 0, height);
          if (w % 2 === 0) {
            grad.addColorStop(0, isDark ? `rgba(245, 158, 11, ${waveAlpha})` : `rgba(217, 119, 6, ${waveAlpha})`);
            grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          } else {
            grad.addColorStop(0, isDark ? `rgba(217, 119, 6, ${waveAlpha * 0.9})` : `rgba(245, 158, 11, ${waveAlpha * 0.8})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          ctx.fillStyle = grad;
          ctx.fill();

          // Top rim stroke
          ctx.strokeStyle = isDark 
            ? `rgba(251, 191, 36, ${waveAlpha * 1.4})` 
            : `rgba(217, 119, 6, ${waveAlpha * 1.2})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // ===========================================================
      // EFFECT 5: FLOATING PARTICLES (Warm Embers)
      // ===========================================================
      else if (effect === 'floating_particles') {
        const embers = embersRef.current;
        for (let i = 0; i < embers.length; i++) {
          const ember = embers[i];

          if (!reduceMotion) {
            ember.swayPhase += ember.swaySpeed;
            const sway = Math.sin(ember.swayPhase) * 0.6;

            if (mouse.active) {
              const dx = ember.x - mouse.x;
              const dy = ember.y - mouse.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 140 && dist > 0.1) {
                const force = (1 - dist / 140) * 1.2;
                ember.vx += (dx / dist) * force * 0.3;
                ember.vy += (dy / dist) * force * 0.3;
              }
            }

            ember.vx *= 0.96;
            ember.vy *= 0.96;

            ember.x += ember.vx + sway;
            ember.y += ember.vy - 0.35; // gently rise

            if (ember.y < -20) {
              ember.y = height + 20;
              ember.x = Math.random() * width;
            }
            if (ember.x < -20) ember.x = width + 20;
            else if (ember.x > width + 20) ember.x = -20;
          }

          // Draw warm ember particle with radial halo
          ctx.save();
          const rad = ember.size * 2.5;
          const emberGrad = ctx.createRadialGradient(
            ember.x, ember.y, 0,
            ember.x, ember.y, rad
          );
          const color = isDark 
            ? `hsla(${ember.hue}, 95%, 60%, ` 
            : `hsla(${ember.hue}, 85%, 45%, `;

          emberGrad.addColorStop(0, `${color}${ember.baseAlpha})`);
          emberGrad.addColorStop(0.4, `${color}${ember.baseAlpha * 0.4})`);
          emberGrad.addColorStop(1, `${color}0)`);

          ctx.fillStyle = emberGrad;
          ctx.beginPath();
          ctx.arc(ember.x, ember.y, rad, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // ===========================================================
      // EFFECT 6: GEOMETRIC GRID (Perspective Synth Horizon)
      // ===========================================================
      else if (effect === 'geometric_grid') {
        if (!reduceMotion) {
          gridOffsetRef.current = (gridOffsetRef.current + 0.8) % 40;
        }
        const offset = gridOffsetRef.current;
        const horizonY = height * 0.52;

        // Perspective mouse tilt
        const tiltX = mouse.active ? (mouse.x - width / 2) * 0.04 : 0;

        ctx.save();
        ctx.strokeStyle = isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(217, 119, 6, 0.15)';
        ctx.lineWidth = 1;

        // Converging vertical lines to vanishing point
        const vanishX = width / 2 + tiltX;
        const lineCount = 28;
        for (let i = 0; i <= lineCount; i++) {
          const bottomX = (width / lineCount) * i;
          ctx.beginPath();
          ctx.moveTo(vanishX, horizonY);
          ctx.lineTo(bottomX, height);
          ctx.stroke();
        }

        // Horizontal perspective lines moving downward
        let currY = horizonY;
        let step = 6;
        for (let i = 0; i < 22; i++) {
          currY += step;
          step *= 1.18;
          if (currY > height) break;

          const animatedY = currY + (offset * (step / 40));
          if (animatedY <= horizonY || animatedY >= height) continue;

          const alpha = Math.min(0.28, (animatedY - horizonY) / (height - horizonY) * 0.28);
          ctx.strokeStyle = isDark 
            ? `rgba(245, 158, 11, ${alpha})` 
            : `rgba(217, 119, 6, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(0, animatedY);
          ctx.lineTo(width, animatedY);
          ctx.stroke();
        }

        // Horizon glow line
        ctx.strokeStyle = isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.stroke();

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
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animFrameId.current);
    };
  }, [effect, theme, reduceMotion, intensity]);

  if (effect === 'none') {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      id="forgex-theme-background-canvas"
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
      style={{ opacity: intensity === 'subtle' ? 0.65 : 1 }}
    />
  );
};
