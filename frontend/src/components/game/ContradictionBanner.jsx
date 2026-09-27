import React, { useState } from 'react';

export default function ContradictionBanner({
  contradiction,
  onInvestigate,
  onDismiss,
}) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!contradiction || isDismissed) return null;

  const {
    agent_a_name = 'Speaker A',
    claim_a = 'Statement recorded.',
    agent_b_name = 'Speaker B',
    claim_b = 'Conflicting account recorded.',
    description = 'Conflicting claims detected.',
    severity = 'HIGH',
  } = contradiction;

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <div className="w-full bg-[#1A1212] border-y sm:border border-[#8A2626]/70 shadow-[0_4px_20px_rgba(138,38,38,0.25)] p-3 sm:p-4 my-2 relative animate-slide-up select-none">
      {/* Top Gold/Crimson Accent Bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C53030] to-transparent absolute top-0 left-0" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[#C53030] text-sm animate-pulse">⚡</span>
          <span className="font-title text-[11px] uppercase tracking-[0.2em] font-bold text-[#E88C8C]">
            CONTRADICTION DETECTED
          </span>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 bg-[#2B1414] text-[#E88C8C] border border-[#8A2626]/60">
            {severity} CONFLICT
          </span>
        </div>

        <button
          onClick={handleDismiss}
          className="text-[#8C7A7A] hover:text-[#E8DEC8] text-xs px-1 cursor-pointer transition-colors"
          title="Dismiss Notice"
        >
          ✕
        </button>
      </div>

      {/* Conflicting Testimonies Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
        {/* Speaker A */}
        <div className="p-2.5 bg-[#120E0E] border border-[#301818]">
          <span className="font-title text-[10px] text-[#C6A15B] uppercase tracking-wider block font-semibold mb-1">
            {agent_a_name}:
          </span>
          <p className="font-serif italic text-[#D8CEBC] text-[11px] leading-snug">
            "{claim_a}"
          </p>
        </div>

        {/* Speaker B */}
        <div className="p-2.5 bg-[#120E0E] border border-[#301818]">
          <span className="font-title text-[10px] text-[#C6A15B] uppercase tracking-wider block font-semibold mb-1">
            {agent_b_name}:
          </span>
          <p className="font-serif italic text-[#D8CEBC] text-[11px] leading-snug">
            "{claim_b}"
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[#2A1616]">
        <span className="text-[10px] font-serif italic text-[#A8988A]">
          These accounts cannot both be true. The court must judge veracity.
        </span>

        <button
          onClick={() => {
            if (onInvestigate) onInvestigate(contradiction);
          }}
          className="px-4 py-1.5 bg-[#2B1414] hover:bg-[#3D1A1A] border border-[#8A2626] text-[#E88C8C] hover:text-white font-title text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <span>INVESTIGATE EVIDENCE</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
