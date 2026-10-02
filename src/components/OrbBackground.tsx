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

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
      angle += 0.008; // smooth rotation speed
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Responsive orbit radii
      const rx = Math.min(width * 0.38, 380);
      const ry = Math.min(height * 0.28, 260);
      const orbRadius = Math.max(70, Math.min(width * 0.12, 130));

      const tilt = -Math.PI / 10; // -18 degree aesthetic tilt

      // Orb 1: Cyan / Light Blue (голубой)
      const u1 = Math.sin(angle) * rx;
      const v1 = Math.cos(angle) * ry;
      const x1 = cx + u1 * Math.cos(tilt) - v1 * Math.sin(tilt);
      const y1 = cy + u1 * Math.sin(tilt) + v1 * Math.cos(tilt);

      // Orb 2: Violet / Purple (фиолетовый)
      // Moving along mirror path so they intersect and pass straight through each other
      const u2 = Math.sin(-angle) * rx;
      const v2 = Math.cos(angle) * ry;
      const x2 = cx + u2 * Math.cos(tilt) - v2 * Math.sin(tilt);
      const y2 = cy + u2 * Math.sin(tilt) + v2 * Math.cos(tilt);

      ctx.save();
      // 'screen' or 'lighter' allows the spheres to pass seamlessly through each other with brilliant luminous blend
      ctx.globalCompositeOperation = 'screen';

      // 1. Draw Cyan Orb (Голубой шарик)
      const cyanGrad = ctx.createRadialGradient(x1, y1, 0, x1, y1, orbRadius);
      cyanGrad.addColorStop(0, 'rgba(240, 253, 255, 0.95)');
      cyanGrad.addColorStop(0.2, 'rgba(56, 189, 248, 0.85)');
      cyanGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.5)');
      cyanGrad.addColorStop(0.8, 'rgba(2, 132, 199, 0.18)');
      cyanGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');

      ctx.beginPath();
      ctx.arc(x1, y1, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = cyanGrad;
      ctx.fill();

      // Outer ambient glow for Cyan
      const cyanGlow = ctx.createRadialGradient(x1, y1, 0, x1, y1, orbRadius * 1.8);
      cyanGlow.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      cyanGlow.addColorStop(0.6, 'rgba(14, 165, 233, 0.08)');
      cyanGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(x1, y1, orbRadius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = cyanGlow;
      ctx.fill();

      // 2. Draw Violet Orb (Фиолетовый шарик)
      const violetGrad = ctx.createRadialGradient(x2, y2, 0, x2, y2, orbRadius);
      violetGrad.addColorStop(0, 'rgba(250, 245, 255, 0.95)');
      violetGrad.addColorStop(0.2, 'rgba(192, 132, 252, 0.85)');
      violetGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)');
      violetGrad.addColorStop(0.8, 'rgba(126, 34, 206, 0.18)');
      violetGrad.addColorStop(1, 'rgba(126, 34, 206, 0)');

      ctx.beginPath();
      ctx.arc(x2, y2, orbRadius, 0, Math.PI * 2);
      ctx.fillStyle = violetGrad;
      ctx.fill();

      // Outer ambient glow for Violet
      const violetGlow = ctx.createRadialGradient(x2, y2, 0, x2, y2, orbRadius * 1.8);
      violetGlow.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
      violetGlow.addColorStop(0.6, 'rgba(126, 34, 206, 0.08)');
      violetGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(x2, y2, orbRadius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = violetGlow;
      ctx.fill();

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
      className="fixed inset-0 pointer-events-none z-0 opacity-40 mix-blend-screen transition-opacity duration-1000"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
