import { useState, useRef, useEffect, useCallback } from 'react';
import { playBridgeClick, playBridgeDelete } from '../utils/soundUtils';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  distance: number;
}

export function useBridgeManagement() {
  const [bridgeCounts, setBridgeCounts] = useState<{ [key: string]: number }>({});
  const [maxBridges, setMaxBridges] = useState<{ [key: string]: number }>({});
  
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
  const smoothSetBridgeCount = useCallback((cityName: string, targetCount: number, stepDelayMs: number = 180) => {
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
  }, []);

  const handleBridgeCountChange = useCallback((cityName: string, count: number) => {
    // Use smooth, staggered increments for increases
    smoothSetBridgeCount(cityName, count, 180);
  }, [smoothSetBridgeCount]);

  const handleMaxBridgesCalculated = useCallback((cityName: string, maxBridges: number, milestones: any[]) => {
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
  }, [bridgeCounts, smoothSetBridgeCount]);

  return {
    bridgeCounts,
    maxBridges,
    handleBridgeCountChange,
    handleMaxBridgesCalculated,
    smoothSetBridgeCount
  };
}
