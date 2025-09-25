'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import AnimatedStars from './AnimatedStars';
import { useCallback, useMemo, useRef } from 'react';
import { COUNTRY_FLAG_COLORS, getFlagForCountry } from '../utils/countryFlags';
import { generateNameBasedColors } from '../utils/nameBasedColors';
import * as THREE from 'three';

function EarthCamera() {
  const { camera } = useThree();
  
  useFrame((state) => {
    // Simulate Earth's rotation - very slow rotation around Y axis
    const time = state.clock.getElapsedTime();
    const rotationSpeed = 0.05; // Slow rotation like Earth
    
    // Rotate camera around Y axis to simulate Earth's rotation
    camera.position.x = Math.sin(time * rotationSpeed) * 0.2;
    camera.position.z = Math.cos(time * rotationSpeed) * 0.2;
    camera.position.y = 0;
    
    // Look at the center to maintain the star field view
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

interface CheckSectionProps {
  id?: string;
  homeCountry?: string;
  fullName?: string;
  coverImageUrl?: string;
}

export default function CheckSection({ id = 'check-section', homeCountry, fullName, coverImageUrl }: CheckSectionProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Get country flag colors
  const [flagC1, flagC2, flagC3] = useMemo(() => {
    if (homeCountry && COUNTRY_FLAG_COLORS[homeCountry]) {
      const flagColors = COUNTRY_FLAG_COLORS[homeCountry];
      console.log(`Using flag colors from ${homeCountry}:`, flagColors);
      return flagColors;
    }
    
    // Fallback to United States flag colors if no country
    const defaultFlagColors = COUNTRY_FLAG_COLORS['United States'] || ['#B22234', '#3C3B6E', '#FFFFFF'];
    console.log(`Using default flag colors (US):`, defaultFlagColors);
    return defaultFlagColors;
  }, [homeCountry]);

  // Helper function to handle white colors
  const handleWhiteColor = (color: string, index: number): string => {
    if (color.toUpperCase() === '#FFFFFF' || color.toUpperCase() === '#FFF') {
      // Replace white with a more suitable color based on the name and index
      if (fullName && fullName.trim().length > 0) {
        const nameHash = fullName.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
        const seed = nameHash + index;
        
        // Generate a subtle color variation instead of white
        const hue = (seed * 137.5) % 360; // Golden angle for good distribution
        const saturation = 60 + (seed % 40); // 60-100% saturation
        const lightness = 45 + (seed % 20); // 45-65% lightness
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      }
      
      // Fallback: use a subtle gray instead of white
      return '#E8E8E8';
    }
    return color;
  };

  // Generate name-based design pattern (deterministic)
  const [c1, c2, c3] = useMemo(() => {
    if (fullName && fullName.trim().length > 0) {
      // Generate name-based pattern but apply country flag colors
      const namePattern = generateNameBasedColors(fullName);
      console.log(`Using name-based pattern for ${fullName}:`, namePattern);
      
      // Apply the flag colors but keep the name-based pattern structure
      // We'll use the flag colors but in the order determined by the name
      let [flag1, flag2, flag3] = [flagC1, flagC2, flagC3];
      
      // Handle white colors before applying the pattern
      flag1 = handleWhiteColor(flag1, 1);
      flag2 = handleWhiteColor(flag2, 2);
      flag3 = handleWhiteColor(flag3, 3);
      
      // Use name pattern to determine which flag color goes where
      const nameHash = fullName.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
      const colorOrder = nameHash % 6; // 6 possible arrangements
      
      let result;
      switch (colorOrder) {
        case 0: result = [flag1, flag2, flag3];
        case 1: result = [flag1, flag3, flag2];
        case 2: result = [flag2, flag1, flag3];
        case 3: result = [flag2, flag3, flag1];
        case 4: result = [flag3, flag1, flag2];
        case 5: result = [flag3, flag2, flag1];
        default: result = [flag1, flag2, flag3];
      }
      
      console.log(`Final colors after white handling:`, result);
      return result;
    }
    
    // If no name, just use flag colors in default order (with white handling)
    const processedFlag1 = handleWhiteColor(flagC1, 1);
    const processedFlag2 = handleWhiteColor(flagC2, 2);
    const processedFlag3 = handleWhiteColor(flagC3, 3);
    
    console.log(`Using flag colors in default order (processed):`, [processedFlag1, processedFlag2, processedFlag3]);
    return [processedFlag1, processedFlag2, processedFlag3];
  }, [fullName, flagC1, flagC2, flagC3]);

  // Use the same colors for both card and mesh background
  const [meshC1, meshC2, meshC3] = [c1, c2, c3];

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1

    const rotateY = (px - 0.5) * 40; // deg
    const rotateX = (0.5 - py) * 40; // deg

    const bgPosX = px * 100;
    const bgPosY = py * 100;

    const update = () => {
      card.style.setProperty('--rx', `${rotateX}deg`);
      card.style.setProperty('--ry', `${rotateY}deg`);
      card.style.setProperty('--bgx', `${bgPosX}%`);
      card.style.setProperty('--bgy', `${bgPosY}%`);
      card.classList.add('active');
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);
  }, []);

  const handlePointerLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const update = () => {
      card.style.setProperty('--rx', `0deg`);
      card.style.setProperty('--ry', `0deg`);
      card.classList.remove('active');
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(update);
  }, []);

  return (
    <div id={id} className="relative w-full h-screen" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }} gl={{ antialias: true, alpha: true }}>
          <EarthCamera />
          <AnimatedStars count={1200} radius={12} speed={0.1} color={0x000000} />
        </Canvas>
      </div>
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="text-center px-6">
          <h2 className="text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-bridge)' }}>Puentes Official Pass</h2>
          <div className="flex items-center justify-center">
            <div
              ref={cardRef}
              className="holo-card"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
              role="img"
              aria-label="Holographic collectible card"
              style={{
                // Inject holographic colors via CSS variables (name-based pattern with flag colors)
                ['--holo-color-1' as any]: c1,
                ['--holo-color-2' as any]: c2,
                ['--holo-color-3' as any]: c3,
                // Inject same colors for mesh background
                ['--flag-color-1' as any]: meshC1,
                ['--flag-color-2' as any]: meshC2,
                ['--flag-color-3' as any]: meshC3,
              }}
            >
              {/* Border holo layer via ::before (see globals.css) */}
              <div className="holo-surface">
                <div className="holo-content">
                  <div className="holo-top">
                    {coverImageUrl ? (
                      <div className="holo-profile-image">
                        <img 
                          src={coverImageUrl} 
                          alt="Profile" 
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <span className="holo-badge">RARE</span>
                    )}
                    <div className="flex items-center gap-2">
                      {homeCountry && (
                        <span className="text-base md:text-lg" role="img" aria-label={`Flag of ${homeCountry}`}>
                          {getFlagForCountry(homeCountry) || '🌍'}
                        </span>
                      )}
                      <span className="holo-title text-sm md:text-lg">{fullName}</span>
                    </div>
                  </div>
                  
                  <div className="holo-image">
                    <img
                      src="/goldenGateWatermarkOG.png"
                      alt="Golden Gate watermark"
                      className="holo-fallback"
                    />
                    <div className="holo-image-overlay" />
                    <div className="holo-image-shade" />
                  </div>
                  <div className="holo-footer">
                    <span className="holo-desc">Bridge the gaps. Keep going.</span>
                    <span className="holo-num">#27</span>
                  </div>
                </div>
                <div className="holo-sparkles" />
              </div>
            </div>
          </div>
          <p className="hidden md:block text-sm mt-8 opacity-70">Hover and move your mouse to see the holographic effect.</p>
        </div>
      </div>
    </div>
  );
}


