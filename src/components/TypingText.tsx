'use client';

import { useEffect, useState } from 'react';

interface TypingTextProps {
  text: string;
  speedMs?: number; // milliseconds per character
  className?: string;
  showCursor?: boolean;
}

export default function TypingText({ text, speedMs = 18, className, showCursor = true }: TypingTextProps) {
  const [displayed, setDisplayed] = useState<string>('');

  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let index = 0;
    const intervalId = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(intervalId);
      }
    }, Math.max(5, speedMs));
    return () => window.clearInterval(intervalId);
  }, [text, speedMs]);

  return (
    <span className={className}>
      {displayed}
      {showCursor && (
        <span className="inline-block w-[0.6ch] ml-[0.1ch] align-baseline animate-blink select-none">|</span>
      )}
    </span>
  );
}


