interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  className = "min-h-screen bg-black flex items-center justify-center" 
}: LoadingSpinnerProps) {
  return (
    <div className={className}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">{message}</p>
      </div>
    </div>
  );
}
