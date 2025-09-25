'use client';

interface CameraControlsProps {
  hasStarted: boolean;
  isCameraLocked: boolean;
  onToggleLock: () => void;
}

export default function CameraControls({ 
  hasStarted, 
  isCameraLocked, 
  onToggleLock 
}: CameraControlsProps) {
  if (!hasStarted) return null;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 hidden md:block">
      <button
        onClick={onToggleLock}
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
  );
}
