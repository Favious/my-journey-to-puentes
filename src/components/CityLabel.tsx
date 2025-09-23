'use client';

import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { Html } from '@react-three/drei';
import { getFlagForCountry } from '@/utils/countryFlags';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  distance: number; // Distance to San Francisco in kilometers
}

interface CityLabelProps {
  city: City;
  onRemove: (cityName: string) => void;
}

export default function CityLabel({ city, onRemove }: CityLabelProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const { camera } = useThree();
  const [textScale, setTextScale] = useState(1);
  const flag = getFlagForCountry(city.country);

  // Convert lat/lng to 3D position on sphere
  // Account for the rotated earth image (left to right rotation)
  const lat = (city.lat * Math.PI) / 180;
  const lng = (city.lng * Math.PI) / 180;
  const radius = 3.01; // Very close to sphere surface

  // Adjust for the rotated earth image - shift longitude by 90 degrees
  const adjustedLng = lng + Math.PI / 2;
  
  const x = radius * Math.cos(lat) * Math.sin(adjustedLng);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.cos(adjustedLng);

  // Calculate text scale based on camera distance
  useFrame(() => {
    if (labelRef.current) {
      const labelPosition = new Vector3(x, y, z);
      const distance = camera.position.distanceTo(labelPosition);
      
      // Scale text based on distance - smaller when closer, larger when farther
      // Clamp between 0.3 and 1.5 for reasonable text sizes
      const scale = Math.max(0.7, Math.min(1.5, distance / 8));
      setTextScale(scale);
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Pin/Sphere marker */}
      <mesh>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="red" />
      </mesh>
      
      {/* HTML Labels - these won't be clipped by 3D camera */}
      <Html
        ref={labelRef}
        position={[0, 0.2, 0]}
        center
        distanceFactor={12}
        occlude={false}
        sprite={false}
        transform={false}
        zIndexRange={[0, 0]}
      >
        <div 
          className="text-center pointer-events-none select-none"
          style={{ 
            transform: `scale(${textScale})`,
            transformOrigin: 'center',
            zIndex: 0
          }}
        >
          <div className="text-white text-sm font-semibold whitespace-nowrap">
            {city.name}
          </div>
          <div className="text-gray-300 text-xs">
            {flag && <span className="mr-0.5">{flag}</span>}
            {city.country}
          </div>
        </div>
      </Html>
    </group>
  );
}
