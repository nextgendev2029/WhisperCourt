import React, { useState } from 'react';
import { COURT_PERSONAS } from '../data/personas';

export default function GameSetup({
  initialMode = 'solo',
  onBack,
  onBeginCourt,
  isInitializing = false,
}) {
  const [courtSize, setCourtSize] = useState(5);
  const [playerMode, setPlayerMode] = useState(initialMode); // 'solo' or 'spectator'
  const [gameMode] = useState('traitor'); // 'traitor' (active), 'heist' (coming soon)
  const [difficulty] = useState('intrigue'); // 'intrigue' (active), 'casual', 'ruthless' (coming soon)

  // Selected personas to preview based on court size
  const previewPersonas = COURT_PERSONAS.slice(0, courtSize);

  const handleStart = () => {
    if (isInitializing) return;
    onBeginCourt({
      courtSize,
      playerMode,
      numHumans: playerMode === 'solo' ? 1 : 0,
      gameMode,
      difficulty,
    });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between px-6 py-6 court-ambient-bg select-none animate-fade-in overflow-y-auto">
      {/* Top Header */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between border-b border-[#23272E] pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            disabled={isInitializing}
            className="text-xs font-title text-[#8A857A] hover:text-[#E8DEC8] flex items-center gap-1.5 transition-colors cursor-pointer tracking-wider uppercase disabled:opacity-50"
          >
            <span>←</span>
            <span>Return to Chamber</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#C6A15B] text-base font-serif">⚜</span>
          <span className="font-title text-xs text-[#E8DEC8] tracking-[0.2em] uppercase">
            Whisper Court Setup
          </span>
        </div>
      </div>

      {/* Main Setup Content */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col gap-8 pb-8">
        {/* Title & Subtitle */}
        <div className="text-center space-y-1">
          <h1 className="font-title text-2xl sm:text-3xl text-[#E8DEC8] tracking-[0.18em] uppercase">
            ASSEMBLE THE COURT
          </h1>
          <p className="font-serif italic text-sm text-[#A8A295]">
            Configure the chamber hierarchy and witness attendees before proceedings commence.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Configuration Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-6 bg-[#0E1014] border border-[#23272E] p-6 shadow-xl relative">
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C6A15B]/40 to-transparent absolute top-0 left-0" />

            {/* 1. COURT SIZE */}
            <div className="space-y-2.5">
              <label className="font-title text-xs uppercase tracking-wider text-[#C6A15B] flex justify-between items-center">
                <span>1. Court Size</span>
                <span className="text-[10px] font-mono text-[#7A756C]">{courtSize} Seats</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[4, 5, 6].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCourtSize(size)}
                    disabled={isInitializing}
                    className={`py-2 px-3 text-xs font-title tracking-wider uppercase transition-all cursor-pointer border ${
                      courtSize === size
                        ? 'bg-[#1D2028] border-[#C6A15B] text-[#FFFFFF] shadow-[0_0_10px_rgba(198,161,91,0.2)]'
                        : 'bg-[#121417] border-[#2A2E38] text-[#8C8578] hover:border-[#3D4352] hover:text-[#E8DEC8]'
                    }`}
                  >
                    {size} {size === 5 ? '(Standard)' : 'Lords'}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. PLAYER MODE */}
            <div className="space-y-2.5">
              <label className="font-title text-xs uppercase tracking-wider text-[#C6A15B]">
                2. Player Mode
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setPlayerMode('solo')}
                  disabled={isInitializing}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    playerMode === 'solo'
                      ? 'bg-[#1A1D24] border-[#C6A15B] shadow-[0_0_10px_rgba(198,161,91,0.15)]'
                      : 'bg-[#121417] border-[#2A2E38] hover:border-[#3D4352]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-title text-xs text-[#E8DEC8] tracking-wider uppercase font-semibold">
                      Play As Court Member
                    </span>
                    {playerMode === 'solo' && (
                      <span className="text-[10px] font-mono text-[#C6A15B]">SELECTED</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8C8578] font-serif italic">
                    Take an active seat. Hear testimonies, interrogate suspects, and cast your decisive exile ballot.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPlayerMode('spectator')}
                  disabled={isInitializing}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    playerMode === 'spectator'
                      ? 'bg-[#1A1D24] border-[#C6A15B] shadow-[0_0_10px_rgba(198,161,91,0.15)]'
                      : 'bg-[#121417] border-[#2A2E38] hover:border-[#3D4352]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-title text-xs text-[#E8DEC8] tracking-wider uppercase font-semibold">
                      Watch AI Agents
                    </span>
                    {playerMode === 'spectator' && (
                      <span className="text-[10px] font-mono text-[#C6A15B]">SELECTED</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8C8578] font-serif italic">
                    Observe the assembly from the royal gallery as autonomous agents scheme, lie, and vote among themselves.
                  </p>
                </button>
              </div>
            </div>

            {/* 3. GAME MODE */}
            <div className="space-y-2.5">
              <label className="font-title text-xs uppercase tracking-wider text-[#C6A15B]">
                3. Mystery Scenario
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#171A21] border border-[#C6A15B]/60">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-title text-xs text-[#E8DEC8] tracking-wider uppercase">
                      The Traitor
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
                  </div>
                  <p className="text-[10px] text-[#8C8578] font-serif italic">
                    One concealed saboteur among loyal nobles.
                  </p>
                </div>

                <div className="p-2.5 bg-[#101215] border border-[#23272E] opacity-50 relative">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-title text-xs text-[#6B7280] tracking-wider uppercase">
                      The Heist
                    </span>
                    <span className="text-[9px] font-mono text-[#A89878] bg-[#221C11] px-1 py-0.2 border border-[#C6A15B]/30">
                      COMING SOON
                    </span>
                  </div>
                  <p className="text-[10px] text-[#555A64] font-serif italic">
                    Stolen imperial crown jewels.
                  </p>
                </div>
              </div>
            </div>

            {/* 4. DIFFICULTY */}
            <div className="space-y-2.5">
              <label className="font-title text-xs uppercase tracking-wider text-[#C6A15B]">
                4. Inquiry Depth
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div className="py-2 text-center border border-[#C6A15B]/50 bg-[#16181F]">
                  <span className="font-title text-[11px] text-[#E8DEC8] tracking-wider uppercase block">
                    Intrigue
                  </span>
                  <span className="text-[9px] text-[#7A756C] font-serif">Standard</span>
                </div>

                <div className="py-2 text-center border border-[#23272E] bg-[#0E1013] opacity-45">
                  <span className="font-title text-[11px] text-[#6B7280] tracking-wider uppercase block">
                    Casual
                  </span>
                  <span className="text-[9px] text-[#C6A15B]/70 font-mono">SOON</span>
                </div>

                <div className="py-2 text-center border border-[#23272E] bg-[#0E1013] opacity-45">
                  <span className="font-title text-[11px] text-[#6B7280] tracking-wider uppercase block">
                    Ruthless
                  </span>
                  <span className="text-[9px] text-[#C6A15B]/70 font-mono">SOON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Court Assembly Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#23272E] pb-2">
              <div>
                <h3 className="font-title text-xs uppercase tracking-wider text-[#E8DEC8]">
                  Court Preview ({courtSize} Dignitaries Assembled)
                </h3>
                <p className="text-xs text-[#8C8578] font-serif italic">
                  Identities confirmed for today's secret session. Roles remain strictly hidden.
                </p>
              </div>
              <span className="text-xs font-mono text-[#C6A15B]">
                1 SECRET TRAITOR
              </span>
            </div>

            {/* Character Cards Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {previewPersonas.map((persona, index) => (
                <div
                  key={persona.id}
                  className="p-3.5 bg-[#0F1116] border border-[#242833] hover:border-[#3D4352] transition-colors relative flex flex-col justify-between"
                  style={{ boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)' }}
                >
                  <div className="flex items-start gap-3 mb-2">
                    {/* Monogram Seal */}
                    <div className="w-10 h-10 rounded-full border border-[#C6A15B]/40 flex items-center justify-center bg-[#181B22] text-[#E8DEC8] font-title font-bold text-xs shrink-0 shadow-inner">
                      {persona.monogram}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-title text-xs font-bold text-[#E8DEC8] truncate tracking-wide">
                          {persona.name}
                        </h4>
                        <span className="text-[10px] text-[#7A756C] font-mono">#{index + 1}</span>
                      </div>
                      <p className="text-[11px] text-[#C6A15B] font-serif italic truncate">
                        {persona.archetype}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#8C8578] font-serif line-clamp-2 leading-relaxed mb-3">
                    {persona.summary}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1C2028] text-[10px]">
                    <span className="text-[#6B7280] font-mono uppercase tracking-wider">
                      {persona.tone}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-xs bg-[#16231D] text-[#2E7D5B] border border-[#2E7D5B]/30 font-mono">
                      CONFIRMED
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Note on Role Secrecy */}
            <div className="p-3 bg-[#13110E] border border-[#3D3019] flex items-center gap-3">
              <span className="text-[#C6A15B] text-base">⚖️</span>
              <p className="text-xs text-[#A89878] font-serif italic">
                The Crown has sealed all alignments. One of these attendees will attempt to deceive the council and evade accusation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="w-full max-w-5xl mx-auto border-t border-[#23272E] pt-4 flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={isInitializing}
          className="px-5 py-2.5 font-title text-xs text-[#8A857A] hover:text-[#E8DEC8] transition-colors cursor-pointer uppercase tracking-wider disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          onClick={handleStart}
          disabled={isInitializing}
          className="px-8 py-3 btn-court-primary text-sm flex items-center gap-3 cursor-pointer shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isInitializing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-[#C6A15B]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>ASSEMBLING COURT...</span>
            </>
          ) : (
            <>
              <span>BEGIN COURT</span>
              <span className="text-xs text-[#C6A15B]">⚜</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
