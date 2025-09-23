'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import AnimatedStars from '@/components/AnimatedStars';

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

export default function Home() {
  return (
    <div className="h-screen w-full flex items-center justify-center flex-col gap-3 relative" style={{ backgroundColor: "#16234d"}}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      >
        <EarthCamera />
        <AnimatedStars count={1200} radius={12} speed={0.1} />
      </Canvas>
      <div className="relative z-10">
        <h1 className="text-8xl font-bold text-white text-center tracking-wider" style={{ fontFamily: 'var(--font-bridge)'}}>Journeys to Puentes</h1>
        <h1 className="text-4xl text-white/50 text-center">Successful Stories</h1>
      </div>
    </div>
  );
}
