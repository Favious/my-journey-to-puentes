import { useState, useRef, useEffect, useCallback } from 'react';

interface City {
  name: string;
  lat: number;
  lng: number;
  country: string;
  distance: number;
}

interface Milestone {
  description: string;
  imageUrl: string;
}

export function useMilestoneNavigation(
  milestones: Milestone[],
  cities: City[],
  maxBridges: { [key: string]: number },
  handleBridgeCountChange: (cityName: string, count: number) => void
) {
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [displayedMilestoneIndex, setDisplayedMilestoneIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevMilestoneIndex, setPrevMilestoneIndex] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const wheelCooldownRef = useRef(0);

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

  // Milestone controls (buttons) with cooldown shared with wheel
  const goToNextMilestone = useCallback(() => {
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
  }, [milestones.length, syncBridgesWithMilestone]);

  const goToPrevMilestone = useCallback(() => {
    const now = Date.now();
    const cooldownMs = 450; // sync with transition
    if (now - wheelCooldownRef.current < cooldownMs) return;
    wheelCooldownRef.current = now;
    setMilestoneIndex(prev => {
      const next = Math.max(prev - 1, 0);
      if (next !== prev) syncBridgesWithMilestone(next);
      return next;
    });
  }, [syncBridgesWithMilestone]);

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

  return {
    milestoneIndex,
    displayedMilestoneIndex,
    isTransitioning,
    prevMilestoneIndex,
    transitionDirection,
    goToNextMilestone,
    goToPrevMilestone,
    handleWheel,
    syncBridgesWithMilestone
  };
}
