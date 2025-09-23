'use client';

import { useRef } from 'react';
import TypingText from './TypingText';
import AutoHeight from './AutoHeight';

interface Milestone {
  description: string;
  imageUrl: string;
}

interface MilestoneDisplayProps {
  hasStarted: boolean;
  milestones: Milestone[];
  displayedMilestoneIndex: number;
  isTransitioning: boolean;
  milestoneIndex: number;
  onStart: () => void;
  onWheel: (e: WheelEvent) => void;
}

export default function MilestoneDisplay({
  hasStarted,
  milestones,
  displayedMilestoneIndex,
  isTransitioning,
  milestoneIndex,
  onStart,
  onWheel
}: MilestoneDisplayProps) {
  const milestonesContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={milestonesContainerRef} data-milestones-container className="absolute top-0 right-2 w-[600px] h-full overflow-visible z-50">
      <div className="h-full w-full flex items-center justify-center bg-transparent relative">
        
        {!hasStarted ? (
          <div className="flex items-center justify-center">
            <button
              onClick={onStart}
              className="px-6 py-3 rounded-full font-semibold text-black text-xl shadow-2xl bg-white"
            >
              START 
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Step Indicator - positioned outside the glass container */}
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
            
            <div className="glass-container glass-container--large relative z-50 rounded-xl p-8 min-w-lg max-w-lg text-left overflow-visible">
              <div className="glass-filter"></div>
              <div className="glass-overlay"></div>
              <div className="glass-specular"></div>
              <div className="glass-content">
                {milestones.length === 0 ? (
                  <div className="text-gray-300">No milestones yet</div>
                ) : (
                  <div className="relative h-full w-full will-change-transform">
                    {(() => {
                      const targetIndex = isTransitioning ? milestoneIndex : displayedMilestoneIndex;
                      const prevIndex = displayedMilestoneIndex;
                      const prev = milestones[prevIndex];
                      const current = milestones[targetIndex];
                      return (
                        <>
                          {/* Current milestone layer */}
                          <div className="relative opacity-100">
                            {current ? (
                              <>
                                {current?.imageUrl && (
                                  <div className="w-112 mb-4">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}