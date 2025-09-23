'use client';

import ScrambleText from './ScrambleText';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  distance: number;
}

interface DistanceDisplayProps {
  hasStarted: boolean;
  cities: City[];
  bridgeCounts: { [key: string]: number };
  maxBridges: { [key: string]: number };
}

export default function DistanceDisplay({ 
  hasStarted, 
  cities, 
  bridgeCounts, 
  maxBridges
}: DistanceDisplayProps) {
  if (!hasStarted || cities.length <= 1) return null;
  
  const targetCity = cities.find(city => city.name !== 'San Francisco');
  if (!targetCity) return null;
  
  const currentBridgeCount = bridgeCounts?.[targetCity?.name] || 0;
  const maxBridgeCount = maxBridges?.[targetCity?.name] || 1;
  const isLastBridge = currentBridgeCount === maxBridgeCount;
  
  if (!isLastBridge) return null;

  return (
    <div className="absolute top-1/2 left-1/5 transform -translate-y-1/2 z-20">
      <div className="bg-black/20 rounded-xl p-6 shadow-2xl text-center">
        <div className="text-4xl font-bold flex-col flex">
          <ScrambleText 
            text={`${Math.floor(targetCity.distance).toString().padStart(4, '0')} km`}
            duration={1000}
            scrambleChars="0123456789"
            className="text-white-300 text-5xl font-bold"
          />
          <span className="text-white text-xl font-bold">away from 🏠</span>
        </div>
      </div>
    </div>
  );
}
