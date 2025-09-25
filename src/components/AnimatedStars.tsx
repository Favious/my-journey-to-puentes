'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AnimatedStarsProps {
  count?: number;
  radius?: number;
  speed?: number;
  color?: number | string;
}

export default function AnimatedStars({ 
  count = 1000, 
  radius = 10, 
  speed = 0.5,
  color = 0xffffff
}: AnimatedStarsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);

  // Generate random star positions
  const starPositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Generate random position on sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Random colors (mostly white with some blue/yellow tints)
      const colorVariation = Math.random();
      if (colorVariation < 0.7) {
        // White stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorVariation < 0.85) {
        // Blue stars
        colors[i * 3] = 0.7;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1;
      } else {
        // Yellow stars
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 0.7;
      }
      
      // Random sizes
      scales[i] = Math.random() * 0.02 + 0.005;
    }
    
    return { positions, colors, scales };
  }, [count, radius]);

  // Animation loop
  useFrame((state, delta) => {
    if (meshRef.current) {
      timeRef.current += delta * speed;
      
      // Update each star's opacity for twinkling effect
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      const position = new THREE.Vector3();
      
      for (let i = 0; i < count; i++) {
        // Get base position
        position.set(
          starPositions.positions[i * 3],
          starPositions.positions[i * 3 + 1],
          starPositions.positions[i * 3 + 2]
        );
        
        // Add twinkling effect with sine wave
        const twinkle = Math.sin(timeRef.current * 2 + i * 0.1) * 0.3 + 0.7;
        const currentScale = starPositions.scales[i] * twinkle;
        
        scale.set(currentScale, currentScale, currentScale);
        
        // Create transformation matrix
        matrix.compose(position, quaternion, scale);
        meshRef.current.setMatrixAt(i, matrix);
      }
      
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial 
        color={color}
        transparent
        opacity={0.8}
        vertexColors={false}
      />
    </instancedMesh>
  );
}
