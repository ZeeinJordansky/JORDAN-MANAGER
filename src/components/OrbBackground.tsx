import React, { useEffect, useRef } from 'react';

interface OrbBackgroundProps {
  theme?: 'dark' | 'light';
}

export default function OrbBackground({ theme = 'dark' }: OrbBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let angle = 0;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });

    const render = () => {
      angle += 0.007; // smooth dynamic orbit rotation
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Large orbit size and large orbs as requested ("шарики чуть больше")
      const rx = Math.min(width * 0.42, 520);
      const ry = Math.min(height * 0.32, 340);
      const orbRadius = Math.max(130, Math.min(width * 0.16, 220));

      const tilt = -Math.PI / 8; // -22.5 degree diagonal 3D tilt

      // Orb 1: Cyan / Light Blue (голубой)
      const u1 = Math.sin(angle) * rx;
      const v1 = Math.cos(angle) * ry;
      const x1 = cx + u1 * Math.cos(tilt) - v1 * Math.sin(tilt);
      const y1 = cy + u1 * Math.sin(tilt) + v1 * Math.cos(tilt);

      // Orb 2: Violet / Purple (фиолетовый)
      // Moving along intersecting path so they pass directly through each other at apex/perigee
      const u2 = Math.sin(-angle) * rx;
      const v2 = Math.cos(angle) * ry;
      const x2 = cx + u2 * Math.cos(tilt) - v2 * Math.sin(tilt);
      const y2 = cy + u2 * Math.sin(tilt) + v2 * Math.cos(tilt);

      ctx.save();
      const isLight = theme === 'light';
      ctx.globalCompositeOperation = isLight ? 'multiply' : 'screen';

      // 1. Render Cyan Sphere (Голубой светящийся шар)
      const aura1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, orbRadius * 2.8);
      if (isLight) {
        aura1.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
        aura1.addColorStop(0.4, 'rgba(14, 165, 233, 0.20)');
        aura1.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        aura1.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
        aura1.addColorStop(0.35, 'rgba(14, 165, 233, 0.28)');
        aura1.addColorStop(0.7, 'rgba(2, 132, 199, 0.10)');
        aura1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.beginPath();
      ctx.arc(x1, y1, orbRadius * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = aura1;
      ctx.fill();

      // Core 3D Sphere body
      const grad1 = ctx.createRadialGradient(
        x1 - orbRadius * 0.25,
        y1 - orbRadius * 0.25,
        orbRadius * 0.05,
        x1,
        y1,
        orbRadius
      );
      if (isLight) {
        grad1.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
        grad1.addColorStop(0.3, 'rgba(56, 189, 248, 0.8)');
        grad1.addColorStop(0.7, 'rgba(2, 132, 199, 0.5)');
        grad1.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        grad1.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad1.addColorStop(0.2, 'rgba(186, 230, 253, 0.95)');
        grad1.addColorStop(0.5, 'rgba(56, 189, 248, 0.88)');
        grad1.addColorStop(0.8, 'rgba(2, 132, 199, 0.65)');
        grad1.addColorStop(1, 'rgba(3, 105, 161, 0.15)');
      }
      ctx.beginPath();
      ctx.arc(x1, y1, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad1;
      ctx.fill();

      // 2. Render Violet Sphere (Фиолетовый светящийся шар)
      const aura2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, orbRadius * 2.8);
      if (isLight) {
        aura2.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
        aura2.addColorStop(0.4, 'rgba(126, 34, 206, 0.20)');
        aura2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        aura2.addColorStop(0, 'rgba(168, 85, 247, 0.55)');
        aura2.addColorStop(0.35, 'rgba(126, 34, 206, 0.28)');
        aura2.addColorStop(0.7, 'rgba(88, 28, 135, 0.10)');
        aura2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.beginPath();
      ctx.arc(x2, y2, orbRadius * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = aura2;
      ctx.fill();

      // Core 3D Sphere body
      const grad2 = ctx.createRadialGradient(
        x2 - orbRadius * 0.25,
        y2 - orbRadius * 0.25,
        orbRadius * 0.05,
        x2,
        y2,
        orbRadius
      );
      if (isLight) {
        grad2.addColorStop(0, 'rgba(243, 232, 255, 0.95)');
        grad2.addColorStop(0.3, 'rgba(192, 132, 252, 0.8)');
        grad2.addColorStop(0.7, 'rgba(147, 51, 234, 0.5)');
        grad2.addColorStop(1, 'rgba(255, 255, 255, 0)');
      } else {
        grad2.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad2.addColorStop(0.2, 'rgba(243, 232, 255, 0.95)');
        grad2.addColorStop(0.5, 'rgba(192, 132, 252, 0.88)');
        grad2.addColorStop(0.8, 'rgba(147, 51, 234, 0.65)');
        grad2.addColorStop(1, 'rgba(107, 33, 168, 0.15)');
      }
      ctx.beginPath();
      ctx.arc(x2, y2, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad2;
      ctx.fill();

      // Intersection burst when passing through each other
      const dist = Math.hypot(x1 - x2, y1 - y2);
      if (dist < orbRadius * 1.6) {
        const overlapFactor = 1 - dist / (orbRadius * 1.6);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const burstGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, orbRadius * 1.8);
        if (isLight) {
          burstGrad.addColorStop(0, `rgba(216, 180, 254, ${0.8 * overlapFactor})`);
          burstGrad.addColorStop(0.4, `rgba(186, 230, 253, ${0.5 * overlapFactor})`);
          burstGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else {
          burstGrad.addColorStop(0, `rgba(255, 255, 255, ${0.95 * overlapFactor})`);
          burstGrad.addColorStop(0.3, `rgba(216, 180, 254, ${0.8 * overlapFactor})`);
          burstGrad.addColorStop(0.6, `rgba(125, 211, 252, ${0.5 * overlapFactor})`);
          burstGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }
        ctx.beginPath();
        ctx.arc(midX, midY, orbRadius * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = burstGrad;
        ctx.fill();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  const isLight = theme === 'light';

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-500 ${isLight ? 'bg-[#f8fafc]' : 'bg-black'}`}>
      {/* Blurred background glow layer ("размытый фон задний" + "шарики чуть больше") */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full filter blur-[26px] md:blur-[40px] transition-opacity duration-500 ${
          isLight ? 'opacity-80 mix-blend-multiply' : 'opacity-90 mix-blend-screen'
        }`}
      />
      {/* Ambient veil */}
      <div className={`absolute inset-0 transition-colors duration-500 ${isLight ? 'bg-white/40' : 'bg-black/30'}`} />
    </div>
  );
}
