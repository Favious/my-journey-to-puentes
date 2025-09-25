'use client';

import { useState, useEffect } from 'react';

interface ScrambleTextProps {
  text: string;
  duration?: number;
  scrambleChars?: string;
  className?: string;
}

export default function ScrambleText({ 
  text, 
  duration = 1000, 
  scrambleChars = '0123456789',
  className = ''
}: ScrambleTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!text) return;

    setIsAnimating(true);
    setDisplayText('');

    const scrambleInterval = setInterval(() => {
      setDisplayText(prev => {
        // Generate random scramble text of the same length
        let scrambled = '';
        for (let i = 0; i < text.length; i++) {
          if (text[i] === ' ') {
            scrambled += ' ';
          } else if (text[i] === ',') {
            scrambled += ',';
          } else if (text[i] === 'k' || text[i] === 'm') {
            // Keep 'km' always visible
            scrambled += text[i];
          } else {
            scrambled += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          }
        }
        return scrambled;
      });
    }, 50); // Update every 50ms for smooth scrambling

    // Stop scrambling and show final text
    setTimeout(() => {
      clearInterval(scrambleInterval);
      setDisplayText(text);
      setIsAnimating(false);
    }, duration);

    return () => clearInterval(scrambleInterval);
  }, [text, duration, scrambleChars]);

  return (
    <span className={`${className} ${isAnimating ? 'animate-pulse' : ''}`}>
      {displayText}
    </span>
  );
}
