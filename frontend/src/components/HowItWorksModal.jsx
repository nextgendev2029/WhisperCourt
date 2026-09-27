import React from 'react';

export default function HowItWorksModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div 
        className="w-full max-w-2xl bg-[#0F1115] border border-[#2A2E38] shadow-2xl relative flex flex-col max-h-[88vh]"
        style={{ boxShadow: '0 0 50px rgba(0, 0, 0, 0.95), inset 0 0 30px rgba(198, 161, 91, 0.04)' }}
      >
        {/* Top Gold Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent opacity-90" />

        {/* Modal Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-[#23272E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#C6A15B] text-xl font-serif">⚜</span>
            <div>
              <h2 className="font-title text-base text-[#E8DEC8] tracking-widest uppercase">
                Codex of Whisper Court
              </h2>
              <p className="text-xs text-[#8A857A] font-serif italic">
                The 5 Principles of Autonomous Social Deduction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A857A] hover:text-[#E8DEC8] p-1.5 transition-colors cursor-pointer"
            title="Close Codex"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 sm:px-8 py-6 overflow-y-auto space-y-6 text-sm flex-1 leading-relaxed">
          {/* Dual Loops Visualization */}
          <div className="p-4 bg-[#0A0C0F] border border-[#232733] space-y-3">
            {/* Loop 1: Courtroom Loop */}
            <div>
              <span className="font-title text-[10px] uppercase tracking-wider text-[#C6A15B] block mb-1 font-semibold">
                I. THE COURTROOM LOOP
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-[#E8DEC8]">
                <span className="px-2 py-0.5 bg-[#14161F] border border-[#2A3142]">TESTIFY</span>
                <span className="text-[#C6A15B]">→</span>
                <span className="px-2 py-0.5 bg-[#14161F] border border-[#2A3142]">QUESTION</span>
                <span className="text-[#C6A15B]">→</span>
                <span className="px-2 py-0.5 bg-[#14161F] border border-[#2A3142]">TRUST SHIFTS</span>
                <span className="text-[#C6A15B]">→</span>
                <span className="px-2 py-0.5 bg-[#14161F] border border-[#2A3142]">INVESTIGATE</span>
                <span className="text-[#C6A15B]">→</span>
                <span className="px-2 py-0.5 bg-[#14161F] border border-[#2A3142]">VOTE</span>
                <span className="text-[#C6A15B]">→</span>
                <span className="px-2 py-0.5 bg-[#2B1414] border border-[#8A2626] text-[#E88C8C]">REVEAL</span>
              </div>
            </div>

            {/* Loop 2: Seat Continuity Loop */}
            <div className="pt-2 border-t border-[#1C202B]">
              <span className="font-title text-[10px] uppercase tracking-wider text-[#4EBA87] block mb-1 font-semibold">
                II. THE SEAT CONTINUITY LOOP (OUR DIFFERENTIATOR)
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-[#E8DEC8]">
                <span className="px-2 py-0.5 bg-[#14231B] border border-[#236348] text-[#8CE8B5]">PLAYER DEPARTS</span>
                <span className="text-[#4EBA87]">→</span>
                <span className="px-2 py-0.5 bg-[#251E14] border border-[#C6A15B]/70 text-[#D8B774]">AI CONTINUES SEAT</span>
                <span className="text-[#4EBA87]">→</span>
                <span className="px-2 py-0.5 bg-[#14231B] border border-[#236348] text-[#8CE8B5]">PLAYER RETURNS & RECLAIMS</span>
              </div>
            </div>
          </div>

          {/* 5 Concise Steps */}
          <div className="space-y-3.5">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full border border-[#C6A15B]/50 flex items-center justify-center font-mono text-xs text-[#C6A15B] shrink-0 bg-[#161820]">
                1
              </span>
              <div>
                <h4 className="font-title text-xs uppercase tracking-wider text-[#E8DEC8] font-bold">
                  The Traitor in the Shadows
                </h4>
                <p className="text-[#A8A295] text-xs font-serif leading-normal mt-0.5">
                  Exactly one noble is secretly chosen as the Traitor. Everyone operates under incomplete information - nobody is omniscient.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full border border-[#C6A15B]/50 flex items-center justify-center font-mono text-xs text-[#C6A15B] shrink-0 bg-[#161820]">
                2
              </span>
              <div>
                <h4 className="font-title text-xs uppercase tracking-wider text-[#E8DEC8] font-bold">
                  Living Social Memory
                </h4>
                <p className="text-[#A8A295] text-xs font-serif leading-normal mt-0.5">
                  Agents remember past testimonies, broken alliances, and previous votes. Spoken alibis are tested against prior statements.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full border border-[#C6A15B]/50 flex items-center justify-center font-mono text-xs text-[#C6A15B] shrink-0 bg-[#161820]">
                3
              </span>
              <div>
                <h4 className="font-title text-xs uppercase tracking-wider text-[#E8DEC8] font-bold">
                  Dynamic Trust & Contradictions
                </h4>
                <p className="text-[#A8A295] text-xs font-serif leading-normal mt-0.5">
                  Every statement updates private trust in real-time. When two statements collide, a public Contradiction is surfaced for inspection.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full border border-[#C6A15B]/50 flex items-center justify-center font-mono text-xs text-[#C6A15B] shrink-0 bg-[#161820]">
                4
              </span>
              <div>
                <h4 className="font-title text-xs uppercase tracking-wider text-[#E8DEC8] font-bold">
                  The Court Ballot & Exile
                </h4>
                <p className="text-[#A8A295] text-xs font-serif leading-normal mt-0.5">
                  When discussion closes, the assembly casts formal ballots. The suspect receiving the plurality is banished, and their true alignment is unmasked.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full border border-[#C6A15B]/50 flex items-center justify-center font-mono text-xs text-[#C6A15B] shrink-0 bg-[#161820]">
                5
              </span>
              <div>
                <h4 className="font-title text-xs uppercase tracking-wider text-[#E8DEC8] font-bold">
                  Living Seats (AI Continuity)
                </h4>
                <p className="text-[#A8A295] text-xs font-serif leading-normal mt-0.5">
                  If a player loses connection, an autonomous AI continues the character seamlessly. When the player reconnects, they reclaim their exact seat and history.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 sm:px-8 py-3.5 border-t border-[#23272E] bg-[#0B0D10] flex justify-between items-center">
          <span className="text-[10px] font-mono text-[#7A756C] tracking-wide">
            WHISPER COURT • 5 PRINCIPLES
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 btn-court-primary text-xs font-title tracking-widest uppercase cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
