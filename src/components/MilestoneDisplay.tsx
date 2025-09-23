'use client';

import { useState, useEffect, useMemo } from 'react';

interface Milestone {
  description: string;
  imageUrl: string;
}

interface MilestoneDisplayProps {
  currentMilestone: number;
  totalMilestones: number;
  onMilestoneChange?: (milestone: number) => void;
  bridgeCount: number;
  maxBridges: number;
  homeCity: string;
  country: string;
  milestones: Milestone[];
}

export default function MilestoneDisplay({ 
  currentMilestone, 
  totalMilestones, 
  onMilestoneChange,
  bridgeCount,
  maxBridges,
  homeCity,
  country,
  milestones
}: MilestoneDisplayProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  
  const currentMilestoneData = milestones[currentMilestone - 1];
  const isCompleted = currentMilestone > 1;

  // Preload all milestone images
  useEffect(() => {
    const preloadImages = async () => {
      const imagePromises = milestones.map((milestone) => {
        if (milestone.imageUrl && !loadedImages.has(milestone.imageUrl)) {
          return new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              setLoadedImages(prev => new Set([...prev, milestone.imageUrl]));
              resolve(milestone.imageUrl);
            };
            img.onerror = reject;
            img.src = milestone.imageUrl;
          });
        }
        return Promise.resolve(milestone.imageUrl);
      });
      
      try {
        await Promise.all(imagePromises);
      } catch (error) {
        console.warn('Some images failed to preload:', error);
      }
    };

    preloadImages();
  }, [milestones, loadedImages]);

  // Handle image loading state for current milestone
  useEffect(() => {
    if (currentMilestoneData?.imageUrl) {
      if (loadedImages.has(currentMilestoneData.imageUrl)) {
        setImageLoading(false);
      } else {
        setImageLoading(true);
      }
    }
  }, [currentMilestoneData?.imageUrl, loadedImages]);

  const handleMilestoneClick = (milestoneId: number) => {
    // Allow clicking on any milestone
    if (onMilestoneChange && milestoneId >= 1 && milestoneId <= totalMilestones) {
      onMilestoneChange(milestoneId);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex items-center gap-8 max-w-4xl">
        {/* Image on the left */}
        <div className="flex-shrink-0">
          {currentMilestoneData?.imageUrl ? (
            <div className="relative w-40 h-40">
              {imageLoading ? (
                <div className="w-64 h-64 bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500">Loading...</span>
                </div>
              ) : (
                <img
                  src={currentMilestoneData.imageUrl}
                  alt={`Milestone ${currentMilestone}`}
                  className="w-40 h-40 object-cover"
                  loading="eager"
                  style={{ 
                    transition: 'opacity 0.2s ease-in-out',
                    opacity: loadedImages.has(currentMilestoneData.imageUrl) ? 1 : 0.5
                  }}
                />
              )}
            </div>
          ) : (
            <div className="w-64 h-64 bg-gray-300 flex items-center justify-center">
              <span className="text-gray-500">No image</span>
            </div>
          )}
        </div>

        {/* Milestone text on the right */}
        <div className="flex-1">
          <div className="text-white">
            {currentMilestoneData?.description ? (
              <p className="text-lg leading-relaxed">
                {currentMilestoneData.description}
              </p>
            ) : (
              <p className="text-lg leading-relaxed text-gray-400">
                No description available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
