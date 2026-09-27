import React, { useState } from 'react';

export default function CourtLobby({
  room,
  currentPlayerId,
  onStartCourt,
  onLeaveCourt,
  isStarting = false,
}) {
  const [copied, setCopied] = useState(false);

  if (!room) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center court-ambient-bg text-[#E8DEC8]">
        <div className="flex items-center gap-3">
          <span className="animate-spin text-xl text-[#C6A15B]">⟳</span>
          <span className="font-serif tracking-widest uppercase text-xs">Summoning Court Records...</span>
        </div>
      </div>
    );
  }

  const joinCode = room.join_code || '-----';
  const seats = room.seats || [];
  const isHost = room.host_player_id === currentPlayerId;

  const humanCount = seats.filter((s) => s.control_type === 'human' && s.player_id).length;
  const aiReadyCount = seats.filter((s) => !s.player_id).length;
  const totalSeats = room.court_size || seats.length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 sm:px-6 py-8 select-none court-ambient-bg overflow-y-auto animate-fade-in">
      {/* Decorative Aristocratic Outer Frame */}
      <div className="fixed inset-4 pointer-events-none border border-[#C6A15B]/15 z-0">
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#C6A15B]/50" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#C6A15B]/50" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#C6A15B]/50" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#C6A15B]/50" />
      </div>

      {/* Top Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-2 text-[#C6A15B]/80 text-xs font-title tracking-[0.2em] uppercase">
          <span>⚜</span>
          <span>CHAMBER OF ASSEMBLY</span>
        </div>
        <button
          onClick={onLeaveCourt}
          className="text-xs font-title text-[#8C8578] hover:text-[#C53030] tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <span>✕</span>
          <span>LEAVE COURT</span>
        </button>
      </div>

      {/* Center Court Lobby Card */}
      <div className="my-auto w-full max-w-2xl z-10 py-6">
        <div className="bg-[#0F1115]/90 border border-[#C6A15B]/30 shadow-2xl p-6 sm:p-8 relative">
          {/* Header & Room Code Display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-[#C6A15B]/40 bg-[#161920] mb-3 text-[#C6A15B]">
              <span className="font-serif text-xl">⚜</span>
            </div>
            <h1 className="font-title text-2xl sm:text-3xl tracking-[0.22em] uppercase text-gold-gradient mb-1">
              WHISPER COURT
            </h1>
            <p className="text-xs font-serif italic text-[#8C8578] tracking-widest uppercase mb-4">
              SESSION CODE
            </p>

            {/* Room Code Badge */}
            <div className="inline-flex items-center gap-3 bg-[#14161C] border border-[#C6A15B]/40 px-5 py-2.5 shadow-[0_0_15px_rgba(198,161,91,0.08)]">
              <span className="font-mono text-2xl sm:text-3xl tracking-[0.35em] text-[#C6A15B] font-bold pl-2">
                {joinCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="ml-2 px-3 py-1 bg-[#1C1E26] hover:bg-[#252834] border border-[#3A404F] hover:border-[#C6A15B]/60 text-[10px] font-title tracking-wider text-[#E8DEC8] transition-all cursor-pointer"
                title="Copy Room Code to share with others"
              >
                {copied ? '✓ COPIED' : 'COPY CODE'}
              </button>
            </div>
            <p className="text-[11px] text-[#7A756C] font-serif italic mt-2.5">
              Share this code with other players to summon them into the session.
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-3 w-full mb-6">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#C6A15B]/30" />
            <span className="text-[#C6A15B] text-xs font-title tracking-[0.2em] uppercase text-[10px]">
              THE COURT ROSTER
            </span>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#C6A15B]/30" />
          </div>

          {/* Court Seats Roster */}
          <div className="space-y-2.5 mb-6">
            {seats.map((seat) => {
              const isCurrentPlayer = seat.player_id === currentPlayerId;
              const isOccupiedHuman = seat.control_type === 'human' && seat.player_id;

              return (
                <div
                  key={seat.seat_id}
                  className={`flex items-center justify-between p-3.5 border transition-all ${
                    isCurrentPlayer
                      ? 'bg-[#181B22] border-[#C6A15B]/60 shadow-[0_0_12px_rgba(198,161,91,0.08)]'
                      : isOccupiedHuman
                      ? 'bg-[#13151A] border-[#2E3340]'
                      : 'bg-[#0D0E12] border-[#1D2028] opacity-75'
                  }`}
                >
                  {/* Left: Avatar & Identity */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-title border ${
                        isCurrentPlayer
                          ? 'border-[#C6A15B] bg-[#C6A15B]/15 text-[#C6A15B]'
                          : isOccupiedHuman
                          ? 'border-[#4A5164] bg-[#1E212A] text-[#E8DEC8]'
                          : 'border-[#262A34] bg-[#101216] text-[#555C6E]'
                      }`}
                    >
                      {isOccupiedHuman ? (
                        <span>●</span>
                      ) : (
                        <span className="text-xs">○</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm text-[#E8DEC8] font-medium">
                          {isOccupiedHuman
                            ? seat.player_name || 'Noble Guest'
                            : seat.character_name}
                        </span>
                        {isCurrentPlayer && (
                          <span className="text-[10px] font-title px-1.5 py-0.5 bg-[#C6A15B]/20 border border-[#C6A15B]/50 text-[#C6A15B] tracking-widest uppercase">
                            YOU
                          </span>
                        )}
                        {seat.is_host && (
                          <span className="text-[10px] font-title px-1.5 py-0.5 bg-[#785E28]/30 border border-[#C6A15B]/40 text-[#D8B774] tracking-widest uppercase">
                            HOST
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#7A756C] font-serif italic">
                        {isOccupiedHuman
                          ? `Assigned to: ${seat.character_name} (${seat.character_title || 'Courtier'})`
                          : `Autonomous Agent • ${seat.character_title || 'Peer of the Realm'}`}
                      </div>
                    </div>
                  </div>

                  {/* Right: Controller Type Badge */}
                  <div>
                    {isOccupiedHuman ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1A231F] border border-[#236348]/60 text-[#4EBA87] text-[10px] font-title tracking-wider uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4EBA87] animate-pulse" />
                        HUMAN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#15171D] border border-[#2D323E] text-[#8C8578] text-[10px] font-title tracking-wider uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8C8578]" />
                        AI READY
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Court Status Summary Strip */}
          <div className="bg-[#121419] border border-[#232731] p-3 mb-6 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[#8C8578] font-title text-[10px] uppercase tracking-wider block">
                COURT STATUS
              </span>
              <div className="flex items-center gap-3 text-xs mt-0.5">
                <span className="text-[#4EBA87] font-mono">
                  {humanCount} HUMAN{humanCount !== 1 ? 'S' : ''}
                </span>
                <span className="text-[#8C8578] font-mono">•</span>
                <span className="text-[#C6A15B] font-mono">
                  {aiReadyCount} AI READY
                </span>
                <span className="text-[#8C8578] font-mono">•</span>
                <span className="text-[#A8A295] font-mono">{totalSeats} TOTAL SEATS</span>
              </div>
            </div>
            <div className="text-[11px] text-[#7A756C] font-serif italic text-right max-w-xs">
              Remaining empty seats will be commanded autonomously by the AI court engine.
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={onLeaveCourt}
              className="w-full sm:w-auto px-5 py-3 btn-court-secondary text-xs cursor-pointer flex-1"
            >
              LEAVE COURT
            </button>

            {isHost ? (
              <button
                onClick={onStartCourt}
                disabled={isStarting}
                className="w-full sm:w-auto px-8 py-3 btn-court-primary text-xs cursor-pointer font-bold tracking-widest flex items-center justify-center gap-2 flex-2 shadow-lg"
              >
                {isStarting ? (
                  <>
                    <span className="animate-spin text-sm">⟳</span>
                    <span>CONVENING THE HIGH COURT...</span>
                  </>
                ) : (
                  <>
                    <span>START COURT</span>
                    <span>⚜</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full sm:w-auto py-3 px-4 bg-[#14161C] border border-[#2B303C] text-center text-xs font-serif italic text-[#A8A295] flex-2">
                Waiting for Court Host to convene the session...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="w-full max-w-xl text-center z-10 pb-2">
        <p className="text-[11px] text-[#555C6E] font-serif italic">
          If any sovereign lord disconnects during proceedings, an autonomous AI peer will assume control of their seat without interrupting the Court.
        </p>
      </div>
    </div>
  );
}
