import React, { useEffect, useRef } from 'react';

export default function OrbBackground() {
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

    // Small stardust particles trailing the orbs
    const trail1: { x: number; y: number; alpha: number; size: number }[] = [];
    const trail2: { x: number; y: number; alpha: number; size: number }[] = [];

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
      angle += 0.009; // smooth dynamic orbit rotation
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Orbit size adapted to viewport
      const rx = Math.min(width * 0.38, 420);
      const ry = Math.min(height * 0.30, 280);
      const orbRadius = Math.max(65, Math.min(width * 0.09, 110));

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

      // Add trail history
      trail1.push({ x: x1, y: y1, alpha: 0.6, size: orbRadius * 0.4 });
      trail2.push({ x: x2, y: y2, alpha: 0.6, size: orbRadius * 0.4 });
      if (trail1.length > 22) trail1.shift();
      if (trail2.length > 22) trail2.shift();

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // 1. Draw Cyan Trails
      for (let i = 0; i < trail1.length; i++) {
        const pt = trail1[i];
        const progress = i / trail1.length;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * progress, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${0.08 * progress})`;
        ctx.fill();
      }

      // 2. Draw Violet Trails
      for (let i = 0; i < trail2.length; i++) {
        const pt = trail2[i];
        const progress = i / trail2.length;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * progress, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${0.08 * progress})`;
        ctx.fill();
      }

      // 3. Render Cyan Sphere (Голубой светящийся шар)
      // Wide atmospheric aura
      const aura1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, orbRadius * 2.8);
      aura1.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
      aura1.addColorStop(0.4, 'rgba(14, 165, 233, 0.15)');
      aura1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(x1, y1, orbRadius * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = aura1;
      ctx.fill();

      // Core 3D Sphere body
      const grad1 = ctx.createRadialGradient(
        x1 - orbRadius * 0.3,
        y1 - orbRadius * 0.3,
        orbRadius * 0.05,
        x1,
        y1,
        orbRadius
      );
      grad1.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad1.addColorStop(0.2, 'rgba(186, 230, 253, 0.95)');
      grad1.addColorStop(0.5, 'rgba(56, 189, 248, 0.85)');
      grad1.addColorStop(0.8, 'rgba(2, 132, 199, 0.6)');
      grad1.addColorStop(1, 'rgba(3, 105, 161, 0.1)');
      ctx.beginPath();
      ctx.arc(x1, y1, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad1;
      ctx.fill();

      // 4. Render Violet Sphere (Фиолетовый светящийся шар)
      // Wide atmospheric aura
      const aura2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, orbRadius * 2.8);
      aura2.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
      aura2.addColorStop(0.4, 'rgba(126, 34, 206, 0.15)');
      aura2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(x2, y2, orbRadius * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = aura2;
      ctx.fill();

      // Core 3D Sphere body
      const grad2 = ctx.createRadialGradient(
        x2 - orbRadius * 0.3,
        y2 - orbRadius * 0.3,
        orbRadius * 0.05,
        x2,
        y2,
        orbRadius
      );
      grad2.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad2.addColorStop(0.2, 'rgba(243, 232, 255, 0.95)');
      grad2.addColorStop(0.5, 'rgba(192, 132, 252, 0.85)');
      grad2.addColorStop(0.8, 'rgba(147, 51, 234, 0.6)');
      grad2.addColorStop(1, 'rgba(107, 33, 168, 0.1)');
      ctx.beginPath();
      ctx.arc(x2, y2, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad2;
      ctx.fill();

      // Intersection luminous burst when passing through each other
      const dist = Math.hypot(x1 - x2, y1 - y2);
      if (dist < orbRadius * 1.5) {
        const overlapFactor = 1 - dist / (orbRadius * 1.5);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const burstGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, orbRadius * 1.6);
        burstGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * overlapFactor})`);
        burstGrad.addColorStop(0.3, `rgba(216, 180, 254, ${0.7 * overlapFactor})`);
        burstGrad.addColorStop(0.6, `rgba(125, 211, 252, ${0.4 * overlapFactor})`);
        burstGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(midX, midY, orbRadius * 1.6, 0, Math.PI * 2);
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 mix-blend-screen"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
