'use client';

import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import EarthGlobe from '../../components/EarthGlobe';
import CityLabel from '../../components/CityLabel';
import BridgePath from '../../components/BridgePath';
import AnimatedStars from '../../components/AnimatedStars';
import ScrambleText from '../../components/ScrambleText';
import { BridgeModelProvider } from '../../components/BridgeModelLoader';
import { latLngToVector3, getGreatCirclePoints } from '../../utils/sphereMath';
import { calculateDistance, SAN_FRANCISCO_COORDS } from '../../utils/distanceCalculation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface City {
  name: string;
  lat: number;
  lng: number;
    country: string;
  distance: number; // Distance to San Francisco in kilometers
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
      (controlsRef as any)?.current?.target?.lerp(currentLookAtRef.current, transitionSpeedRef?.current * 1.5);
    }
  });
  
  return <OrbitControls ref={controlsRef} enableZoom={true} enablePan={true} enableRotate={true} />;
}

export default function Home() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<{ description: string; imageUrl: string }[]>([]);
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [bridgeColor, setBridgeColor] = useState<string>('#c0362c');
  const [name, setName] = useState<string>('');
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [cities, setCities] = useState<City[]>([
    {
      name: 'San Francisco',
      lat: SAN_FRANCISCO_COORDS.lat,
      lng: SAN_FRANCISCO_COORDS.lng,
      country: 'United States',
      distance: 0
    }
  ]);
  
  const [bridgeCounts, setBridgeCounts] = useState<{ [key: string]: number }>({});
  const [maxBridges, setMaxBridges] = useState<{ [key: string]: number }>({});
  const [scrollAccumulator, setScrollAccumulator] = useState(0);
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef(0);
  
  
  // San Francisco coordinates for bridge paths
  const sanFrancisco = {
    lat: SAN_FRANCISCO_COORDS.lat,
    lng: SAN_FRANCISCO_COORDS.lng
  };

  // Fetch journey by slug
  useEffect(() => {
    const load = async () => {
      try {
        if (!params?.slug) return;
        setError(null);
        setLoading(true);
        const slug = params.slug as string;
        const engineersRef = collection(db, 'engineers');
        const q = query(engineersRef, where('slug', '==', slug));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setError('Not found');
          setMilestones([]);
          return;
        }
        const doc = snapshot.docs[0];
        const data = doc.data() as any;
        const themeValue = data?.theme as string | undefined;
        const resolvedColor = (() => {
          if (!themeValue) return '#c0362c';
          if (typeof themeValue === 'string' && themeValue.startsWith('#')) return themeValue;
          if (themeValue === 'gold') return '#FFD700';
          if (themeValue === 'white') return '#ffffff';
          if (themeValue === 'international-orange') return '#c0362c';
          return '#c0362c';
        })();
        setBridgeColor(resolvedColor);
        setName((data?.fullName as string) || '');
        const homeLat = data?.home?.latitude;
        const homeLng = data?.home?.longitude;
        const homeCity = data?.home?.city || 'Home';
        const homeCountry = data?.home?.country || '';
        const distance = typeof homeLat === 'number' && typeof homeLng === 'number'
          ? calculateDistance(homeLat, homeLng, SAN_FRANCISCO_COORDS.lat, SAN_FRANCISCO_COORDS.lng)
          : 0;

        setCities([
          {
            name: 'San Francisco',
            lat: SAN_FRANCISCO_COORDS.lat,
            lng: SAN_FRANCISCO_COORDS.lng,
            country: 'United States',
            distance: 0
          },
          {
            name: homeCity,
            lat: homeLat,
            lng: homeLng,
            country: homeCountry,
            distance
          }
        ]);
        setMilestones(Array.isArray(data?.milestones) ? data.milestones : []);
        setMilestoneIndex(0);
      } catch (e) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params?.slug]);

  const handleCityRemove = (_cityName: string) => {};

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
    
    const step = Math.max(1, Math.floor(maxCount / 6));
    if (isTrackpad) {
      // For trackpad: accumulate deltaY values and trigger after a threshold
      const deltaThreshold = 50; // Balanced sensitivity for trackpad
      
      setScrollAccumulator(prev => {
        const newAccumulator = prev + Math.abs(e.deltaY);
        
        if (newAccumulator >= deltaThreshold) {
          // Determine direction based on deltaY sign
          if (e.deltaY > 0) {
            const newCount = Math.min(currentCount + step, maxCount);
            handleBridgeCountChange(targetCity.name, newCount);
            setMilestoneIndex(prev => Math.min(prev + 1, Math.max(0, milestones.length - 1)));
          } else {
            const newCount = Math.max(currentCount - step, 0);
            handleBridgeCountChange(targetCity.name, newCount);
            setMilestoneIndex(prev => Math.max(prev - 1, 0));
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
            const newCount = Math.min(currentCount + step, maxCount);
            handleBridgeCountChange(targetCity.name, newCount);
            setMilestoneIndex(prev => Math.min(prev + 1, Math.max(0, milestones.length - 1)));
            return 0; // Reset accumulator
          }
          return newAccumulator;
        });
      } else {
        // Scroll up - decrease bridge count
        setScrollAccumulator(prev => {
          const newAccumulator = prev - 1;
          if (newAccumulator <= -SCROLL_THRESHOLD) {
            const newCount = Math.max(currentCount - step, 0);
            handleBridgeCountChange(targetCity.name, newCount);
            setMilestoneIndex(prev => Math.max(prev - 1, 0));
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

  // Show a full-screen loader while fetching data with stars background
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-black relative overflow-hidden">
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 0, 5], near: 0.1, far: 1000 }}>
            <AnimatedStars count={2000} radius={15} speed={0.3} />
          </Canvas>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner message="Loading journey..." className="bg-transparent min-h-0 h-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ height: '100vh', overflow: 'hidden' }}>
      <h1 className="text-4xl font-bold text-center p-8 absolute top-0 left-0 right-0 z-10">{name}'s journey to Puentes</h1>
      
      
      {/* Left side distance display - only show when last bridge is placed */}
      {hasStarted && cities.length > 1 && (() => {
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
            camera={{ position: [1, 1, 5.7], near: 0.1, far: 1000 }}
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
              {cities
                .filter(city => city.name === 'San Francisco' || hasStarted)
                .map((city, index) => (
                <CityLabel 
                  key={`${city.name}-${index}`} 
                  city={city} 
                  onRemove={handleCityRemove} 
                />
              ))}
              
              {/* Render bridge paths from each city to San Francisco */}
              {hasStarted && cities
                .filter(city => city.name !== 'San Francisco')
                .map((city, index) => (
                  <BridgePath
                    key={`bridge-path-${city.name}-${index}`}
                    startLat={city.lat}
                    startLng={city.lng}
                    endLat={sanFrancisco.lat}
                    endLng={sanFrancisco.lng}
                    bridgeCount={bridgeCounts?.[city?.name] || 0}
                    color={bridgeColor}
                    onMaxBridgesCalculated={(maxBridges) => handleMaxBridgesCalculated(city.name, maxBridges)}
                  />
                ))}
              
              {/* Camera controller for following bridge construction */}
              <CameraController
                targetCity={cities?.find(city => city?.name !== 'San Francisco') || null}
                bridgeCount={bridgeCounts?.[cities?.find(city => city?.name !== 'San Francisco')?.name || ''] || 0}
                maxBridges={maxBridges?.[cities?.find(city => city?.name !== 'San Francisco')?.name || ''] || 1}
                sanFrancisco={sanFrancisco}
                isLocked={isCameraLocked && hasStarted}
              />
            </BridgeModelProvider>
          </Canvas>
        </div>
        
        {/* Right side overlay - Milestones only */}
        <div className="absolute top-0 right-0 w-2/5 h-full bg-transparent" onWheel={hasStarted ? handleWheel : undefined}>
          <div className="h-full w-full flex items-center justify-center bg-transparent">
            {!hasStarted ? (
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setHasStarted(true)}
                  className="px-8 py-4 rounded-full font-semibold text-black text-xl transition-all duration-300 shadow-2xl bg-white"
                >
                  Start
                </button>
              </div>
            ) : (
              <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 shadow-2xl min-w-96 max-w-lg text-center border border-white/20">
                {error ? (
                  <div className="text-red-400">{error}</div>
                ) : milestones.length === 0 ? (
                  <div className="text-gray-300">No milestones yet</div>
                ) : (
                  (() => {
                    const current = milestones[milestoneIndex];
                    return (
                      <>
                        {current?.imageUrl && (
                          <div className="w-full mb-4">
                            <img src={current.imageUrl} alt="Milestone" className="w-full h-64 object-cover rounded-lg" />
                          </div>
                        )}
                        <div className="text-white text-left whitespace-pre-line">
                          {current?.description}
                        </div>
                        <div className="text-white/70 text-sm mt-4">
                          {milestoneIndex + 1} / {milestones.length}
                        </div>
                      </>
                    );
                  })()
                )}
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
