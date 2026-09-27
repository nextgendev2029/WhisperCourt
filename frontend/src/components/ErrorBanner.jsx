import React from 'react';

export default function ErrorBanner({
  type = 'disconnect', // 'unavailable' | 'init_failed' | 'disconnect'
  message,
  onRetry,
  onReturnMenu,
}) {
  if (type === 'unavailable') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <div className="max-w-md w-full bg-[#121417] border border-[#8A2626] p-6 text-center space-y-4 shadow-2xl">
          <div className="text-2xl text-[#C53030]">⚖️</div>
          <h3 className="font-title text-base text-[#E8DEC8] uppercase tracking-wider">
            COURT CONNECTION LOST
          </h3>
          <p className="text-xs text-[#A8A295] font-serif italic">
            {message || 'The court could not be reached. Ensure the backend service is running on port 8000.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-5 py-2 btn-court-primary text-xs tracking-wider cursor-pointer"
              >
                TRY AGAIN
              </button>
            )}
            {onReturnMenu && (
              <button
                onClick={onReturnMenu}
                className="px-5 py-2 btn-court-secondary text-xs tracking-wider cursor-pointer"
              >
                RETURN TO MENU
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (type === 'init_failed') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
        <div className="max-w-md w-full bg-[#121417] border border-[#C6A15B] p-6 text-center space-y-4 shadow-2xl">
          <div className="text-2xl text-[#C6A15B]">⚜</div>
          <h3 className="font-title text-base text-[#E8DEC8] uppercase tracking-wider">
            THE COURT COULD NOT BE ASSEMBLED
          </h3>
          <p className="text-xs text-[#A8A295] font-serif italic">
            {message || 'An error occurred during chamber preparation. The council could not be seated.'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-5 py-2 btn-court-primary text-xs tracking-wider cursor-pointer"
              >
                TRY AGAIN
              </button>
            )}
            {onReturnMenu && (
              <button
                onClick={onReturnMenu}
                className="px-5 py-2 btn-court-secondary text-xs tracking-wider cursor-pointer"
              >
                RETURN TO MENU
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Regular floating reconnect alert
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-[#1F1710] border border-[#8A6B2D] px-4 py-2 flex items-center gap-3 shadow-xl animate-slide-up">
      <span className="w-2 h-2 rounded-full bg-[#D4B56A] animate-ping" />
      <span className="font-title text-xs text-[#E8DEC8] uppercase tracking-wider">
        CONNECTION INTERRUPTED
      </span>
      <span className="text-xs text-[#A89878] font-serif italic">
        Attempting to reconnect...
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 text-[10px] font-mono text-[#D4B56A] underline hover:text-white cursor-pointer uppercase"
        >
          Retry
        </button>
      )}
    </div>
  );
}
