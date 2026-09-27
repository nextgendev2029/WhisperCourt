import React, { useState } from 'react';

export default function CreateCourtModal({ isOpen, onClose, onCreateCourt, isLoading }) {
  const [courtSize, setCourtSize] = useState(5);
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('whisper_court_player_name') || 'Lord Regent'
  );
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError('Please declare your identity to enter the Court.');
      return;
    }
    localStorage.setItem('whisper_court_player_name', playerName.trim());
    setError(null);
    onCreateCourt({
      courtSize: Number(courtSize),
      playerName: playerName.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-[#0F1115] border border-[#C6A15B]/30 shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto text-[#E8DEC8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#C6A15B]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#C6A15B]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#C6A15B]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#C6A15B]" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#C6A15B]/40 bg-[#161920] mb-2 text-[#C6A15B]">
            <span className="font-serif text-lg">⚜</span>
          </div>
          <h2 className="font-title text-xl tracking-[0.2em] uppercase text-gold-gradient">
            CONVENE A COURT
          </h2>
          <p className="text-xs font-serif italic text-[#A8A295] mt-1">
            Establish a sovereign session where human lords and autonomous AI share judgment.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#381216]/60 border border-[#C53030]/50 text-[#F28B82] text-xs font-serif text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Player Identity */}
          <div>
            <label className="block text-[11px] font-title tracking-[0.14em] uppercase text-[#C6A15B] mb-1.5">
              YOUR COURT IDENTITY
            </label>
            <input
              type="text"
              maxLength={24}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Chancellor Vane"
              className="w-full bg-[#14161C] border border-[#2B303C] focus:border-[#C6A15B] px-3.5 py-2.5 text-sm text-[#E8DEC8] placeholder-[#555C6E] outline-none transition-colors"
            />
          </div>

          {/* Court Size */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-title tracking-[0.14em] uppercase text-[#C6A15B]">
                COURT SEATS
              </label>
              <span className="text-xs text-[#8C8578] font-mono">{courtSize} Seats Total</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[4, 5, 6].map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => setCourtSize(size)}
                  className={`py-2.5 text-xs font-title tracking-wider border transition-all cursor-pointer ${
                    courtSize === size
                      ? 'border-[#C6A15B] bg-[#C6A15B]/15 text-[#E8DEC8] shadow-[0_0_10px_rgba(198,161,91,0.2)]'
                      : 'border-[#262A34] bg-[#14161C] text-[#8C8578] hover:border-[#3E4554]'
                  }`}
                >
                  {size} SEATS
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#7A756C] font-serif italic mt-1.5">
              Unoccupied seats are automatically filled by autonomous AI peers.
            </p>
          </div>

          {/* Fixed Attributes Summary */}
          <div className="bg-[#121419] border border-[#232731] p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#8C8578] font-title text-[10px] uppercase tracking-wider">GAME MODE</span>
              <span className="text-[#E8DEC8] font-mono text-[11px]">THE TRAITOR (1 Hidden)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8C8578] font-title text-[10px] uppercase tracking-wider">CONTROL PARADIGM</span>
              <span className="text-[#C6A15B] font-mono text-[11px]">HUMANS + SEAT CONTINUITY</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 btn-court-secondary text-xs cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 btn-court-primary text-xs cursor-pointer font-bold tracking-wider flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin text-sm">⟳</span>
                  <span>CONVENING...</span>
                </>
              ) : (
                <>
                  <span>CONVENE COURT</span>
                  <span>⚜</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
