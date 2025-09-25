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
  showCheck?: boolean;
  onCheck?: () => void;
  goToNextMilestone?: () => void;
  goToPrevMilestone?: () => void;
}

export default function MilestoneDisplay({
  hasStarted,
  milestones,
  displayedMilestoneIndex,
  isTransitioning,
  milestoneIndex,
  onStart,
  onWheel,
  showCheck,
  onCheck,
  goToNextMilestone,
  goToPrevMilestone
}: MilestoneDisplayProps) {
  const milestonesContainerRef = useRef<HTMLDivElement>(null);

  return (
    <>
    <div ref={milestonesContainerRef} data-milestones-container className="absolute top-0 right-2 w-[600px] h-full overflow-visible z-50 md:block hidden">
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
                                  <TypingText text={current?.description || ''} className="text-white text-left whitespace-pre-line text-lg md:text-xl" speedMs={5} />
                                </AutoHeight>
                                {showCheck ? (
                                  <div className="mt-6 flex justify-center">
                                    <button
                                      onClick={onCheck}
                                      className="px-6 py-3 rounded-full font-semibold text-black text-xl shadow-2xl bg-white"
                                    >
                                      SHOW PASS
                                    </button>
                                  </div>
                                ) : null}
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
    
    {/* Mobile version - centered */}
    <div data-milestones-container className="absolute top-0 left-0 w-full h-full overflow-visible z-50 md:hidden block">
      <div className="h-full w-full flex items-center justify-center bg-transparent relative px-4 flex-wrap">
        
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
            <div className="relative w-full flex-1 max-w-md mx-auto">
            
            <div className="glass-container glass-container--large relative z-50 rounded-xl p-6 w-full text-left overflow-visible mx-auto flex-shrink-0" style={{ minWidth: 'auto', maxWidth: '100%' }}>
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
                                  <div className="w-full mb-4">
                                    <img
                                      key={current.imageUrl}
                                      src={current.imageUrl}
                                      alt="Milestone"
                                      className="w-80 md:w-full h-48 object-cover rounded-lg"
                                      loading="eager"
                                      decoding="async"
                                      fetchPriority="high"
                                    />
                                  </div>
                                )}
                                <AutoHeight transitionMs={400}>
                                  <TypingText text={current?.description || ''} className="text-white text-left whitespace-pre-line text-base" speedMs={5} />
                                </AutoHeight>
                                {showCheck ? (
                                  <div className="mt-6 flex justify-center">
                                    <button
                                      onClick={onCheck}
                                      className="px-4 py-2 rounded-full font-semibold text-black text-base shadow-2xl bg-white"
                                    >
                                      Check Pass
                                    </button>
                                  </div>
                                ) : null}
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
            
            {/* Mobile Navigation Chevrons - Up/Down arrows outside glass container */}
            {milestones.length > 1 && goToPrevMilestone && goToNextMilestone && (
              <>
                {/* Previous button - Up arrow */}
                <button
                  onClick={goToPrevMilestone}
                  disabled={displayedMilestoneIndex === 0}
                  className={`absolute -top-9 left-1/2 transform -translate-x-1/2 z-60 w-8 h-8 flex items-center justify-center transition-all duration-200 ${
                    displayedMilestoneIndex === 0
                      ? 'text-white/40 cursor-not-allowed'
                      : 'text-white hover:text-white/80'
                  }`}
                >
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                
                {/* Next button - Down arrow */}
                <button
                  onClick={goToNextMilestone}
                  disabled={displayedMilestoneIndex === milestones.length - 1}
                  className={`absolute -bottom-9 left-1/2 transform -translate-x-1/2 z-60 w-8 h-8 flex items-center justify-center transition-all duration-200 ${
                    displayedMilestoneIndex === milestones.length - 1
                      ? 'text-white/40 cursor-not-allowed'
                      : 'text-white hover:text-white/80'
                  }`}
                >
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}