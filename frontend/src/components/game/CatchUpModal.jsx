import React from 'react';

export default function CatchUpModal({ isOpen, playerName = '', awaySeconds = 0, recentEvents = [], onClose }) {
  if (!isOpen) return null;

  const minutes = Math.floor(awaySeconds / 60);
  const seconds = awaySeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Analyze events for concise breakdown
  let testimoniesCount = 0;
  let trustChangesCount = 0;
  let contradictionsCount = 0;
  let votesCount = 0;

  recentEvents.forEach(evt => {
    const text = typeof evt === 'string' ? evt : evt.text || '';
    const lower = text.toLowerCase();
    if (lower.includes('statement') || lower.includes('spoke') || lower.includes('testimony')) {
      testimoniesCount++;
    } else if (lower.includes('trust') || lower.includes('shift') || lower.includes('evaluated')) {
      trustChangesCount++;
    } else if (lower.includes('contradict') || lower.includes('conflict')) {
      contradictionsCount++;
    } else if (lower.includes('vote') || lower.includes('ballot')) {
      votesCount++;
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div
        className="w-full max-w-md bg-[#0F1115] border border-[#C6A15B]/40 shadow-2xl p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto text-[#E8DEC8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#C6A15B]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#C6A15B]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#C6A15B]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#C6A15B]" />

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#236348]/60 bg-[#14231B] mb-2 text-[#4EBA87]">
            <span className="font-serif text-lg">⚜</span>
          </div>
          <h2 className="font-title text-xl tracking-[0.2em] uppercase text-gold-gradient">
            SEAT RECLAIMED
          </h2>
          <p className="text-xs font-serif italic text-[#C8C2B5] mt-1">
            {playerName ? `${playerName} has returned.` : 'You have returned.'} AI control ended.
          </p>
          <p className="text-[11px] font-serif text-[#8C8578] mt-0.5">
            Your previous court history remains intact.
          </p>
        </div>

        {/* Time away badge */}
        <div className="bg-[#14161C] border border-[#262B36] p-2.5 text-center mb-4">
          <span className="text-[9px] font-title uppercase tracking-widest text-[#8C8578] block">
            SESSION CONTINUITY DURATION
          </span>
          <span className="font-mono text-xl text-[#C6A15B] font-bold">
            {timeFormatted}
          </span>
        </div>

        {/* Concise metrics breakdown */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="p-2 bg-[#121419] border border-[#1F232D]">
            <span className="font-mono text-sm font-bold text-[#E8DEC8]">{testimoniesCount}</span>
            <span className="block text-[8px] font-mono uppercase text-[#7A756C]">Testimonies</span>
          </div>
          <div className="p-2 bg-[#121419] border border-[#1F232D]">
            <span className="font-mono text-sm font-bold text-[#C6A15B]">{trustChangesCount}</span>
            <span className="block text-[8px] font-mono uppercase text-[#7A756C]">Trust Shifts</span>
          </div>
          <div className="p-2 bg-[#121419] border border-[#1F232D]">
            <span className="font-mono text-sm font-bold text-[#E88C8C]">{contradictionsCount}</span>
            <span className="block text-[8px] font-mono uppercase text-[#7A756C]">Conflicts</span>
          </div>
          <div className="p-2 bg-[#121419] border border-[#1F232D]">
            <span className="font-mono text-sm font-bold text-[#A8A295]">{votesCount}</span>
            <span className="block text-[8px] font-mono uppercase text-[#7A756C]">Votes</span>
          </div>
        </div>

        {/* Chronological events during absence */}
        <div className="mb-6">
          <h3 className="text-[10px] font-title uppercase tracking-[0.15em] text-[#C6A15B] mb-2 font-semibold">
            WHILE YOU WERE AWAY
          </h3>
          <div className="bg-[#121419] border border-[#232731] p-3 max-h-40 overflow-y-auto space-y-2 text-xs font-serif">
            {recentEvents && recentEvents.length > 0 ? (
              recentEvents.map((evt, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[#C8C2B5] leading-relaxed">
                  <span className="text-[#C6A15B] text-[10px] mt-0.5">•</span>
                  <span>{typeof evt === 'string' ? evt : evt.text || JSON.stringify(evt)}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-[#7A756C] italic py-2 text-xs">
                The Court was deliberating silently or awaiting your re-entry.
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 btn-court-primary text-xs cursor-pointer font-bold tracking-widest flex items-center justify-center gap-2"
        >
          <span>REVIEW COURT</span>
          <span>⚜</span>
        </button>
      </div>
    </div>
  );
}
