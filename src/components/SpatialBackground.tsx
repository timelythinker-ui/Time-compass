import React, { useEffect, useRef } from 'react';

interface SpatialBackgroundProps {
  darkMode: boolean;
}

export const SpatialBackground: React.FC<SpatialBackgroundProps> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking for subtle 3D parallax
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetParallaxX = 0;
    let targetParallaxY = 0;
    let currentParallaxX = 0;
    let currentParallaxY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetParallaxX = (mouseX - width / 2) / (width / 2);
      targetParallaxY = (mouseY - height / 2) / (height / 2);
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Layer 1: Sparse atmospheric dust & depth particles
    const isMobile = width < 768;
    const particleCount = isMobile ? 18 : 38;
    const particles = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 0.8 + 0.2, // depth factor
      radius: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.15,
      speedY: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.35 + 0.1,
      colorType: Math.random() > 0.6 ? 'blue' : Math.random() > 0.5 ? 'teal' : 'slate',
    }));

    // Layer 2: Orbital Rings (elliptical 3D trajectories tilted in space)
    const ringAngle = { val: 0 };

    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Smooth parallax interpolation
      currentParallaxX += (targetParallaxX - currentParallaxX) * 0.03;
      currentParallaxY += (targetParallaxY - currentParallaxY) * 0.03;

      if (!prefersReducedMotion) {
        ringAngle.val += delta * 0.04; // very slow, calm orbital rotation
      }

      ctx.clearRect(0, 0, width, height);

      // Hero Center anchor (where the compass and visual energy sit)
      const heroCenterX = width > 1024 ? width * 0.72 : width * 0.5;
      const heroCenterY = isMobile ? height * 0.45 : height * 0.38;

      // Applied Parallax offsets based on layers
      const parallaxFarX = currentParallaxX * 12;
      const parallaxFarY = currentParallaxY * 12;
      const parallaxMidX = currentParallaxX * 24;
      const parallaxMidY = currentParallaxY * 24;
      const parallaxNearX = currentParallaxX * 40;
      const parallaxNearY = currentParallaxY * 40;

      /* =========================================================================
         LAYER 1 (FAR): Soft ambient sky depth gradients & sparse drifting particles
         ========================================================================= */
      
      // Soft radial atmosphere behind the hero compass region (Sky Blue / Light Blue in Light Mode)
      const ambientGlow = ctx.createRadialGradient(
        heroCenterX + parallaxFarX,
        heroCenterY + parallaxFarY,
        20,
        heroCenterX + parallaxFarX,
        heroCenterY + parallaxFarY,
        isMobile ? 280 : 540
      );

      if (darkMode) {
        ambientGlow.addColorStop(0, 'rgba(76, 141, 255, 0.08)');
        ambientGlow.addColorStop(0.4, 'rgba(37, 199, 179, 0.03)');
        ambientGlow.addColorStop(1, 'rgba(8, 13, 24, 0)');
      } else {
        // Welcoming Sky Blue / Soft Azure atmosphere in light mode
        ambientGlow.addColorStop(0, 'rgba(186, 215, 253, 0.28)'); // Sky blue tint
        ambientGlow.addColorStop(0.35, 'rgba(219, 234, 254, 0.16)');
        ambientGlow.addColorStop(0.7, 'rgba(204, 251, 241, 0.08)'); // Gentle teal hint
        ambientGlow.addColorStop(1, 'rgba(246, 248, 252, 0)');
      }

      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);

      // Soft Floating 3D Spherical Forms (Gentle ambient depth orbs)
      const sphereCount = isMobile ? 2 : 4;
      const spheres = [
        { xRatio: 0.85, yRatio: 0.25, r: isMobile ? 60 : 120, offset: 0 },
        { xRatio: 0.15, yRatio: 0.65, r: isMobile ? 80 : 160, offset: 2.1 },
        { xRatio: 0.75, yRatio: 0.78, r: isMobile ? 50 : 100, offset: 4.2 },
        { xRatio: 0.22, yRatio: 0.18, r: isMobile ? 45 : 90, offset: 1.2 },
      ].slice(0, sphereCount);

      spheres.forEach((s) => {
        const sx = width * s.xRatio + currentParallaxX * 15 + Math.sin(ringAngle.val * 0.2 + s.offset) * 12;
        const sy = height * s.yRatio + currentParallaxY * 15 + Math.cos(ringAngle.val * 0.2 + s.offset) * 10;
        
        const sphereGrad = ctx.createRadialGradient(
          sx - s.r * 0.3,
          sy - s.r * 0.3,
          s.r * 0.1,
          sx,
          sy,
          s.r
        );

        if (darkMode) {
          sphereGrad.addColorStop(0, 'rgba(76, 141, 255, 0.04)');
          sphereGrad.addColorStop(0.6, 'rgba(37, 199, 179, 0.015)');
          sphereGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          sphereGrad.addColorStop(0, 'rgba(191, 219, 254, 0.18)'); // Soft sky blue orb
          sphereGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.09)');
          sphereGrad.addColorStop(1, 'rgba(246, 248, 252, 0)');
        }

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();
      });

      // Render Floating Atmospheric Micro-Particles
      particles.forEach((p) => {
        if (!prefersReducedMotion) {
          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
        }

        const px = p.x + currentParallaxX * 18 * p.z;
        const py = p.y + currentParallaxY * 18 * p.z;

        ctx.beginPath();
        ctx.arc(px, py, p.radius * p.z, 0, Math.PI * 2);

        let color = '';
        if (p.colorType === 'blue') {
          color = darkMode
            ? `rgba(76, 141, 255, ${p.opacity * 0.6})`
            : `rgba(52, 120, 246, ${p.opacity * 0.45})`;
        } else if (p.colorType === 'teal') {
          color = darkMode
            ? `rgba(37, 199, 179, ${p.opacity * 0.6})`
            : `rgba(32, 184, 166, ${p.opacity * 0.45})`;
        } else {
          color = darkMode
            ? `rgba(160, 175, 200, ${p.opacity * 0.3})`
            : `rgba(148, 163, 184, ${p.opacity * 0.25})`;
        }

        ctx.fillStyle = color;
        ctx.fill();
      });

      /* =========================================================================
         LAYER 2 (MID): Translucent 3D Navigational Orbital Rings & Ellipses
         ========================================================================= */
      ctx.save();
      ctx.translate(heroCenterX + parallaxMidX, heroCenterY + parallaxMidY);

      // Colors for curves
      const strokeBlue = darkMode ? 'rgba(76, 141, 255, ' : 'rgba(52, 120, 246, ';
      const strokeTeal = darkMode ? 'rgba(37, 199, 179, ' : 'rgba(32, 184, 166, ';
      const strokeSlate = darkMode ? 'rgba(148, 163, 184, ' : 'rgba(100, 116, 139, ';

      // Orbital Ring 1: Wide shallow ellipse (representing broad possibilities)
      ctx.save();
      ctx.rotate(-0.38 + Math.sin(ringAngle.val * 0.6) * 0.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, isMobile ? 180 : 340, isMobile ? 65 : 120, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `${strokeBlue}${darkMode ? '0.07' : '0.05'})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 12]);
      ctx.stroke();
      ctx.restore();

      // Orbital Ring 2: Opposing tilted ellipse with teal accent
      ctx.save();
      ctx.rotate(0.55 + Math.cos(ringAngle.val * 0.5) * 0.04);
      ctx.beginPath();
      ctx.ellipse(0, 0, isMobile ? 220 : 420, isMobile ? 80 : 150, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `${strokeTeal}${darkMode ? '0.06' : '0.04'})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 16]);
      ctx.stroke();
      ctx.restore();

      // Orbital Ring 3: Delicate inner navigation trajectory
      ctx.save();
      ctx.rotate(ringAngle.val * 0.3);
      ctx.beginPath();
      ctx.ellipse(0, 0, isMobile ? 140 : 250, isMobile ? 50 : 90, 0, 0, Math.PI * 1.6);
      ctx.strokeStyle = `${strokeSlate}${darkMode ? '0.05' : '0.04'})`;
      ctx.lineWidth = 0.75;
      ctx.setLineDash([1, 8]);
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // restore from heroCenter translation

      /* =========================================================================
         LAYER 3 (NEAR): Subtle floating directional nodes & micro coordinate marks
         ========================================================================= */
      // 4 tiny mathematical waypoint markers placed far in the periphery
      const waypoints = [
        { angle: ringAngle.val * 0.4 + 0.5, dist: isMobile ? 160 : 310, label: '01', type: 'blue' },
        { angle: -ringAngle.val * 0.3 + 2.4, dist: isMobile ? 190 : 380, label: '02', type: 'teal' },
        { angle: ringAngle.val * 0.2 + 4.2, dist: isMobile ? 170 : 340, label: '03', type: 'slate' },
      ];

      waypoints.forEach((wp) => {
        const wx = heroCenterX + parallaxNearX + Math.cos(wp.angle) * wp.dist;
        const wy = heroCenterY + parallaxNearY + Math.sin(wp.angle) * (wp.dist * 0.42);

        // Tiny crosshair marker
        ctx.save();
        ctx.translate(wx, wy);

        const nodeColor = wp.type === 'blue'
          ? (darkMode ? 'rgba(76, 141, 255, 0.25)' : 'rgba(52, 120, 246, 0.22)')
          : wp.type === 'teal'
          ? (darkMode ? 'rgba(37, 199, 179, 0.25)' : 'rgba(32, 184, 166, 0.22)')
          : (darkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.15)');

        // Small 4px crosshair
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.lineTo(3, 0);
        ctx.moveTo(0, -3);
        ctx.lineTo(0, 3);
        ctx.stroke();

        // Small concentric point
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        ctx.restore();
      });

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [darkMode]);

  return (
    <div
      id="spatial-3d-background"
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        opacity: darkMode ? 0.85 : 0.75,
        transition: 'opacity 0.4s ease',
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          filter: 'blur(0.2px)', // extremely subtle atmospheric softness
        }}
      />
    </div>
  );
};
