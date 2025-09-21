'use client';

import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import EarthGlobe from '../components/EarthGlobe';
import CitySearch from '../components/CitySearch';
import CityLabel from '../components/CityLabel';
import BridgePath from '../components/BridgePath';
import AnimatedStars from '../components/AnimatedStars';
import ScrambleText from '../components/ScrambleText';
import { BridgeModelProvider } from '../components/BridgeModelLoader';
import { latLngToVector3, getGreatCirclePoints } from '../utils/sphereMath';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  distance: number; // Distance to San Francisco in kilometers
}

interface Engineer {
  id: string;
  fullName: string;
  slug: string;
  company: string;
  cityOfBirth: string;
  coverImageUrl?: string;
}

// Camera controller component for smooth transitions
function CameraController({ 
  targetCity, 
  bridgeCount, 
  maxBridges, 
  sanFrancisco,
  isLocked
}: { 
  targetCity: City | null; 
  bridgeCount: number; 
  maxBridges: number; 
  sanFrancisco: { lat: number; lng: number };
  isLocked: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const targetPositionRef = useRef(new THREE.Vector3());
  const targetLookAtRef = useRef(new THREE.Vector3());
  const currentPositionRef = useRef(new THREE.Vector3());
  const currentLookAtRef = useRef(new THREE.Vector3());
  const lastProgressRef = useRef(0);
  const transitionSpeedRef = useRef(0.008); // Very slow for ultra-smooth movement
  const bridgePointsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  
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
      const rawProgress = maxBridges > 0 ? bridgeCount / maxBridges : 0;
      
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
      controlsRef?.current?.target?.lerp(currentLookAtRef.current, transitionSpeedRef?.current * 1.5);
    }
  });
  
  return <OrbitControls ref={controlsRef} enableZoom={true} enablePan={true} enableRotate={true} />;
}

