import React from 'react';

export default function GameMenuModal({
  isOpen,
  onClose,
  onResume,
  onRequestRestart,
  onRequestReturnMenu,
  onOpenSettings,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="w-full max-w-sm bg-[#0F1115] border border-[#2A2E38] shadow-2xl relative flex flex-col p-6 animate-slide-up text-center"
        style={{ boxShadow: '0 0 50px rgba(0, 0, 0, 0.95), inset 0 0 25px rgba(198, 161, 91, 0.03)' }}
      >
        {/* Top Gold Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent absolute top-0 left-0 opacity-80" />

        {/* Emblem & Title */}
        <div className="mb-4">
          <span className="text-2xl text-[#C6A15B] font-serif">⚜</span>
          <h2 className="font-title text-base text-[#E8DEC8] tracking-[0.2em] uppercase mt-1">
            CHAMBER RECESS
          </h2>
          <p className="text-xs text-[#8A857A] font-serif italic">
            Proceedings paused
          </p>
        </div>

        {/* Menu Buttons Stack */}
        <div className="space-y-2.5 my-3">
          {/* RESUME */}
          <button
            onClick={onResume || onClose}
            className="w-full py-2.5 px-4 btn-court-primary text-xs tracking-widest cursor-pointer shadow-md"
          >
            RESUME PROCEEDINGS
          </button>

          {/* RESTART COURT */}
          <button
            onClick={onRequestRestart}
            className="w-full py-2.5 px-4 btn-court-secondary text-xs tracking-wider cursor-pointer"
          >
            RESTART COURT
          </button>

          {/* RETURN TO MAIN MENU */}
          <button
            onClick={onRequestReturnMenu}
            className="w-full py-2.5 px-4 btn-court-secondary text-xs tracking-wider cursor-pointer hover:border-[#8A2626]/50 hover:text-[#E88C8C]"
          >
            RETURN TO MAIN MENU
          </button>

          {/* SETTINGS */}
          <button
            onClick={onOpenSettings}
            className="w-full py-2 px-4 font-title text-[11px] text-[#8C8578] hover:text-[#E8DEC8] border border-transparent hover:border-[#2C313C] transition-colors uppercase tracking-widest cursor-pointer pt-3"
          >
            ⚙ CHAMBER SETTINGS
          </button>
        </div>

        <div className="border-t border-[#1C2028] pt-3 mt-2">
          <span className="text-[10px] font-mono text-[#5A564F] uppercase tracking-wider">
            WHISPER COURT • SESSION IN PROGRESS
          </span>
        </div>
      </div>
    </div>
  );
}
