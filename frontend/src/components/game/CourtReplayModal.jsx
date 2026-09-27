import React, { useState, useMemo } from 'react';

export default function CourtReplayModal({
  isOpen,
  onClose,
  socialEvents = [],
  messages = [],
  contradictions = [],
  socialHeat = [],
  agentColor,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine and sort chronological court events (read-only)
  const replayTimeline = useMemo(() => {
    // 1. Social events recorded by engine
    const events = (socialEvents || []).map((ev, i) => ({
      id: `se-${i}`,
      type: ev.event_type || 'social_event',
      round: ev.round_number || 1,
      sourceName: ev.actor_name || 'Agent',
      targetName: ev.target_name || 'Court',
      summary: ev.summary || ev.text || 'Court observation recorded.',
      trustDelta: ev.trust_delta || 0,
      heatDelta: ev.heat_delta || 0,
      timestamp: ev.timestamp || i,
    }));

    // If socialEvents is empty or small, supplement with messages
    if (events.length === 0 && messages.length > 0) {
      messages.forEach((msg, i) => {
        events.push({
          id: `msg-${i}`,
          type: msg.tag || 'testimony',
          round: msg.roundNumber || 1,
          sourceName: msg.speakerName || 'Noble',
          targetName: msg.target_name || 'The Court',
          summary: msg.text || 'Testimony delivered.',
          trustDelta: 0,
          heatDelta: 0,
          timestamp: i,
        });
      });
    }

    return events;
  }, [socialEvents, messages]);

  const totalEvents = replayTimeline.length;
  const currentEvent = replayTimeline[currentIndex] || null;

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentIndex < totalEvents - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-fade-in select-none">
      <div
        className="w-full max-w-3xl bg-[#0F1116] border border-[#2D3340] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ boxShadow: '0 0 60px rgba(0, 0, 0, 0.95), inset 0 0 30px rgba(198, 161, 91, 0.04)' }}
      >
        {/* Top Gold Foil Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1F232B] flex items-center justify-between bg-[#0A0C0F]">
          <div className="flex items-center gap-3">
            <span className="text-[#C6A15B] text-lg font-serif">⏪</span>
            <div>
              <h2 className="font-title text-sm uppercase tracking-widest text-[#E8DEC8] font-bold">
                Court Replay - Chronological Scrubber
              </h2>
              <p className="text-[10px] text-[#8C8578] font-serif italic">
                Step-by-step causal replay of court history • Read-only inspection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8C8578] hover:text-[#E8DEC8] text-sm p-1.5 transition-colors cursor-pointer"
            title="Close Replay"
          >
            ✕
          </button>
        </div>

        {/* Replay Scrubber Track */}
        <div className="px-6 py-4 border-b border-[#1F232B] bg-[#0E1015] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#A8A295]">
            <span className="font-title text-[#C6A15B] text-[11px] uppercase tracking-wider">
              {currentEvent ? `Round ${currentEvent.round}` : 'Round I'}
            </span>
            <span>
              EVENT {totalEvents > 0 ? currentIndex + 1 : 0} OF {totalEvents}
            </span>
          </div>

          {/* Slider Range */}
          <input
            type="range"
            min="0"
            max={Math.max(0, totalEvents - 1)}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-[#1F232B] rounded-lg appearance-none cursor-pointer accent-[#C6A15B]"
          />
        </div>

        {/* Main Event Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {totalEvents === 0 ? (
            <div className="text-center py-16 text-[#726E65]">
              <span className="text-3xl block mb-2">📜</span>
              <p className="font-serif italic text-sm">No historical events recorded yet.</p>
            </div>
          ) : (
            <>
              {/* Event Card */}
              <div className="p-5 bg-[#141720] border border-[#2D3340] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-title text-[10px] font-bold uppercase tracking-widest text-[#C6A15B] px-2 py-0.5 bg-[#251E14] border border-[#C6A15B]/40">
                    {currentEvent.type}
                  </span>
                  <span className="text-xs font-mono text-[#8C8578]">
                    Round {currentEvent.round}
                  </span>
                </div>

                <div className="text-sm font-serif text-[#E8DEC8] leading-relaxed">
                  <span className="font-title font-bold text-[#C6A15B] not-italic mr-2">
                    {currentEvent.sourceName}
                  </span>
                  {currentEvent.targetName && currentEvent.targetName !== 'Court' && (
                    <span className="text-[#8C8578] mr-2">→ {currentEvent.targetName}</span>
                  )}
                  <p className="italic mt-1.5 text-xs text-[#D8CEBC]">
                    "{currentEvent.summary}"
                  </p>
                </div>
              </div>

              {/* "WHAT CHANGED?" Causal Card */}
              <div className="p-4 bg-[#0D0F14] border border-[#232733] space-y-3">
                <div className="flex items-center gap-2 border-b border-[#1A1E27] pb-2">
                  <span className="text-[#C6A15B] text-xs">⚡</span>
                  <h4 className="font-title text-xs uppercase tracking-widest text-[#E8DEC8] font-semibold">
                    What Changed at This Moment?
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Trust Delta */}
                  <div className="p-3 bg-[#11131A] border border-[#1E222D]">
                    <span className="text-[10px] font-title uppercase tracking-wider text-[#8C8578] block mb-1">
                      Trust Impact
                    </span>
                    <span
                      className={`font-mono text-sm font-bold ${
                        currentEvent.trustDelta > 0
                          ? 'text-[#2E7D5B]'
                          : currentEvent.trustDelta < 0
                            ? 'text-[#C53030]'
                            : 'text-[#A8A295]'
                      }`}
                    >
                      {currentEvent.trustDelta > 0 ? `+${currentEvent.trustDelta}` : currentEvent.trustDelta !== 0 ? currentEvent.trustDelta : 'No Direct Shift'}
                    </span>
                    <span className="text-[10px] text-[#7A756C] font-serif italic block mt-0.5">
                      Between peers
                    </span>
                  </div>

                  {/* Social Heat */}
                  <div className="p-3 bg-[#11131A] border border-[#1E222D]">
                    <span className="text-[10px] font-title uppercase tracking-wider text-[#8C8578] block mb-1">
                      Social Tension
                    </span>
                    <span className="font-mono text-sm font-bold text-[#E8DEC8]">
                      {currentEvent.heatDelta > 0 ? `+${currentEvent.heatDelta} Heat` : 'Chamber Stance Maintained'}
                    </span>
                    <span className="text-[10px] text-[#7A756C] font-serif italic block mt-0.5">
                      Room atmosphere
                    </span>
                  </div>

                  {/* Contradiction Link */}
                  <div className="p-3 bg-[#11131A] border border-[#1E222D]">
                    <span className="text-[10px] font-title uppercase tracking-wider text-[#8C8578] block mb-1">
                      Contradictions
                    </span>
                    <span className="font-mono text-sm font-bold text-[#C6A15B]">
                      {contradictions.length} On Record
                    </span>
                    <span className="text-[10px] text-[#7A756C] font-serif italic block mt-0.5">
                      Cross-examined
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Controls Footer */}
        <div className="px-6 py-3.5 border-t border-[#1F232B] bg-[#0A0C0F] flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            className="px-4 py-2 bg-[#141720] hover:bg-[#1E222D] border border-[#2D3340] text-[#E8DEC8] text-xs font-title tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous Event
          </button>

          <span className="text-[11px] font-serif italic text-[#8C8578]">
            Replay operates strictly read-only on cached court history.
          </span>

          <button
            onClick={handleNext}
            disabled={currentIndex >= totalEvents - 1}
            className="px-4 py-2 btn-court-primary text-xs font-title tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next Event →
          </button>
        </div>
      </div>
    </div>
  );
}
