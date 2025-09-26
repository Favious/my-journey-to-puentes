interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  progress?: number;
  currentAsset?: string;
  showProgress?: boolean;
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  className = "min-h-screen bg-black flex items-center justify-center",
  progress = 0,
  currentAsset = "",
  showProgress = false
}: LoadingSpinnerProps) {
  return (
    <div className={className}>
      <div className="text-center max-w-md mx-auto px-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white text-lg mb-2">{message}</p>
        
        {showProgress && (
          <div className="space-y-3">
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-300 ease-out"
                style={{ 
                  width: '100%',
                  clipPath: `inset(0 ${100 - Math.min(100, Math.max(0, progress))}% 0 0)`
                }}
              ></div>
            </div>
            {currentAsset && progress < 100 && (
              <p className="text-white/50 text-xs">
                Getting assets: {currentAsset}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
