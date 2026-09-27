import React from 'react';

export default function CaseTimelineDrawer({
  isOpen,
  onClose,
  timelineEvents = [],
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0D0F13] border-l border-[#23272E] shadow-2xl flex flex-col animate-slide-up select-none">
      {/* Top Gold Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-[#C6A15B] via-[#E0C788] to-transparent" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1F232B] flex items-center justify-between bg-[#0A0C0F]">
        <div className="flex items-center gap-2.5">
          <span className="text-[#C6A15B] text-base font-serif">📜</span>
          <div>
            <h3 className="font-title text-xs uppercase tracking-widest text-[#E8DEC8] font-bold">
              Court Case Record
            </h3>
            <p className="text-[10px] text-[#7A756C] font-serif italic">
              Chronological log of formal charges, shifts, and decrees
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-[#726E65] hover:text-[#E8DEC8] p-1.5 transition-colors cursor-pointer text-xs"
        >
          ✕
        </button>
      </div>

      {/* Event Timeline Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {timelineEvents.length === 0 ? (
          <div className="text-center py-12 text-[#6A655C] font-serif italic text-xs">
            No formal court records filed yet.
          </div>
        ) : (
          timelineEvents.map((evt, idx) => (
            <div key={idx} className="border-l-2 border-[#C6A15B]/30 pl-3 py-1 space-y-1 relative">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#C6A15B] uppercase font-bold tracking-wider">
                  {evt.badge || 'EVENT'}
                </span>
                <span className="text-[#55524A]">
                  Round {evt.roundNumber || 1}
                </span>
              </div>

              <h4 className="font-title text-xs text-[#E8DEC8] font-medium leading-snug">
                {evt.title}
              </h4>

              {evt.detail && (
                <p className="text-[11px] font-serif italic text-[#A8A295] leading-relaxed">
                  "{evt.detail}"
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#1F232B] bg-[#0A0C0F] text-center">
        <span className="text-[10px] font-mono text-[#55524A] uppercase tracking-wider">
          OFFICIAL HIGH COUNCIL RECORD • SEALED
        </span>
      </div>
    </div>
  );
}
