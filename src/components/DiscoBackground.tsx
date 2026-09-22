import React, { useEffect, useRef } from 'react';

interface DiscoBackgroundProps {
  isPlaying?: boolean;
  tempoBpm?: number;
  intensity?: 'full' | 'subtle' | 'off';
}

export const DiscoBackground: React.FC<DiscoBackgroundProps> = ({
  isPlaying = false,
  tempoBpm = 120,
  intensity = 'full',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (intensity === 'off') return;

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

    // Sparkle particles
    const particleCount = intensity === 'full' ? 65 : 30;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 3 + 1,
      speedY: Math.random() * 0.6 + 0.2,
      speedX: (Math.random() - 0.5) * 0.4,
      hue: Math.random() * 360,
      opacity: Math.random() * 0.7 + 0.3,
      sparklePhase: Math.random() * Math.PI * 2,
    }));

    // Spotlights
    const spotlights = [
      { angle: 0, speed: 0.012, color: 'rgba(236, 72, 153, 0.15)', hue: 330 }, // Pink
      { angle: Math.PI / 2, speed: -0.014, color: 'rgba(6, 182, 212, 0.15)', hue: 190 }, // Cyan
      { angle: Math.PI, speed: 0.01, color: 'rgba(168, 85, 247, 0.15)', hue: 270 }, // Violet
      { angle: (3 * Math.PI) / 2, speed: -0.011, color: 'rgba(245, 158, 11, 0.15)', hue: 45 }, // Amber
    ];

    let time = 0;
    const bpmSpeedMultiplier = (tempoBpm / 120) * (isPlaying ? 1.5 : 0.8);

    const render = () => {
      time += 0.016 * bpmSpeedMultiplier;
      ctx.clearRect(0, 0, width, height);

      // 1. Dark Club Base Gradient with Pulsing Ambient Light
      const pulse = isPlaying ? Math.sin(time * 6) * 0.05 + 0.1 : 0.05;
      const bgGrad = ctx.createRadialGradient(
        width / 2,
        height * 0.25,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, `rgba(35, 15, 60, ${0.4 + pulse})`);
      bgGrad.addColorStop(0.5, `rgba(15, 10, 30, ${0.75 + pulse})`);
      bgGrad.addColorStop(1, 'rgba(8, 6, 15, 0.95)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Sweeping Volumetric Disco Spotlights
      const ballOriginX = width / 2;
      const ballOriginY = 60;

      spotlights.forEach((spot) => {
        spot.angle += spot.speed * bpmSpeedMultiplier;
        const beamLength = Math.max(width, height) * 1.3;
        const beamAngle = spot.angle;
        const spread = 0.35 + (isPlaying ? Math.sin(time * 4) * 0.05 : 0);

        const targetX1 = ballOriginX + Math.cos(beamAngle - spread) * beamLength;
        const targetY1 = ballOriginY + Math.sin(beamAngle - spread) * beamLength;
        const targetX2 = ballOriginX + Math.cos(beamAngle + spread) * beamLength;
        const targetY2 = ballOriginY + Math.sin(beamAngle + spread) * beamLength;

        const coneGrad = ctx.createRadialGradient(
          ballOriginX,
          ballOriginY,
          10,
          (targetX1 + targetX2) / 2,
          (targetY1 + targetY2) / 2,
          beamLength
        );
        coneGrad.addColorStop(0, `hsla(${spot.hue}, 100%, 75%, ${isPlaying ? 0.35 : 0.18})`);
        coneGrad.addColorStop(0.3, `hsla(${spot.hue}, 90%, 60%, ${isPlaying ? 0.18 : 0.08})`);
        coneGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.moveTo(ballOriginX, ballOriginY);
        ctx.lineTo(targetX1, targetY1);
        ctx.lineTo(targetX2, targetY2);
        ctx.closePath();
        ctx.fillStyle = coneGrad;
        ctx.fill();
      });

      // 3. Perspective Disco Dance Floor Grid (Bottom 35% of canvas)
      const floorStartY = height * 0.68;
      const horizonY = floorStartY;
      const floorHeight = height - floorStartY;

      if (floorHeight > 30) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, floorStartY, width, floorHeight);
        ctx.clip();

        // Floor glow
        const floorGrad = ctx.createLinearGradient(0, floorStartY, 0, height);
        floorGrad.addColorStop(0, 'rgba(20, 10, 35, 0.4)');
        floorGrad.addColorStop(1, 'rgba(40, 15, 60, 0.7)');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorStartY, width, floorHeight);

        // Perspective grid lines
        const numCols = 16;
        const centerX = width / 2;
        ctx.lineWidth = 1;

        for (let c = -numCols / 2; c <= numCols / 2; c++) {
          const colProgress = c / (numCols / 2);
          const topX = centerX + colProgress * (width * 0.25);
          const botX = centerX + colProgress * (width * 0.9);

          ctx.beginPath();
          ctx.moveTo(topX, horizonY);
          ctx.lineTo(botX, height);
          ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 + (isPlaying ? 0.1 : 0)})`;
          ctx.stroke();
        }

        // Horizontal perspective depth bars
        const depthSteps = 8;
        for (let d = 1; d <= depthSteps; d++) {
          const prog = Math.pow(d / depthSteps, 2);
          const yPos = horizonY + prog * floorHeight;
          const beatFlash = isPlaying && ((d + Math.floor(time * 4)) % 2 === 0);
          ctx.beginPath();
          ctx.moveTo(0, yPos);
          ctx.lineTo(width, yPos);
          ctx.strokeStyle = beatFlash
            ? 'rgba(236, 72, 153, 0.4)'
            : 'rgba(6, 182, 212, 0.18)';
          ctx.stroke();
        }

        ctx.restore();
      }

      // 4. Floating Disco Glitter Dust Particles
      particles.forEach((p) => {
        p.y -= p.speedY * bpmSpeedMultiplier;
        p.x += p.speedX;
        p.sparklePhase += 0.05;

        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const currentOpacity = p.opacity * (0.5 + Math.sin(p.sparklePhase) * 0.5);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 70%, ${currentOpacity})`;
        ctx.fill();

        // Extra twinkle cross
        if (p.size > 2.2 && currentOpacity > 0.6) {
          ctx.strokeStyle = `hsla(${p.hue}, 100%, 90%, ${currentOpacity * 0.8})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size * 2, p.y);
          ctx.lineTo(p.x + p.size * 2, p.y);
          ctx.moveTo(p.x, p.y - p.size * 2);
          ctx.lineTo(p.x, p.y + p.size * 2);
          ctx.stroke();
        }
      });

      // 5. Mirrored Hanging Disco Ball
      const ballRadius = 36;
      // Hanging chain
      ctx.beginPath();
      ctx.moveTo(ballOriginX, 0);
      ctx.lineTo(ballOriginX, ballOriginY);
      ctx.strokeStyle = 'rgba(200, 200, 220, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer Ball Aura / Glow
      const ballAura = ctx.createRadialGradient(
        ballOriginX,
        ballOriginY,
        ballRadius * 0.7,
        ballOriginX,
        ballOriginY,
        ballRadius * 2.2
      );
      ballAura.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      ballAura.addColorStop(0.4, 'rgba(168, 85, 247, 0.2)');
      ballAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ballAura;
      ctx.beginPath();
      ctx.arc(ballOriginX, ballOriginY, ballRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Disco Ball Body
      ctx.save();
      ctx.beginPath();
      ctx.arc(ballOriginX, ballOriginY, ballRadius, 0, Math.PI * 2);
      ctx.clip();

      const ballBase = ctx.createRadialGradient(
        ballOriginX - ballRadius * 0.3,
        ballOriginY - ballRadius * 0.3,
        5,
        ballOriginX,
        ballOriginY,
        ballRadius
      );
      ballBase.addColorStop(0, '#ffffff');
      ballBase.addColorStop(0.3, '#cbd5e1');
      ballBase.addColorStop(0.7, '#64748b');
      ballBase.addColorStop(1, '#1e293b');
      ctx.fillStyle = ballBase;
      ctx.fillRect(ballOriginX - ballRadius, ballOriginY - ballRadius, ballRadius * 2, ballRadius * 2);

      // Rotating Mirror Facets Grid
      const rows = 12;
      const cols = 14;
      const rot = time * 0.8;

      for (let r = 0; r < rows; r++) {
        const rowY = ballOriginY - ballRadius + (r / rows) * (ballRadius * 2);
        const dy = rowY - ballOriginY;
        const rowWidth = Math.sqrt(Math.max(0, ballRadius * ballRadius - dy * dy)) * 2;
        if (rowWidth <= 2) continue;

        for (let c = 0; c < cols; c++) {
          const u = (c / cols + rot) % 1;
          const facetX = ballOriginX - rowWidth / 2 + u * rowWidth;
          const facetSize = 4.5;
          const shimmer = Math.sin(u * Math.PI * 4 + time * 3);

          if (shimmer > 0.2) {
            ctx.fillStyle = shimmer > 0.7 ? '#ffffff' : 'rgba(216, 180, 254, 0.8)';
            ctx.fillRect(facetX, rowY, facetSize, facetSize);
          } else {
            ctx.fillStyle = 'rgba(71, 85, 105, 0.5)';
            ctx.fillRect(facetX, rowY, facetSize, facetSize);
          }
        }
      }
      ctx.restore();

      // Specular highlight gleam on top left of ball
      ctx.beginPath();
      ctx.arc(ballOriginX - 12, ballOriginY - 12, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [intensity, isPlaying, tempoBpm]);

  if (intensity === 'off') return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          opacity: intensity === 'subtle' ? 0.5 : 0.88,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
};
