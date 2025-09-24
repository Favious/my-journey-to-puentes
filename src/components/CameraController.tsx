'use client';

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { latLngToVector3, getGreatCirclePoints } from '../utils/sphereMath';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  distance: number;
}

interface CameraControllerProps {
  targetCity: City | null;
  bridgeCount: number;
  maxBridges: number;
  sanFrancisco: { lat: number; lng: number };
  isLocked: boolean;
  milestoneIndex: number;
  totalMilestones: number;
}

export default function CameraController({ 
  targetCity, 
  bridgeCount, 
  maxBridges, 
  sanFrancisco,
  isLocked,
  milestoneIndex,
  totalMilestones
}: CameraControllerProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPositionRef = useRef(new THREE.Vector3());
  const targetLookAtRef = useRef(new THREE.Vector3());
  const currentPositionRef = useRef(new THREE.Vector3());
  const currentLookAtRef = useRef(new THREE.Vector3());
  const lastProgressRef = useRef(0);
  const transitionSpeedRef = useRef(0.008); // Very slow for ultra-smooth movement
  const bridgePointsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  
  // Initialize camera position refs with current camera position to prevent reset to (0,0,0)
  useEffect(() => {
    if (camera) {
      currentPositionRef.current.copy(camera.position);
      targetPositionRef.current.copy(camera.position);
      currentLookAtRef.current.set(0, 0, 0); // Look at globe center
      targetLookAtRef.current.set(0, 0, 0);
    }
  }, []); // Only run once on mount
  
  // Initialize bridge points once when target city changes
  useEffect(() => {
    if (targetCity) {
      bridgePointsRef.current = getGreatCirclePoints(
        targetCity.lat, 
        targetCity.lng, 
        sanFrancisco.lat, 
        sanFrancisco.lng, 
        50 // Many more points for ultra-smooth interpolation
      );
    }
  }, [targetCity, sanFrancisco.lat, sanFrancisco.lng]);
  
  useFrame(() => {
    if (!targetCity || !controlsRef?.current || bridgePointsRef?.current?.length === 0) return;
    
    // Only apply camera following when locked
    if (isLocked) {
      // Calculate progress (0 to 1) with smoothing
      const milestoneProgress = totalMilestones > 0 ? (milestoneIndex + 1) / totalMilestones : 0;
      const bridgeProgress = maxBridges > 0 ? bridgeCount / maxBridges : 0;
      // Use the greater of the two to allow progress to continue even if bridges < milestones
      const rawProgress = Math.min(1, Math.max(bridgeProgress, milestoneProgress));
      
      // Only start camera movement if there's actual progress (milestones or bridges)
      // This prevents the camera from immediately moving away when home city is first added
      if (rawProgress > 0 || milestoneIndex > 0) {
        // Smooth progress changes to prevent jitter
        const progressDiff = rawProgress - lastProgressRef.current;
        const smoothedProgress = lastProgressRef.current + (progressDiff * 0.1); // Very gradual change
        lastProgressRef.current = smoothedProgress;
        
        // Calculate position along the bridge path with smooth interpolation
        const totalPoints = bridgePointsRef.current.length - 1;
        const exactIndex = smoothedProgress * totalPoints;
        const index1 = Math.floor(exactIndex);
        const index2 = Math.min(index1 + 1, totalPoints);
        const t = exactIndex - index1; // Interpolation factor
        
        const point1 = bridgePointsRef?.current?.[index1];
        const point2 = bridgePointsRef?.current?.[index2];
        
        if (point1 && point2) {
          // Smooth interpolation between two points
          const lat = point1.lat + (point2.lat - point1.lat) * t;
          const lng = point1.lng + (point2.lng - point1.lng) * t;
          const currentPos = latLngToVector3(lat, lng, 3.1);
          
          // Position camera slightly to the side to see bridge profile
          const cameraDistance = 3.0;
          const cameraOffset = new THREE.Vector3(0.2, 0.2, 0.4).multiplyScalar(cameraDistance);
          
          const newTargetPosition = new THREE.Vector3(
            currentPos.x + cameraOffset.x,
            currentPos.y + cameraOffset.y,
            currentPos.z + cameraOffset.z
          );
          
          // Very gradual target updates
          targetPositionRef.current.lerp(newTargetPosition, 0.05);
          targetLookAtRef.current.lerp(currentPos, 0.05);
        }
        
        // Ultra-smooth camera movement
        currentPositionRef.current.lerp(targetPositionRef.current, transitionSpeedRef.current);
        currentLookAtRef.current.lerp(targetLookAtRef.current, transitionSpeedRef.current);
        
        camera.position.copy(currentPositionRef.current);
        camera.lookAt(currentLookAtRef.current);
        
        // Update controls target very smoothly
        (controlsRef as any)?.current?.target?.lerp(currentLookAtRef.current, transitionSpeedRef?.current * 1.5);
      }
    }
  });
  
  return <OrbitControls 
    ref={controlsRef} 
    enableZoom={!isLocked} 
    enablePan={!isLocked} 
    enableRotate={!isLocked} 
  />;
}