export default function Home() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([
    {
      name: 'San Francisco',
      lat: 37.7749,
      lng: -122.4194,
      country: 'United States',
      distance: 0 // San Francisco is the reference point
    }
  ]);
  
  const [bridgeCounts, setBridgeCounts] = useState<{ [key: string]: number }>({});
  const [maxBridges, setMaxBridges] = useState<{ [key: string]: number }>({});
  const [scrollAccumulator, setScrollAccumulator] = useState(0);
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef(0);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [showEngineers, setShowEngineers] = useState(false);
  
  // Fetch engineers from Firestore
  const fetchEngineers = async () => {
    try {
      const engineersRef = collection(db, 'engineers');
      const querySnapshot = await getDocs(engineersRef);
      const engineersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Engineer[];
      setEngineers(engineersData);
    } catch (error) {
      console.error('Error fetching engineers:', error);
    }
  };

  // Load engineers on component mount
  useEffect(() => {
    fetchEngineers();
  }, []);
  
  // Prevent body scroll to avoid conflicts with custom scroll handling
  useEffect(() => {
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };
    
    // Add event listeners to prevent scrolling
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, []);
  
  // San Francisco coordinates for bridge paths
  const sanFrancisco = {
    lat: 37.7749,
    lng: -122.4194
  };

  const handleCityAdd = (city: City) => {
    setCities(prev => [...prev, city]);
  };

  const handleCityRemove = (cityName: string) => {
    setCities(prev => prev.filter(city => city.name !== cityName));
    // Clean up bridge counts when city is removed
    setBridgeCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[cityName];
      return newCounts;
    });
    setMaxBridges(prev => {
      const newMax = { ...prev };
      delete newMax[cityName];
      return newMax;
    });
  };

  const handleBridgeCountChange = (cityName: string, count: number) => {
    setBridgeCounts(prev => ({
      ...prev,
      [cityName]: count
    }));
  };

  const handleMaxBridgesCalculated = (cityName: string, maxBridges: number) => {
    setMaxBridges(prev => ({
      ...prev,
      [cityName]: maxBridges
    }));
    // Initialize bridge count to 0 when max is calculated
    if (!(cityName in bridgeCounts)) {
      setBridgeCounts(prev => ({
        ...prev,
        [cityName]: 0
      }));
    }
  };




  // Handle scroll events for bridge count control
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find the first city that's not San Francisco to control
    const targetCity = cities.find(city => city.name !== 'San Francisco');
    if (!targetCity) return;
    
    const currentCount = bridgeCounts?.[targetCity?.name] || 0;
    const maxCount = maxBridges?.[targetCity?.name] || 1;
    
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;
    lastScrollTimeRef.current = now;
    
    // Detect if this is likely a trackpad (many events in quick succession) or mouse wheel
    const isTrackpad = timeSinceLastScroll < 50; // Trackpad events are very close together
    
    // Clear any existing timeout
    if (scrollTimeoutRef?.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    if (isTrackpad) {
      // For trackpad: accumulate deltaY values and trigger after a threshold
      const deltaThreshold = 50; // Balanced sensitivity for trackpad
      
      setScrollAccumulator(prev => {
        const newAccumulator = prev + Math.abs(e.deltaY);
        
        if (newAccumulator >= deltaThreshold) {
          // Determine direction based on deltaY sign
          if (e.deltaY > 0) {
            const newCount = Math.min(currentCount + 1, maxCount);
            handleBridgeCountChange(targetCity.name, newCount);
          } else {
            const newCount = Math.max(currentCount - 1, 0);
            handleBridgeCountChange(targetCity.name, newCount);
          }
          return 0; // Reset accumulator
        }
        return newAccumulator;
      });
    } else {
      // For mouse wheel: use discrete scroll events
      const SCROLL_THRESHOLD = 3;
      
      if (e.deltaY > 0) {
        // Scroll down - increase bridge count
        setScrollAccumulator(prev => {
          const newAccumulator = prev + 1;
          if (newAccumulator >= SCROLL_THRESHOLD) {
            const newCount = Math.min(currentCount + 1, maxCount);
            handleBridgeCountChange(targetCity.name, newCount);
            return 0; // Reset accumulator
          }
          return newAccumulator;
        });
      } else {
        // Scroll up - decrease bridge count
        setScrollAccumulator(prev => {
          const newAccumulator = prev - 1;
          if (newAccumulator <= -SCROLL_THRESHOLD) {
            const newCount = Math.max(currentCount - 1, 0);
            handleBridgeCountChange(targetCity.name, newCount);
            return 0; // Reset accumulator
          }
          return newAccumulator;
        });
      }
    }
    
    // Reset accumulator after a delay to prevent stale scroll events
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollAccumulator(0);
    }, 200);
  };

  return (
    <div className="h-screen w-full overflow-hidden relative">
      <h1 className="text-4xl font-bold text-center p-8 absolute top-0 left-0 right-0 z-10">My journey to Puentes</h1>
      
      {/* Engineers Section */}
      <div className="absolute top-20 right-4 z-20">
        <button
          onClick={() => setShowEngineers(!showEngineers)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          {showEngineers ? 'Hide Engineers' : `View Engineers (${engineers.length})`}
        </button>
        
          {showEngineers && (
            <div className="absolute top-12 right-0 bg-white rounded-lg shadow-lg border p-4 w-80 max-h-96 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-3">Engineer Profiles</h3>
              {(engineers?.length || 0) === 0 ? (
                <p className="text-gray-500 text-sm">No engineers found. Add some using the form!</p>
              ) : (
                <div className="space-y-2">
                  {engineers?.map((engineer) => (
                  <div key={engineer.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                    {engineer?.coverImageUrl && (
                      <img
                        src={engineer.coverImageUrl}
                        alt={engineer?.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{engineer?.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{engineer?.company}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/${engineer?.slug}`)}
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Left side distance display - only show when last bridge is placed */}
      {cities.length > 1 && (() => {
        const targetCity = cities.find(city => city.name !== 'San Francisco');
        if (!targetCity) return null;
        
        const currentBridgeCount = bridgeCounts?.[targetCity?.name] || 0;
        const maxBridgeCount = maxBridges?.[targetCity?.name] || 1;
        const isLastBridge = currentBridgeCount === maxBridgeCount;
        
        return isLastBridge ? (
          <div className="absolute top-1/2 left-1/5 transform -translate-y-1/2 z-20">
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 shadow-2xl border border-white/20 text-center">
              {/* <div className="text-white text-2xl font-bold mb-2">Distance to SF</div> */}
              <div className="text-white-300 text-4xl font-bold">
                <ScrambleText 
                  text={`${Math.floor(targetCity.distance).toString().padStart(4, '0')} km`}
                  duration={1000}
                  scrambleChars="0123456789"
                  className="text-white-300 text-4xl font-bold"
                />
              </div>
            </div>
          </div>
        ) : null;
      })()}
      <div className="h-full w-full relative">
        {/* Full screen Globe */}
        <div className="w-full h-full">
          <Canvas 
            camera={{ position: [0, 0, 5], near: 0.1, far: 1000 }}
            shadows
            gl={{ antialias: true, alpha: false }}
          >
            <BridgeModelProvider>
              <ambientLight intensity={0.3} />
              <directionalLight 
                position={[5, 10, 5]} 
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={50}
                shadow-camera-left={-10}
                shadow-camera-right={10}
                shadow-camera-top={10}
                shadow-camera-bottom={-10}
              />
              <AnimatedStars count={2000} radius={15} speed={0.3} />
              <EarthGlobe />
              {cities.map((city, index) => (
                <CityLabel 
                  key={`${city.name}-${index}`} 
                  city={city} 
                  onRemove={handleCityRemove} 
                />
              ))}
              
              {/* Render bridge paths from each city to San Francisco */}
              {cities
                .filter(city => city.name !== 'San Francisco')
                .map((city, index) => (
                  <BridgePath
                    key={`bridge-path-${city.name}-${index}`}
                    startLat={city.lat}
                    startLng={city.lng}
                    endLat={sanFrancisco.lat}
                    endLng={sanFrancisco.lng}
                    bridgeCount={bridgeCounts?.[city?.name] || 0}
                    color="#c0362c"
                    onMaxBridgesCalculated={(maxBridges) => handleMaxBridgesCalculated(city.name, maxBridges)}
                  />
                ))}
              
              {/* Camera controller for following bridge construction */}
              <CameraController
                targetCity={cities?.find(city => city?.name !== 'San Francisco') || null}
                bridgeCount={bridgeCounts?.[cities?.find(city => city?.name !== 'San Francisco')?.name || ''] || 0}
                maxBridges={maxBridges?.[cities?.find(city => city?.name !== 'San Francisco')?.name || ''] || 1}
                sanFrancisco={sanFrancisco}
                isLocked={isCameraLocked}
              />
            </BridgeModelProvider>
          </Canvas>
        </div>
        
        {/* Right side overlay - City Search */}
        <div className="absolute top-0 right-0 w-2/5 h-full bg-transparent" onWheel={handleWheel}>
          <div className="h-full w-full flex items-center justify-center bg-transparent">
            {(cities?.length || 0) <= 1 ? (
              <CitySearch onCityAdd={handleCityAdd} />
            ) : (
              <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 shadow-2xl min-w-96 max-w-lg text-center border border-white/20">
                {(() => {
                  const targetCity = cities.find(city => city.name !== 'San Francisco');
                  return (
                    <>
                      <h2 className="text-4xl font-bold text-gray-800 mb-2 text-white">{targetCity?.name?.toUpperCase()}</h2>
                      <div className="space-y-4 text-left">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 text-white rounded-full flex items-center justify-center font-bold">↑</div>
                          <span className="text-lg text-white">Scroll up 2 times to decrease bridge count</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 text-white rounded-full flex items-center justify-center font-bold">↓</div>
                          <span className="text-lg text-white">Scroll down 2 times to increase bridge count</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Camera Lock Button */}
      <div className="absolute bottom-4 left-1/5 transform -translate-x-1/2 z-20">
        <button
          onClick={() => setIsCameraLocked(!isCameraLocked)}
          className="px-6 py-3 rounded-full font-semibold text-white transition-all duration-300 backdrop-blur-sm shadow-lg bg-black/20 hover:bg-black/40 border border-white/30 hover:border-white/50"
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg">
              {isCameraLocked ? '🔒' : '🔓'}
            </span>
            <span>{isCameraLocked ? 'Camera Locked' : 'Camera Free'}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
