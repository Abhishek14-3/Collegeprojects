import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  colorIndex: number;
  alpha: number;
}

export const NeuralConstellation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic theme-aware palette (Index 0: TF-IDF, 1: Hybrid, 2: RAKE, 3: TextRank)
    const darkPalette = [
      '56, 189, 248',  // Glowing Sky
      '129, 140, 248', // Glowing Indigo
      '168, 85, 247',  // Glowing Purple
      '52, 211, 153',  // Glowing Emerald
    ];

    const lightPalette = [
      '2, 112, 199',   // Deep Cobalt Blue
      '67, 56, 202',   // Deep Indigo
      '126, 34, 206',  // Deep Royal Purple
      '5, 150, 105',   // Deep Emerald Teal
    ];

    // Responsive particle count based on screen width
    const particleCount = Math.floor(Math.min(width, 1600) / 24);
    const maxDistance = 145;

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 1.8, // 1.8px to 3.3px for crisp high visibility
        colorIndex: Math.floor(Math.random() * 4),
        alpha: Math.random() * 0.4 + 0.6,
      });
    }

    // Track mouse for subtle magnetic proximity interaction
    let mouse = { x: -1000, y: -1000, radius: 170 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    const isDark = () => document.documentElement.classList.contains('dark');

    // Main Animation Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const dark = isDark();
      const currentPalette = dark ? darkPalette : lightPalette;

      const nodeAlphaScale = dark ? 0.85 : 1.0;
      const edgeAlphaMultiplier = dark ? 0.28 : 0.38; // High contrast in light mode
      const mouseAlphaMultiplier = dark ? 0.45 : 0.6;

      // Update particle positions & bounce off bounds
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const colorStr = currentPalette[p.colorIndex];

        // Render Particle Node (Core + Halo)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorStr}, ${p.alpha * nodeAlphaScale})`;
        ctx.fill();

        // Draw connecting edges between nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const edgeAlpha = (1 - dist / maxDistance) * edgeAlphaMultiplier;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${colorStr}, ${edgeAlpha})`;
            ctx.lineWidth = dark ? 0.9 : 1.1;
            ctx.stroke();
          }
        }

        // Draw connections to mouse cursor if nearby
        const mouseDx = p.x - mouse.x;
        const mouseDy = p.y - mouse.y;
        const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        if (mouseDist < mouse.radius) {
          const mouseAlpha = (1 - mouseDist / mouse.radius) * mouseAlphaMultiplier;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${colorStr}, ${mouseAlpha})`;
          ctx.lineWidth = dark ? 1.0 : 1.3;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none select-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Interactive Constellation Graph Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full"
      />

      {/* Ambient Neural Aura Glow Orbs (Tailored for both Light & Dark themes) */}
      <div className="absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-sky-400/20 dark:bg-brand-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-purple-400/20 dark:bg-purple-500/15 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-[32rem] h-[32rem] rounded-full bg-emerald-400/18 dark:bg-emerald-500/10 blur-[130px] pointer-events-none" />
    </div>
  );
};
