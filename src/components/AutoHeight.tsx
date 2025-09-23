'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface AutoHeightProps {
  children: React.ReactNode;
  transitionMs?: number;
  className?: string;
}

export default function AutoHeight({ children, transitionMs = 500, className }: AutoHeightProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string | number>('auto');
  const [isAnimating, setIsAnimating] = useState(false);

  // Measure on mount
  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    setHeight(el.scrollHeight);
    // After first paint, set to auto
    const t = window.setTimeout(() => setHeight('auto'), 0);
    return () => window.clearTimeout(t);
  }, []);

  // When children change, animate from current height to new height
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const currentHeight = el.getBoundingClientRect().height;
    const nextHeight = el.scrollHeight;

    // Set explicit current height to start transition
    setHeight(currentHeight);
    setIsAnimating(true);

    // In next frame set to target height to animate
    const r = requestAnimationFrame(() => {
      setHeight(nextHeight);
    });

    const end = window.setTimeout(() => {
      setIsAnimating(false);
      setHeight('auto');
    }, transitionMs + 50);

    return () => {
      cancelAnimationFrame(r);
      window.clearTimeout(end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, transitionMs]);

  return (
    <div
      style={{
        height,
        transition: isAnimating ? `height ${transitionMs}ms ease-in-out` : undefined,
        overflow: 'hidden',
        willChange: 'height',
      }}
      className={className}
    >
      <div ref={wrapperRef}>
        {children}
      </div>
    </div>
  );
}


