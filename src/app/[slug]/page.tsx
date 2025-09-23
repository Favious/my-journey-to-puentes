'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
import TypingText from '../../components/TypingText';
import AutoHeight from '../../components/AutoHeight';
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
  isLocked,
  milestoneIndex,
  totalMilestones
}: { 
  targetCity: City | null; 
  bridgeCount: number; 
  maxBridges: number; 
  sanFrancisco: { lat: number; lng: number };
  isLocked: boolean;
  milestoneIndex: number;
  totalMilestones: number;
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
      const milestoneProgress = totalMilestones > 0 ? (milestoneIndex + 1) / totalMilestones : 0;
      const bridgeProgress = maxBridges > 0 ? bridgeCount / maxBridges : 0;
      // Use the greater of the two to allow progress to continue even if bridges < milestones
      const rawProgress = Math.min(1, Math.max(bridgeProgress, milestoneProgress));
      
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
  
  return <OrbitControls 
    ref={controlsRef} 
    enableZoom={!isLocked} 
    enablePan={!isLocked} 
    enableRotate={!isLocked} 
  />;
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
  const wheelCooldownRef = useRef(0);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [displayedMilestoneIndex, setDisplayedMilestoneIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevMilestoneIndex, setPrevMilestoneIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const milestonesContainerRef = useRef<HTMLDivElement>(null);
  
  // Simple sound helper for bridge add click
  const playBridgeClick = (times: number = 1) => {
    const count = Math.max(0, Math.floor(times));
    for (let i = 0; i < count; i++) {
      // Stagger slightly if multiple plays are needed
      setTimeout(() => {
        try {
          const audio = new Audio('/clickSound.mp3');
          audio.volume = 0.7;
          // Some browsers require user interaction before audio; ignore errors
          void audio.play();
        } catch (_) {
          // noop
        }
      }, i * 60);
    }
  };

  // Simple sound helper for bridge removal
  const playBridgeDelete = (times: number = 1) => {
    const count = Math.max(0, Math.floor(times));
    for (let i = 0; i < count; i++) {
      // Stagger slightly if multiple plays are needed
      setTimeout(() => {
        try {
          const audio = new Audio('/deleteKeySound.mp3');
          audio.volume = 0.1;
          // Some browsers require user interaction before audio; ignore errors
          void audio.play();
        } catch (_) {
          // noop
        }
      }, i * 60);
    }
  };

  // Track latest bridge counts and per-city timers for smooth increments
  const bridgeCountsRef = useRef<{ [key: string]: number }>({});
  useEffect(() => {
    bridgeCountsRef.current = bridgeCounts;
  }, [bridgeCounts]);

  const bridgeIncrementTimersRef = useRef<{ [key: string]: number | undefined }>({});
  useEffect(() => {
    return () => {
      // Cleanup any pending timers on unmount
      Object.values(bridgeIncrementTimersRef.current).forEach((id) => {
        if (id) clearTimeout(id);
      });
    };
  }, []);

  // Smoothly change bridge count one-by-one for better pacing and sound
  const smoothSetBridgeCount = (cityName: string, targetCount: number, stepDelayMs: number = 180) => {
    const current = bridgeCountsRef.current?.[cityName] || 0;
    const desired = Math.max(0, targetCount);

    // If equal, just set immediately
    if (desired === current) {
      setBridgeCounts(prev => ({ ...prev, [cityName]: desired }));
      return;
    }

    // If decreasing, remove all at once but play delete sound once
    if (desired < current) {
      setBridgeCounts(prev => ({ ...prev, [cityName]: desired }));
      playBridgeDelete(1);
      return;
    }

    // If increasing, use staggered animation
    if (bridgeIncrementTimersRef.current[cityName]) {
      clearTimeout(bridgeIncrementTimersRef.current[cityName]);
      bridgeIncrementTimersRef.current[cityName] = undefined;
    }

    const step = () => {
      const latest = bridgeCountsRef.current?.[cityName] || 0;
      if (latest >= desired) {
        bridgeIncrementTimersRef.current[cityName] = undefined;
        return;
      }
      
      const next = latest + 1;
      setBridgeCounts(prev => ({ ...prev, [cityName]: next }));
      playBridgeClick(1);
      bridgeIncrementTimersRef.current[cityName] = window.setTimeout(step, stepDelayMs);
    };

    step();
  };

  
  // San Francisco coordinates for bridge paths
  const sanFrancisco = {
    lat: SAN_FRANCISCO_COORDS.lat,
    lng: SAN_FRANCISCO_COORDS.lng
  };

  // Preload milestone images to make switching instant
  useEffect(() => {
    if (!milestones || milestones.length === 0) return;
    const urls = milestones.map(m => m?.imageUrl).filter(Boolean) as string[];
    const toLoad = urls.filter(u => !preloadedImages.has(u));
    if (toLoad.length === 0) return;

    toLoad.forEach((url) => {
      const img = new Image();
      img.onload = () => {
        setPreloadedImages(prev => new Set([...prev, url]));
      };
      img.onerror = () => {
        // Ignore errors; continue
      };
      img.decoding = 'async' as any;
      (img as any).fetchPriority = 'low';
      img.src = url;
    });
  }, [milestones, preloadedImages]);

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
        setDisplayedMilestoneIndex(0);
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
    // Use smooth, staggered increments for increases
    smoothSetBridgeCount(cityName, count, 180);
  };

  // Milestone controls (buttons) with cooldown shared with wheel
  const goToNextMilestone = () => {
    const total = Math.max(1, milestones.length || 1);
    const now = Date.now();
    const cooldownMs = 450; // sync with transition
    if (now - wheelCooldownRef.current < cooldownMs) return;
    wheelCooldownRef.current = now;
    setMilestoneIndex(prev => {
      const next = Math.min(prev + 1, total - 1);
      if (next !== prev) syncBridgesWithMilestone(next);
      return next;
    });
  };

  const goToPrevMilestone = () => {
    const now = Date.now();
    const cooldownMs = 450; // sync with transition
    if (now - wheelCooldownRef.current < cooldownMs) return;
    wheelCooldownRef.current = now;
    setMilestoneIndex(prev => {
      const next = Math.max(prev - 1, 0);
      if (next !== prev) syncBridgesWithMilestone(next);
      return next;
    });
  };

  // Animate transitions between milestones
  useEffect(() => {
    if (milestoneIndex === displayedMilestoneIndex) return;
    setPrevMilestoneIndex(displayedMilestoneIndex);
    setTransitionDirection(milestoneIndex > displayedMilestoneIndex ? 1 : -1);
    setIsTransitioning(true);
    const t = setTimeout(() => {
      setDisplayedMilestoneIndex(milestoneIndex);
      setIsTransitioning(false);
    }, 450);
    return () => clearTimeout(t);
  }, [milestoneIndex, displayedMilestoneIndex]);

  const handleMaxBridgesCalculated = (cityName: string, maxBridges: number) => {
    setMaxBridges(prev => ({
      ...prev,
      [cityName]: maxBridges
    }));
    // Initialize bridge count to the first milestone chunk (e.g., 1/6 of total)
    if (!(cityName in bridgeCounts)) {
      const totalMilestones = Math.max(1, milestones.length || 6);
      const initialChunk = Math.max(1, Math.ceil(maxBridges / totalMilestones));
      const initialCount = Math.min(initialChunk, maxBridges);
      // Use smooth placement for initial batch
      smoothSetBridgeCount(cityName, initialCount, 160);
    }
  };

  // Keep bridges in sync with the given milestone index
  const syncBridgesWithMilestone = useCallback((newIndex: number) => {
    const targetCity = cities.find(city => city.name !== 'San Francisco');
    if (!targetCity) {
      setMilestoneIndex(newIndex);
      return;
    }
    const maxCount = Math.max(0, maxBridges?.[targetCity?.name] || 0);
    const totalMilestones = Math.max(1, milestones.length || 6);
    const initialChunk = maxCount > 0 ? Math.ceil(maxCount / totalMilestones) : 0;
    const remaining = Math.max(0, maxCount - initialChunk);
    const transitions = Math.max(1, totalMilestones - 1);
    const transitionsPassed = newIndex; // 0..(M-1)
    const incrementsApplied = Math.floor((transitionsPassed * remaining) / transitions);
    const plannedCount = Math.min(maxCount, initialChunk + incrementsApplied);
    setMilestoneIndex(newIndex);
    handleBridgeCountChange(targetCity.name, plannedCount);
  }, [cities, maxBridges, milestones.length, handleBridgeCountChange]);

  // Handle scroll events for milestone and bridge sync (one milestone per scroll)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetCity = cities.find(city => city.name !== 'San Francisco');
    if (!targetCity) return;

    const maxCount = Math.max(0, maxBridges?.[targetCity?.name] || 0);
    const totalMilestones = Math.max(1, milestones.length || 6);

    // Require a minimum deltaY threshold for scroll sensitivity
    const minDeltaY = 2; // Adjust this value to make scrolling more or less sensitive
    const absDeltaY = Math.abs(e.deltaY);
    
    // Debug: log scroll values to understand the difference
    console.log('Scroll deltaY:', e.deltaY, 'absDeltaY:', absDeltaY, 'minDeltaY:', minDeltaY);
    
    if (absDeltaY < minDeltaY) return;
    
    const direction = e.deltaY > 0 ? 1 : -1;
    const newMilestoneIndex = Math.min(
      Math.max(milestoneIndex + direction, 0),
      totalMilestones - 1
    );

    if (newMilestoneIndex === milestoneIndex) return;

    // Check cooldown only after we know we want to change milestones
    const now = Date.now();
    const cooldownMs = 1000; // 0.5s lock between scroll movements
    if (now - wheelCooldownRef.current < cooldownMs) return;
    wheelCooldownRef.current = now;

    // Use shared sync logic
    syncBridgesWithMilestone(newMilestoneIndex);
  }, [cities, maxBridges, milestones.length, milestoneIndex, syncBridgesWithMilestone]);

  // Attach wheel event listener to milestones container
  useEffect(() => {
    const container = milestonesContainerRef.current;
    if (!container || !hasStarted) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel, hasStarted]);

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
        milestoneIndex={milestoneIndex}
        totalMilestones={Math.max(1, milestones.length || 6)}
              />
            </BridgeModelProvider>
          </Canvas>
        </div>
        
        {/* Right side overlay - Milestones only */}
        <div ref={milestonesContainerRef} className="absolute top-0 right-10 w-[600px] h-full overflow-visible z-50">
          <div className="h-full w-full flex items-center justify-center bg-transparent relative">
            
            {!hasStarted ? (
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setHasStarted(true)}
                  className="px-8 py-4 rounded-full font-semibold text-black text-xl shadow-2xl bg-white"
                >
                  Start
                </button>
              </div>
            ) : (
              <div className="relative z-50 bg-white/5 rounded-xl p-8 min-w-lg max-w-lg text-left border border-white/20 overflow-visible backdrop-blur-sm">
                
                {/* Vertical Step Indicator - positioned relative to milestones content */}
                {milestones.length > 1 && (
                  <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 z-60">
                    <div className="flex flex-col items-center space-y-2">
                      {milestones.map((_, index) => (
                        <div
                          key={index}
                          className={`w-3 h-3 rounded-full ${
                            index === displayedMilestoneIndex
                              ? 'bg-white shadow-lg'
                              : index < displayedMilestoneIndex
                              ? 'bg-white/60'
                              : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {error ? (
                  <div className="text-red-400">{error}</div>
                ) : milestones.length === 0 ? (
                  <div className="text-gray-300">No milestones yet</div>
                ) : (
                  <div className="relative h-full will-change-transform">
                    {/* Controls top/bottom */}
                    {displayedMilestoneIndex > 0 && (
                      <div className="absolute left-1/2 -translate-x-1/2 -top-20 z-10">
                        <button
                          onClick={goToPrevMilestone}
                          aria-label="Previous milestone"
                          className="h-10 w-10 rounded-full text-white shadow-md flex items-center justify-center"
                        >
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {displayedMilestoneIndex < Math.max(0, milestones.length - 1) && (
                      <div className="absolute left-1/2 -translate-x-1/2 -bottom-20 z-10">
                        <button
                          onClick={goToNextMilestone}
                          aria-label="Next milestone"
                          className="h-10 w-10 rounded-full text-white shadow-md flex items-center justify-center"
                        >
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M6 10l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {(() => {
                      const targetIndex = isTransitioning ? milestoneIndex : displayedMilestoneIndex;
                      const prevIndex = displayedMilestoneIndex;
                      const prev = milestones[prevIndex];
                      const current = milestones[targetIndex];
                      return (
                        <>
                          {/* Previous milestone layer */}
                          <div
                            className={`absolute inset-0 pointer-events-none ${
                              isTransitioning ? 'opacity-0' : 'opacity-0'
                            }`}
                          >
                            {prev ? (
                              <div className="text-left">
                                {prev?.imageUrl && (
                                  <div className="w-full mb-4">
                                    <img
                                      src={prev.imageUrl}
                                      alt="Milestone"
                                      className="w-full h-64 object-cover rounded-lg"
                                      loading="eager"
                                      decoding="async"
                                      fetchPriority="high"
                                    />
                                  </div>
                                )}
                                <div className="text-white whitespace-pre-line">{prev?.description}</div>
                              </div>
                            ) : null}
                          </div>

                          {/* Current milestone layer */}
                          <div className="relative opacity-100">
                            {current ? (
                              <>
                                {current?.imageUrl && (
                                  <div className="w-full mb-4">
                                    <img
                                      key={current.imageUrl}
                                      src={current.imageUrl}
                                      alt="Milestone"
                                      className="w-full h-64 object-cover rounded-lg"
                                      loading="eager"
                                      decoding="async"
                                      fetchPriority="high"
                                    />
                                  </div>
                                )}
                                <AutoHeight transitionMs={400}>
                                  <TypingText text={current?.description || ''} className="text-white text-left whitespace-pre-line text-lg md:text-xl" speedMs={14} />
                                </AutoHeight>
                              </>
                            ) : null}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Camera Lock Button */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
        <button
          onClick={() => setIsCameraLocked(!isCameraLocked)}
          className={`px-3 py-3 rounded-full font-semibold transition-all duration-300 backdrop-blur-sm shadow-lg border ${
            !isCameraLocked 
              ? 'bg-white text-black border-white hover:bg-gray-100' 
              : 'bg-white/5 text-white border-white/30 hover:bg-black/40 hover:border-white/50'
          }`}
        >
          <div className="flex items-center space-x-1">
            <div className={`w-5 h-5 ${isCameraLocked ? 'text-black' : 'text-white'}`}>
              {!isCameraLocked ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="black" className="w-full h-full">
                  <path d="M256 160L256 224L384 224L384 160C384 124.7 355.3 96 320 96C284.7 96 256 124.7 256 160zM192 224L192 160C192 89.3 249.3 32 320 32C390.7 32 448 89.3 448 160L448 224C483.3 224 512 252.7 512 288L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 288C128 252.7 156.7 224 192 224z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="white" className="w-full h-full">
                  <path d="M256 160C256 124.7 284.7 96 320 96C351.7 96 378 119 383.1 149.3C386 166.7 402.5 178.5 420 175.6C437.5 172.7 449.2 156.2 446.3 138.7C436.1 78.1 383.5 32 320 32C249.3 32 192 89.3 192 160L192 224C156.7 224 128 252.7 128 288L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 288C512 252.7 483.3 224 448 224L256 224L256 160z"/>
                </svg>
              )}
            </div>
            <span>{isCameraLocked ? 'Unlock Camera' : 'Lock Camera'}</span>
          </div>
        </button>
      </div>
    </div>
  );
}

