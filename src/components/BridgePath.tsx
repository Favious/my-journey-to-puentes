'use client';

import { getGreatCirclePoints, greatCircleDistance, latLngToVector3, calculateBearing } from '../utils/sphereMath';
import { Line } from '@react-three/drei';
import { useMemo, useRef, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBridgeModel } from './BridgeModelLoader';

interface BridgePathProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  bridgeCount?: number;
  color?: string;
  onMaxBridgesCalculated?: (maxBridges: number) => void;
}

function BridgePath({ 
  startLat, 
  startLng, 
  endLat, 
  endLng, 
  bridgeCount = 0,
  color = '#AA0000',
  onMaxBridgesCalculated
}: BridgePathProps) {
  // Use the shared bridge model
  const { bridgeModel, isLoading } = useBridgeModel();
  
  // Don't render anything if the model isn't loaded yet
  if (isLoading || !bridgeModel) {
    return null;
  }

  // Animated Bridge Component
  function AnimatedBridge({ 
    segment, 
    index, 
    isVisible 
  }: { 
    segment: any; 
    index: number; 
    isVisible: boolean; 
  }) {
    const meshRef = useRef<THREE.Group>(null);
    const startY = 10; // Start high in the sky
    const targetY = segment.position[1];
    const animationDuration = 2000; // 2 seconds
    const startTime = useRef<number | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    useFrame((state) => {
      if (!meshRef.current || !isVisible) return;

      if (!hasStarted) {
        setHasStarted(true);
        startTime.current = state.clock.elapsedTime * 1000;
        meshRef.current.position.y = startY;
        return;
      }

      if (startTime.current === null) return;

      const elapsed = (state.clock.elapsedTime * 1000) - startTime.current;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Simple ease out function
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOut(progress);
      
      meshRef.current.position.y = startY + (targetY - startY) * easedProgress;
    });

    if (!isVisible) return null;

    return (
      <group ref={meshRef}>
        <primitive
          object={coloredBridgeModel.clone()}
          position={[
            segment.position[0] + segment.normal[0] * 0.01,
            segment.position[1] + segment.normal[1] * 0.01,
            segment.position[2] + segment.normal[2] * 0.01
          ]}
          quaternion={segment.rotation}
          scale={[0.515 * segment.scale, 1 * segment.scale, 1.4 * segment.scale]}
          castShadow
          receiveShadow
        />
      </group>
    );
  }
  
  // Create a colored version of the bridge model
  const coloredBridgeModel = useMemo(() => {
    const clonedModel = bridgeModel.clone();
    clonedModel.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material) {
        // Create a new material with the specified color
        const newMaterial = new THREE.MeshStandardMaterial({
          color: color,
          metalness: (child.material as THREE.MeshStandardMaterial).metalness || 0.1,
          roughness: (child.material as THREE.MeshStandardMaterial).roughness || 0.3,
        });
        child.material = newMaterial;
        
        // Enable shadow casting and receiving
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clonedModel;
  }, [bridgeModel, color]);
  // Calculate the distance to determine appropriate number of line points
  const distance = greatCircleDistance(startLat, startLng, endLat, endLng);
  
  // Use more points for smoother curves
  const adjustedPointCount = Math.max(20, Math.min(50, Math.floor(distance / 200)));
  
  // Get points along the great circle path
  const pathPoints = getGreatCirclePoints(
    startLat, 
    startLng, 
    endLat, 
    endLng, 
    adjustedPointCount
  );
  
  // Convert lat/lng points to 3D coordinates on the sphere
  const linePoints = pathPoints.map(point => {
    const pos = latLngToVector3(point.lat, point.lng, 3.01); // Very close to sphere surface
    return [pos.x, pos.y, pos.z] as [number, number, number];
  });

  // Calculate bridge positions and orientations
  const bridgeSegments = useMemo(() => {
    const segments = [];
    const segmentCount = bridgeCount; // Use the bridgeCount prop directly for consistent spacing
    
    // Set a very small fixed spacing between bridges to make them consecutive
    const bridgeSpacing = 0.338; // Very small spacing to make bridges appear consecutive
    const cityOffset = 0.15; // Distance to offset the first bridge from the city
    
    // Calculate the total path length to determine how many bridges can fit
    let totalPathLength = 0;
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const currentPos = latLngToVector3(pathPoints[i].lat, pathPoints[i].lng, 3.01);
      const nextPos = latLngToVector3(pathPoints[i + 1].lat, pathPoints[i + 1].lng, 3.01);
      // Calculate distance manually since latLngToVector3 returns a plain object
      const dx = nextPos.x - currentPos.x;
      const dy = nextPos.y - currentPos.y;
      const dz = nextPos.z - currentPos.z;
      totalPathLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    // Calculate how many bridges can fit along the path with the fixed spacing
    // Account for the city offset when calculating max bridges
    const availablePathLength = Math.max(0, totalPathLength - cityOffset);
    const maxBridges = Math.ceil(availablePathLength / bridgeSpacing);
    const actualBridgeCount = Math.min(bridgeCount, maxBridges); // Use the smaller of requested or max possible
    
    // Notify parent component about maximum bridges available
    if (onMaxBridgesCalculated) {
      onMaxBridgesCalculated(maxBridges);
    }
    
    for (let i = 0; i < actualBridgeCount; i++) {
      // Calculate the distance along the path for this bridge
      // Add cityOffset to start the first bridge away from the city
      const targetDistance = cityOffset + (i * bridgeSpacing);
      
      // Find the position along the path at this distance
      let currentDistance = 0;
      const initialPosData = latLngToVector3(pathPoints[0].lat, pathPoints[0].lng, 3.01);
      let position = new THREE.Vector3(initialPosData.x, initialPosData.y, initialPosData.z);
      let normal = new THREE.Vector3(position.x, position.y, position.z).normalize();
      let tangentDirection = new THREE.Vector3();
      
      for (let j = 0; j < pathPoints.length - 1; j++) {
        const currentPosData = latLngToVector3(pathPoints[j].lat, pathPoints[j].lng, 3.01);
        const nextPosData = latLngToVector3(pathPoints[j + 1].lat, pathPoints[j + 1].lng, 3.01);
        
        // Convert to THREE.Vector3 objects
        const currentPos = new THREE.Vector3(currentPosData.x, currentPosData.y, currentPosData.z);
        const nextPos = new THREE.Vector3(nextPosData.x, nextPosData.y, nextPosData.z);
        
        const segmentLength = currentPos.distanceTo(nextPos);
        
        if (currentDistance + segmentLength >= targetDistance) {
          // Interpolate within this segment
          const fraction = (targetDistance - currentDistance) / segmentLength;
          position = currentPos.clone().lerp(nextPos, fraction);
          normal = new THREE.Vector3(position.x, position.y, position.z).normalize();
          
          // Calculate tangent direction
          const direction = nextPos.clone().sub(currentPos).normalize();
          tangentDirection = direction.clone().sub(
            normal.clone().multiplyScalar(direction.dot(normal))
          ).normalize();
          break;
        }
        currentDistance += segmentLength;
      }
      
      // Create a right vector perpendicular to both normal and tangent direction
      const right = new THREE.Vector3().crossVectors(normal, tangentDirection).normalize();
      
      // Create rotation matrix: right = X, normal = Y, tangentDirection = Z
      const rotation = new THREE.Matrix4().makeBasis(right, normal, tangentDirection);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(rotation);
      
      // Add 90-degree Y rotation to the bridge model
      const yRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
      quaternion.multiply(yRotation);
      
      segments.push({
        position: [position.x, position.y, position.z] as [number, number, number],
        rotation: [quaternion.x, quaternion.y, quaternion.z, quaternion.w] as [number, number, number, number],
        scale: Math.min(0.15, distance / 20000), // Smaller scale for more bridges
        normal: [normal.x, normal.y, normal.z] as [number, number, number]
      });
    }
    
    
    return segments;
  }, [pathPoints, distance, bridgeCount]);
  
  return (
    <group>
      {/* Keep the original red line for reference */}
      {/* <Line
        points={linePoints}
        color="red"
        lineWidth={2}
        opacity={0.3}
      /> */}
      
      
      {/* Render bridge segments - simplified for debugging */}
      {bridgeSegments.slice(0, bridgeCount).map((segment, index) => (
        <group key={`bridge-segment-${index}`}>
          <primitive
            object={coloredBridgeModel.clone()}
            position={[
              segment.position[0] + segment.normal[0] * 0.01,
              segment.position[1] + segment.normal[1] * 0.01,
              segment.position[2] + segment.normal[2] * 0.01
            ]}
            quaternion={segment.rotation}
            scale={[0.515 * segment.scale, 1 * segment.scale, 1.4 * segment.scale]}
            castShadow
            receiveShadow
          />
        </group>
      ))}
    </group>
  );
}

export default memo(BridgePath);
