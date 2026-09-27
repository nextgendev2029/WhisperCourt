import React from 'react';

const PHASE_LABELS = {
  discussion: 'Discussion',
  voting: 'Voting Decree',
  reveal: 'Verdict Unmasked',
  ended: 'Chamber Adjourned',
};

const PHASE_STYLES = {
  discussion: 'bg-[#181C26] text-[#E8DEC8] border-[#3D4559]',
  voting: 'bg-[#2B1414] text-[#E88C8C] border-[#8A2626]',
  reveal: 'bg-[#2A2312] text-[#D8B774] border-[#8A6B2D]',
  ended: 'bg-[#14231B] text-[#8CE8B5] border-[#2E7D5B]',
};

export default function CourtHeader({
  roundNumber = 1,
  phase = 'discussion',
  onOpenCaseTimeline,
  onOpenObservatory,
  onOpenMenu,
  onOpenReplay,
  onOpenTranscript,
  isAudioMuted = true,
  onToggleAudio,
  connected = true,
  gmView = false,
  isDemoMode = false,
  joinCode = null,
  activeContradictionsCount = 0,
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!joinCode) return;
    navigator.clipboard?.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 w-full bg-[#0B0D10] border-b border-[#23272E] px-4 sm:px-6 flex items-center justify-between z-30 select-none shrink-0">
      {/* Left: Title & Connection Indicator */}
      <div className="flex items-center gap-3">
        <span className="text-[#C6A15B] text-lg font-serif">⚜</span>
        <h1 className="font-title text-sm tracking-[0.2em] uppercase text-[#E8DEC8] font-bold hidden sm:inline">
          WHISPER COURT
        </h1>
        <div
          className={`w-2 h-2 rounded-full ${connected ? 'bg-[#2E7D5B]' : 'bg-[#C53030]'}`}
          title={connected ? 'Court Session Connected' : 'Court Connection Interrupted'}
        />

        {joinCode && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#14161C] border border-[#C6A15B]/40 hover:border-[#C6A15B] text-[#C6A15B] text-[10px] font-mono tracking-wider transition-colors cursor-pointer"
            title="Click to copy Room Code"
          >
            <span className="text-[#8C8578] font-title text-[9px]">CODE:</span>
            <span className="font-bold">{joinCode}</span>
            <span className="text-[9px] text-[#A8A295]">{copied ? '✓' : '❐'}</span>
          </button>
        )}

        {/* Demo Mode Badge */}
        {isDemoMode && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#14232B] border border-[#2B607A] text-[#80D4F6] text-[10px] font-mono uppercase tracking-wider animate-pulse">
            <span>🎬</span>
            <span>DEMO MODE</span>
          </span>
        )}
      </div>

      {/* Center: Round Counter & Phase Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-mono text-xs text-[#A8A295] bg-[#121418] px-3 py-1 border border-[#23272E]">
          <span className="text-[#7A756C] uppercase text-[10px]">Round</span>
          <span className="text-[#E8DEC8] font-semibold">{roundNumber}</span>
        </div>

        <span
          className={`font-title text-[11px] tracking-wider uppercase px-3 py-1 border ${
            PHASE_STYLES[phase] || PHASE_STYLES.discussion
          } ${phase === 'voting' ? 'phase-pulse' : ''}`}
        >
          {PHASE_LABELS[phase] || phase}
        </span>

        {/* GM View Warning Badge if active */}
        {gmView && (
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-[#2B2310] border border-[#C6A15B] text-[#D8B774] text-[10px] font-mono uppercase tracking-wider">
            <span>⚠️</span>
            <span>GM VIEW ACTIVE</span>
          </span>
        )}
      </div>

      {/* Right: In-Game Action Bar [ AUDIO ] [ REPLAY ] [ OBSERVATORY ] [ CASE ] [ MENU ] */}
      <div className="flex items-center gap-2">
        {/* Audio Mute/Unmute */}
        {onToggleAudio && (
          <button
            onClick={onToggleAudio}
            className={`px-2 py-1 font-title text-xs border transition-colors cursor-pointer ${
              isAudioMuted
                ? 'border-[#2D3340] bg-[#121419] text-[#7A756C] hover:text-[#A8A295]'
                : 'border-[#C6A15B]/50 bg-[#251E14] text-[#D8B774]'
            }`}
            title={isAudioMuted ? 'Courtroom Audio Muted (Click to Unmute)' : 'Courtroom Audio Enabled (Click to Mute)'}
          >
            <span>{isAudioMuted ? '🔇' : '🔊'}</span>
          </button>
        )}

        {/* Replay Quick Link */}
        {onOpenReplay && (
          <button
            onClick={onOpenReplay}
            className="px-2.5 py-1 font-title text-[11px] tracking-wider uppercase transition-colors cursor-pointer border border-[#2D3340] bg-[#121419] hover:bg-[#1A1D24] text-[#A8A295] hover:text-[#E8DEC8] hidden md:flex items-center gap-1"
            title="Court Replay (Chronological Event Scrubber)"
          >
            <span>⏪</span>
            <span>REPLAY</span>
          </button>
        )}

        <button
          onClick={onOpenObservatory}
          className="px-3 py-1 font-title text-[11px] tracking-wider uppercase transition-colors cursor-pointer border border-[#3A3324] bg-[#14120E] hover:bg-[#1F1C14] hover:border-[#C6A15B] text-[#D8B774] flex items-center gap-1.5 shadow-sm"
          title="Open The Agent Observatory (Social Heat, Conflicts, Influence, Court Analysis)"
        >
          <span>⚜</span>
          <span className="hidden sm:inline">OBSERVATORY</span>
          {activeContradictionsCount > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#E88C8C] animate-pulse" />
          )}
        </button>

        <button
          onClick={onOpenCaseTimeline}
          className="px-3 py-1 font-title text-[11px] tracking-wider uppercase transition-colors cursor-pointer border border-[#2D3340] bg-[#121419] hover:bg-[#1A1D24] text-[#A8A295] hover:text-[#E8DEC8] flex items-center gap-1.5"
          title="Open Court Record / Case Timeline"
        >
          <span>📜</span>
          <span className="hidden sm:inline">CASE</span>
        </button>

        <button
          onClick={onOpenMenu}
          className="px-3 py-1 font-title text-xs text-[#C6A15B] border border-[#3A3324] bg-[#161410] hover:bg-[#201D17] hover:border-[#C6A15B] transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
          title="Open Chamber Menu"
        >
          <span>☰</span>
          <span className="hidden sm:inline">MENU</span>
        </button>
      </div>
    </header>
  );
}
