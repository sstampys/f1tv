'use client';

import { memo, useEffect, useRef } from 'react';

interface StarColor {
  r: number;
  g: number;
  b: number;
}

interface Star {
  orbital: number;
  opacity: number;
  position: { x: number; y: number };
  originPosition: { x: number; y: number };
  rotation: number;
  realPosition: { x: number; y: number };
  rSpeed: number;
  waveSpeed1: number;
  waveSpeed2: number;
  wave1: number;
  wave2: number;
  id: number;
}

interface StarfieldProps {
  starCount?: number;
  waveFrequency?: number;
  starEscapeWidth?: number;
  voidWidth?: number;
  starColor?: StarColor;
  maxOpacity?: number;
  rotationSpeed?: number;
  waveSpeed?: number;
  className?: string;
}

const Starfield = memo(({
  starCount = 25000,
  waveFrequency = 20,
  starEscapeWidth = 255,
  voidWidth = 100,
  starColor = { r: 168, g: 85, b: 247 },
  maxOpacity = 255,
  rotationSpeed = 0.0005,
  waveSpeed = 0.01,
  className,
}: StarfieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let size = { x: 0, y: 0 };
    let imagedata: ImageData;
    let data: Uint32Array;
    let startTime = Date.now();
    let currentTime = 0;
    // Orbit radius scaled to the viewport so stars fill the whole screen
    // instead of clustering in a small ring around the center.
    let escape = starEscapeWidth;
    let raf = 0;

    const rotate = (cx: number, cy: number, x: number, y: number, radians: number) => {
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const nx = cos * (x - cx) + sin * (y - cy) + cx;
      const ny = cos * (y - cy) - sin * (x - cx) + cy;
      return { x: nx, y: ny };
    };

    const createStar = () => {
      const star = {} as Star;
      const rands = [
        Math.random() * (escape / 2) + 1,
        Math.random() * (escape / 2) + escape,
      ];
      star.orbital = rands.reduce((p, c) => p + c, 0) / rands.length;
      star.opacity = Math.max(0, Math.floor(
        (1 - star.orbital / escape) * maxOpacity + Math.random() * 80
      ));
      star.position = {
        x: size.x / 2,
        y: size.y / 2 + star.orbital,
      };
      star.originPosition = { ...star.position };
      star.rotation = Math.PI * (Math.random() * 2);
      star.position = rotate(
        size.x / 2,
        size.y / 2,
        star.position.x,
        star.position.y,
        star.rotation
      );
      star.realPosition = { ...star.position };
      star.rSpeed = Math.random() * rotationSpeed + star.opacity / 20000;
      star.waveSpeed1 = Math.random() * waveSpeed;
      star.waveSpeed2 = Math.random() * waveSpeed;
      star.wave1 = Math.sin(currentTime * star.waveSpeed1) * waveFrequency;
      star.wave2 = Math.sin(currentTime * star.waveSpeed2) * waveFrequency;
      star.id = starsRef.current.length;
      starsRef.current.push(star);
    };

    const drawStar = (star: Star) => {
      // Clear previous pixel
      const prevIndex =
        Math.floor(star.realPosition.y + star.wave1) * size.x +
        Math.floor(star.realPosition.x + star.wave2);
      if (prevIndex >= 0 && prevIndex < data.length) {
        data[prevIndex] = 0;
      }

      // Update star properties
      star.wave1 = Math.sin(currentTime * star.waveSpeed1) * waveFrequency;
      star.wave2 = Math.sin(currentTime * star.waveSpeed2) * waveFrequency;
      star.realPosition = rotate(
        size.x / 2,
        size.y / 2,
        star.position.x,
        star.position.y,
        star.rSpeed * currentTime
      );
      star.opacity = Math.max(0, Math.floor(
        (1 - star.orbital / escape) * maxOpacity + Math.random() * 80
      ));

      // Draw new pixel
      const index =
        Math.floor(star.realPosition.y + star.wave1) * size.x +
        Math.floor(star.realPosition.x + star.wave2);
      if (index >= 0 && index < data.length) {
        data[index] =
          ((star.opacity & 255) << 24) | // alpha
          (starColor.b << 16) | // blue
          (starColor.g << 8) | // green
          starColor.r; // red
      }
    };

    const render = () => {
      currentTime = (Date.now() - startTime) / 10;

      context.fillRect(0, 0, size.x, size.y);

      // Create new stars
      if (starsRef.current.length < starCount) {
        for (let i = 0; i < Math.min(100, starCount - starsRef.current.length); i++) {
          createStar();
        }
      }

      // Draw all stars
      for (const star of starsRef.current) {
        drawStar(star);
      }

      // Update canvas
      context.putImageData(imagedata, 0, 0);

      // Continue animation
      raf = requestAnimationFrame(render);
    };

    const setSize = () => {
      size.x = container.clientWidth;
      size.y = container.clientHeight;
      canvas.width = size.x;
      canvas.height = size.y;

      escape = Math.max(starEscapeWidth, Math.min(size.x, size.y) / 2);

      // Initialize pixel data
      imagedata = context.createImageData(size.x, size.y);
      data = new Uint32Array(imagedata.data.buffer);
      starsRef.current = []; // Reset stars on resize
    };

    // Initialize
    setSize();
    raf = requestAnimationFrame(render);

    // Handle resize
    const resizeHandler = () => setSize();
    window.addEventListener('resize', resizeHandler);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', resizeHandler);
      cancelAnimationFrame(raf);
    };
  }, [starCount, waveFrequency, starEscapeWidth, voidWidth, starColor, maxOpacity, rotationSpeed, waveSpeed]);

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} />
    </div>
  );
});

export { Starfield };
