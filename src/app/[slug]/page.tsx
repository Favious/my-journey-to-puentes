'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useParams, useRouter } from 'next/navigation';
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
import CheckSection from '../../components/CheckSection';
import { BridgeModelProvider } from '../../components/BridgeModelLoader';
import { calculateDistance, SAN_FRANCISCO_COORDS } from '../../utils/distanceCalculation';
import LoadingSpinner from '../../components/LoadingSpinner';
import AssetPreloader from '../../components/AssetPreloader';
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
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [assetLoading, setAssetLoading] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [slugExists, setSlugExists] = useState<boolean | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentAsset, setCurrentAsset] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<{ description: string; imageUrl: string }[]>([]);
  const [bridgeColor, setBridgeColor] = useState<string>('#c0362c');
  const [name, setName] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
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

  // Asset preloading handlers
  const handleAssetProgress = useCallback((progress: number, assetName: string) => {
    setLoadingProgress(progress);
    setCurrentAsset(assetName);
  }, []);

  // Get dynamic loading message based on progress
  const getLoadingMessage = useCallback(() => {
    if (dataLoading) {
      return "Loading journey...";
    }
    
    if (!profileComplete) {
      return "Checking profile...";
    }
    
    if (loadingProgress < 30) {
      return "Preparing the world...";
    } else if (loadingProgress < 60) {
      return "Building the bridge...";
    } else if (loadingProgress < 90) {
      return "Adding final touches...";
    } else {
      return "Almost ready...";
    }
  }, [dataLoading, profileComplete, loadingProgress]);

  const handleAssetComplete = useCallback(() => {
    setAssetLoading(false);
  }, []);

  // Fetch journey by slug
  useEffect(() => {
    const load = async () => {
      let slug = '';
      try {
        if (!params?.slug) {
          console.log('No slug provided');
          return;
        }
        setError(null);
        setDataLoading(true);
        slug = params.slug as string;
        console.log('Loading slug:', slug);
        
        const engineersRef = collection(db, 'engineers');
        const q = query(engineersRef, where('slug', '==', slug));
        const snapshot = await getDocs(q);
        
        console.log('Query result:', { empty: snapshot.empty, size: snapshot.size });
        
        if (snapshot.empty) {
          console.log('No documents found for slug:', slug);
          setSlugExists(false);
          // Redirect to home page if slug doesn't exist
          router.push('/');
          return;
        }
        
        // Slug exists, mark it as valid
        setSlugExists(true);
        const doc = snapshot.docs[0];
        const data = doc.data() as any;
        const themeValue = data?.theme as string | undefined;
        const resolvedColor = (() => {
          if (!themeValue) return '#c0362c';
          if (typeof themeValue === 'string' && themeValue.startsWith('#')) return themeValue;
          if (themeValue === 'gold') return '#FFD700';
          if (themeValue === 'white') return '#ffffff';
          if (themeValue === 'international-orange') return '#c0362c';
          if (themeValue === 'antigravity-orange') return '#f25a26';
          return '#c0362c';
        })();
        setBridgeColor(resolvedColor);
        setName((data?.fullName as string) || '');
        setCoverImageUrl((data?.coverImageUrl as string) || '');
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
        console.log('Successfully loaded data for slug:', slug);
        
        // Check if profile is complete - if not, redirect to edit page
        const fullName = data?.fullName as string;
        if (!fullName || fullName.trim() === '') {
          console.log('Profile incomplete - redirecting to edit page');
          setRedirecting(true);
          router.push(`/${slug}/edit`);
          return;
        }
        
        // Profile is complete, mark it as such and start asset loading
        setProfileComplete(true);
        setAssetLoading(true);
      } catch (e) {
        console.error('Error loading slug:', slug, e);
        setError('Failed to load');
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, [params?.slug, router]);

  // Update overall loading state
  useEffect(() => {
    setLoading(dataLoading || (profileComplete && assetLoading));
  }, [dataLoading, profileComplete, assetLoading]);

  // Don't render anything until we know if the slug exists
  if (slugExists === false) {
    return (
      <div className="min-h-screen w-full bg-black relative overflow-hidden flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  // Don't render the main UI until we confirm the slug exists
  if (slugExists === null) {
    return (
      <div className="min-h-screen w-full bg-black relative overflow-hidden flex items-center justify-center">
        <LoadingSpinner 
          message="Checking journey..." 
          className="bg-transparent min-h-0 h-auto"
        />
      </div>
    );
  }

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

  // Determine if we're at the last milestone and bridges are complete
  const { showCheck, handleCheck } = useMemo(() => {
    const targetCity = cities.find(c => c.name !== 'San Francisco');
    const isLastMilestone = hasStarted && milestones.length > 0 && displayedMilestoneIndex === Math.max(0, milestones.length - 1);
    const isBridgesComplete = !!(targetCity && (bridgeCounts?.[targetCity.name] || 0) >= (maxBridges?.[targetCity.name] || 0) && (maxBridges?.[targetCity.name] || 0) > 0);
    return {
      showCheck: Boolean(isLastMilestone && isBridgesComplete),
      handleCheck: () => {
        const el = document.getElementById('check-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
  }, [cities, hasStarted, milestones.length, displayedMilestoneIndex, bridgeCounts, maxBridges]);

  // Lock page scroll until the last milestone is reached and bridges are complete
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (!showCheck) {
      body.style.overflow = 'hidden';
      body.style.height = '100vh';
      root.style.overflow = 'hidden';
      root.style.height = '100vh';
    } else {
      body.style.overflow = '';
      body.style.height = '';
      root.style.overflow = '';
      root.style.height = '';
    }
    return () => {
      body.style.overflow = '';
      body.style.height = '';
      root.style.overflow = '';
      root.style.height = '';
    };
  }, [showCheck]);

  // If redirecting, show a simple loading message
  if (redirecting) {
    return (
      <div className="min-h-screen w-full bg-black relative overflow-hidden flex items-center justify-center">
      </div>
    );
  }

  // Show a full-screen loader while fetching data and loading assets
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-black relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner 
            message={getLoadingMessage()} 
            className="bg-transparent min-h-0 h-auto"
            progress={profileComplete ? loadingProgress : 0}
            currentAsset={profileComplete ? currentAsset : ''}
            showProgress={profileComplete}
          />
        </div>
        {profileComplete && (
          <AssetPreloader 
            onComplete={handleAssetComplete}
            onProgress={handleAssetProgress}
          />
        )}
      </div>
    );
  }

  return (
    <>
    <div className="h-screen w-full overflow-hidden relative" style={{ height: '100vh', overflow: 'hidden' }}>
      <svg style={{ display: 'none' }}>
        <filter id="lg-dist" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
          <feDisplacementMap in="SourceGraphic" in2="blurred" scale="70" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <h1 className="font-bold text-center p-4 md:p-8 absolute top-0 left-0 right-0 z-10 tracking-wider text-4xl md:text-6xl lg:text-7xl" style={{ fontFamily: 'var(--font-bridge)' }}>
        {name.split(' ')[0]}'s journey to <span style={{ color: bridgeColor, fontWeight: 'bold' }}>Puentes</span>
      </h1>
      
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
            gl={{ antialias: true, alpha: false}}
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
              
              {/* Camera controller for following bridge construction - only active when journey has started */}
              {hasStarted ? (
                <CameraController
                  targetCity={cities?.find(city => city?.name !== 'San Francisco') || null}
                  bridgeCount={bridgeCounts?.[cities?.find(city => city?.name !== 'San Francisco')?.name || ''] || 0}
                  maxBridges={maxBridges?.[cities?.find(city => city?.name !== 'San Francisco')?.name || ''] || 1}
                  sanFrancisco={sanFrancisco}
                  isLocked={isCameraLocked && hasStarted}
                  milestoneIndex={milestoneIndex}
                  totalMilestones={Math.max(1, milestones.length || 6)}
                />
              ) : (
                <OrbitControls 
                  enableZoom={true} 
                  enablePan={true} 
                  enableRotate={true}
                  autoRotate={false}
                  enableDamping={false}
                  dampingFactor={0}
                />
              )}
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
          showCheck={showCheck}
          onCheck={handleCheck}
          goToNextMilestone={goToNextMilestone}
          goToPrevMilestone={goToPrevMilestone}
        />
      </div>

      <CameraControls
        hasStarted={hasStarted}
        isCameraLocked={isCameraLocked}
        onToggleLock={() => setIsCameraLocked(!isCameraLocked)}
      />
    </div>
    <CheckSection 
      id="check-section" 
      homeCountry={cities.find(c => c.name !== 'San Francisco')?.country}
      fullName={name}
      coverImageUrl={coverImageUrl}
    />
    </>
  );
}

