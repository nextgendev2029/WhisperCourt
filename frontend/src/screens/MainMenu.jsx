import React from 'react';

export default function MainMenu({
  onSelectPlaySolo,
  onOpenCreateCourt,
  onOpenJoinCourt,
  onSelectWatchCourt,
  onOpenHowItWorks,
  onOpenSettings,
}) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-8 select-none court-ambient-bg overflow-y-auto animate-fade-in">
      {/* Decorative Aristocratic Frame & Subtle Corner Flourishes */}
      <div className="absolute inset-4 pointer-events-none border border-[#C6A15B]/15">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#C6A15B]/50" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#C6A15B]/50" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#C6A15B]/50" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#C6A15B]/50" />
      </div>

      {/* Top Banner / Insignia Header */}
      <div className="w-full flex items-center justify-between max-w-4xl pt-1 z-10">
        <div className="flex items-center gap-2 text-[#C6A15B]/80 text-xs font-title tracking-[0.2em] uppercase">
          <span>⚜</span>
          <span>Imperial Assembly</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-[#8C8578]">
          <span className="hidden sm:inline">HIGH COUNCIL SESSION 1.0</span>
          <button
            onClick={onOpenSettings}
            className="hover:text-[#E8DEC8] transition-colors cursor-pointer text-[#C6A15B]/80 flex items-center gap-1"
            title="Settings"
          >
            <span>⚙</span>
            <span className="font-title uppercase tracking-widest text-[10px]">Settings</span>
          </button>
        </div>
      </div>

      {/* Main Center Title & Actions Block */}
      <div className="my-auto flex flex-col items-center text-center max-w-3xl z-10 py-6">
        {/* Emblem */}
        <div className="mb-3 relative">
          <div className="w-14 h-14 rounded-full border border-[#C6A15B]/30 flex items-center justify-center bg-[#0F1115]/80 shadow-[0_0_24px_rgba(198,161,91,0.15)]">
            <span className="text-2xl text-[#C6A15B] font-serif">⚜</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="font-title text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.22em] uppercase mb-2 text-gold-gradient drop-shadow-sm">
          WHISPER COURT
        </h1>

        {/* Tagline */}
        <div className="space-y-1 mb-4">
          <p className="font-title text-xs sm:text-sm text-[#C6A15B] tracking-[0.2em] uppercase font-bold">
            A SOCIAL DEDUCTION COURT WHERE THE AI NEVER LEAVES THE SEAT EMPTY.
          </p>
          <p className="text-xs sm:text-sm text-[#A8A295] max-w-lg mx-auto font-serif italic leading-relaxed">
            Question testimony. Track shifting trust. Follow contradictions. And if a player disappears, their character keeps playing.
          </p>
        </div>

        {/* Decorative Divider */}
        <div className="flex items-center justify-center gap-3 w-64 mb-6">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#C6A15B]/40" />
          <span className="text-[#C6A15B] text-xs">◇</span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#C6A15B]/40" />
        </div>

        {/* Primary Action Buttons */}
        <div className="w-full max-w-xs space-y-2.5 mb-8">
          {/* ENTER THE COURT (Play Solo / Quick Enter) */}
          <button
            onClick={onSelectPlaySolo}
            className="w-full py-3.5 px-6 btn-court-primary text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg group relative overflow-hidden font-bold tracking-widest"
          >
            <span className="relative z-10">ENTER THE COURT</span>
            <span className="text-xs text-[#C6A15B] group-hover:translate-x-1 transition-transform relative z-10">→</span>
          </button>

          {/* WATCH THE COURT (Demo Observation) */}
          <button
            onClick={onSelectWatchCourt}
            className="w-full py-3 px-6 bg-[#161820] hover:bg-[#20232E] border border-[#C6A15B]/50 hover:border-[#C6A15B] text-[#E8DEC8] text-xs font-title tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>WATCH THE COURT</span>
            <span className="text-[10px] text-[#C6A15B]">👁</span>
          </button>

          {/* HOW IT WORKS */}
          <button
            onClick={onOpenHowItWorks}
            className="w-full py-2.5 px-6 btn-court-secondary text-xs flex items-center justify-center gap-2 cursor-pointer hover:border-[#C6A15B]/40"
          >
            <span>HOW IT WORKS</span>
            <span className="text-[10px] text-[#A8A295]">📜</span>
          </button>

          {/* Secondary Room Controls */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onOpenCreateCourt}
              className="py-2 px-3 font-title text-[10px] text-[#8C8578] hover:text-[#E8DEC8] hover:border-[#383D4A] border border-[#1E222D] transition-all tracking-wider uppercase cursor-pointer"
            >
              Create Court
            </button>
            <button
              onClick={onOpenJoinCourt}
              className="py-2 px-3 font-title text-[10px] text-[#8C8578] hover:text-[#E8DEC8] hover:border-[#383D4A] border border-[#1E222D] transition-all tracking-wider uppercase cursor-pointer"
            >
              Join Court
            </button>
          </div>
        </div>

        {/* ── FEATURE 37: PRODUCT DIFFERENTIATOR PANEL ── */}
        <div className="w-full max-w-3xl border-t border-[#C6A15B]/20 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {/* 1. Living Seats */}
            <div className="p-4 bg-[#0E1015]/80 border border-[#1F232B] relative">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[#C6A15B] text-sm">⚙</span>
                <h3 className="font-title text-xs uppercase tracking-widest text-[#E8DEC8] font-bold">
                  LIVING SEATS
                </h3>
              </div>
              <p className="text-[11px] font-serif text-[#A8A295] leading-relaxed">
                Players can leave. The character continues. Autonomous AI temporarily assumes command until the lord returns to reclaim their exact standing.
              </p>
            </div>

            {/* 2. Social Memory */}
            <div className="p-4 bg-[#0E1015]/80 border border-[#1F232B] relative">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[#C6A15B] text-sm">🧠</span>
                <h3 className="font-title text-xs uppercase tracking-widest text-[#E8DEC8] font-bold">
                  SOCIAL MEMORY
                </h3>
              </div>
              <p className="text-[11px] font-serif text-[#A8A295] leading-relaxed">
                Agents remember relationships, contradictions, and previous decisions across rounds. Alibis are scrutinized, not forgotten.
              </p>
            </div>

            {/* 3. Social Observability */}
            <div className="p-4 bg-[#0E1015]/80 border border-[#1F232B] relative">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[#C6A15B] text-sm">🔍</span>
                <h3 className="font-title text-xs uppercase tracking-widest text-[#E8DEC8] font-bold">
                  SOCIAL OBSERVABILITY
                </h3>
              </div>
              <p className="text-[11px] font-serif text-[#A8A295] leading-relaxed">
                You can investigate why the court's beliefs changed. Inspect causal dossiers, claims, influence chains, and the underlying trust network.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="w-full max-w-3xl z-10 pt-2 text-center">
        <span className="text-[10px] font-mono text-[#5A574E] tracking-wider uppercase">
          Autonomous Social Deduction Engine • Zero Added LLM Budget • Deterministic Voting
        </span>
      </div>
    </div>
  );
}
