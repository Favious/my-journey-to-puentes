'use client';

import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useParams } from 'next/navigation';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import EarthGlobe from '../../components/EarthGlobe';
import CityLabel from '../../components/CityLabel';
import BridgePath from '../../components/BridgePath';
import AnimatedStars from '../../components/AnimatedStars';
import CameraController from '../../components/CameraController';
import DistanceDisplay from '../../components/DistanceDisplay';
import MilestoneDisplay from '../../components/MilestoneDisplay';
import CameraControls from '../../components/CameraControls';
import { BridgeModelProvider } from '../../components/BridgeModelLoader';
import { calculateDistance, SAN_FRANCISCO_COORDS } from '../../utils/distanceCalculation';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useBridgeManagement } from '../../hooks/useBridgeManagement';
import { useMilestoneNavigation } from '../../hooks/useMilestoneNavigation';

interface City {
  name: string;
  lat: number;
  lng: number;
    country: string;
  distance: number; // Distance to San Francisco in kilometers
}



export default function Home() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<{ description: string; imageUrl: string }[]>([]);
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
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Use custom hooks for bridge and milestone management
  const { bridgeCounts, maxBridges, handleBridgeCountChange, handleMaxBridgesCalculated } = useBridgeManagement();
  const { 
    milestoneIndex, 
    displayedMilestoneIndex, 
    isTransitioning, 
    handleWheel,
    goToNextMilestone,
    goToPrevMilestone
  } = useMilestoneNavigation(milestones, cities, maxBridges, handleBridgeCountChange);
  

  
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
      } catch (e) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params?.slug]);

  const handleCityRemove = (_cityName: string) => {};

  // Attach wheel event listener to milestones container
  useEffect(() => {
    const container = document.querySelector('[data-milestones-container]');
    if (!container || !hasStarted) return;

    const wheelHandler = (e: Event) => handleWheel(e as WheelEvent);
    container.addEventListener('wheel', wheelHandler, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel, hasStarted]);

  // Add keyboard arrow key support for milestone navigation
  useEffect(() => {
    if (!hasStarted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.key === 'ArrowUp') {
          goToPrevMilestone();
        } else if (e.key === 'ArrowDown') {
          goToNextMilestone();
        }
      }
    };

    // Add event listener to document to capture all keyboard events
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasStarted, goToNextMilestone, goToPrevMilestone]);

  // Show a full-screen loader while fetching data
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-black relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner message="Loading journey..." className="bg-transparent min-h-0 h-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden relative" style={{ height: '100vh', overflow: 'hidden' }}>
      <svg style={{ display: 'none' }}>
        <filter id="lg-dist" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="70" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <h1 className="text-5xl font-bold text-center p-8 absolute top-0 left-0 right-0 z-10">{name}'s journey to Puentes</h1>
      
      <DistanceDisplay 
        hasStarted={hasStarted}
        cities={cities}
        bridgeCounts={bridgeCounts}
        maxBridges={maxBridges}
      />
      
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
                    onMaxBridgesCalculated={(maxBridges) => handleMaxBridgesCalculated(city.name, maxBridges, milestones)}
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
        
        {/* Right side overlay - Milestones */}
        <MilestoneDisplay
          hasStarted={hasStarted}
          milestones={milestones}
          displayedMilestoneIndex={displayedMilestoneIndex}
          isTransitioning={isTransitioning}
          milestoneIndex={milestoneIndex}
          onStart={() => setHasStarted(true)}
          onWheel={handleWheel}
        />
      </div>

      <CameraControls
        hasStarted={hasStarted}
        isCameraLocked={isCameraLocked}
        onToggleLock={() => setIsCameraLocked(!isCameraLocked)}
      />
    </div>
  );
}

