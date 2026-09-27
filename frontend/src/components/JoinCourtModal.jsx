import React, { useState } from 'react';

export default function JoinCourtModal({ isOpen, onClose, onJoinCourt, isLoading, serverError }) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('whisper_court_player_name') || 'Lady Envoy'
  );
  const [localError, setLocalError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setLocalError('Please enter a valid 5-character Court Code.');
      return;
    }
    if (!playerName.trim()) {
      setLocalError('Please declare your identity to take a seat.');
      return;
    }
    localStorage.setItem('whisper_court_player_name', playerName.trim());
    setLocalError(null);
    onJoinCourt({
      roomCode: cleanCode,
      playerName: playerName.trim(),
    });
  };

  const displayError = localError || serverError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-[#0F1115] border border-[#C6A15B]/30 shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto text-[#E8DEC8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#C6A15B]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#C6A15B]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#C6A15B]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#C6A15B]" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#C6A15B]/40 bg-[#161920] mb-2 text-[#C6A15B]">
            <span className="font-serif text-lg">🗝</span>
          </div>
          <h2 className="font-title text-xl tracking-[0.2em] uppercase text-gold-gradient">
            ENTER THE COURT
          </h2>
          <p className="text-xs font-serif italic text-[#A8A295] mt-1">
            Provide the imperial summons code to claim your seat in the chamber.
          </p>
        </div>

        {displayError && (
          <div className="mb-4 p-3 bg-[#381216]/60 border border-[#C53030]/50 text-[#F28B82] text-xs font-serif text-center uppercase tracking-wider">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Room Code Input */}
          <div>
            <label className="block text-[11px] font-title tracking-[0.14em] uppercase text-[#C6A15B] mb-1.5 text-center">
              ENTER ROOM CODE
            </label>
            <input
              type="text"
              maxLength={8}
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setLocalError(null);
              }}
              placeholder="V7K4P"
              autoFocus
              className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#C6A15B] px-4 py-3 text-center text-xl font-mono tracking-[0.3em] uppercase text-[#C6A15B] placeholder-[#404654] outline-none transition-colors"
            />
          </div>

          {/* Player Name */}
          <div>
            <label className="block text-[11px] font-title tracking-[0.14em] uppercase text-[#8C8578] mb-1.5">
              YOUR IDENTITY
            </label>
            <input
              type="text"
              maxLength={24}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Countess Priya"
              className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#C6A15B] px-3.5 py-2.5 text-sm text-[#E8DEC8] placeholder-[#555C6E] outline-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 btn-court-secondary text-xs cursor-pointer"
            >
              BACK
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 btn-court-primary text-xs cursor-pointer font-bold tracking-wider flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin text-sm">⟳</span>
                  <span>VERIFYING...</span>
                </>
              ) : (
                <>
                  <span>CLAIM SEAT</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
