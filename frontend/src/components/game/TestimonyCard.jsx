import React from 'react';

const TAG_STYLES = {
  ACCUSATION: 'bg-[#2B1414] text-[#E88C8C] border-[#8A2626]',
  DEFENSE: 'bg-[#15231C] text-[#8CE8B5] border-[#2E7D5B]',
  QUESTION: 'bg-[#1B2230] text-[#90B8F8] border-[#3D527D]',
  CONTRADICTION: 'bg-[#302111] text-[#F3A45C] border-[#9E5E26]',
  OBSERVATION: 'bg-[#181B22] text-[#D8CEBC] border-[#383E4C]',
  TESTIMONY: 'bg-[#14161C] text-[#C6A15B] border-[#8A6B2D]/40',
};

export default function TestimonyCard({
  message,
  archetype,
  agentColor = '#C6A15B',
  gmView = false,
  isTraitor = false,
  isFocused = false,
  isDimmed = false,
  trustReactions = [],
  onInspectCharacter,
  onInspectEvidence,
}) {
  const isHuman = message.is_human || message.speakerName === 'You' || message.speakerId === 'human';

  // Determine context tag
  let tag = message.tag;
  if (!tag) {
    const textLower = (message.text || '').toLowerCase();
    if (textLower.includes('accuse') || textLower.includes('traitor') || textLower.includes('exile') || textLower.includes('guilty')) {
      tag = 'ACCUSATION';
    } else if (textLower.includes('never') || textLower.includes('deny') || textLower.includes('innocent') || textLower.includes('defend')) {
      tag = 'DEFENSE';
    } else if (textLower.includes('contradict') || textLower.includes('liar') || textLower.includes('untrue')) {
      tag = 'CONTRADICTION';
    } else if (textLower.includes('?') || textLower.includes('where') || textLower.includes('why')) {
      tag = 'QUESTION';
    } else if (textLower.includes('noticed') || textLower.includes('saw') || textLower.includes('watched') || textLower.includes('quiet')) {
      tag = 'OBSERVATION';
    } else {
      tag = 'TESTIMONY';
    }
  }

  return (
    <div
      className={`animate-slide-up transition-all duration-300 relative ${
        isHuman ? 'max-w-[95%] ml-auto' : 'max-w-[92%]'
      } ${isDimmed ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
    >
      <div
        className={`p-4 border shadow-sm transition-all duration-300 relative ${
          isHuman
            ? 'bg-[#13161C] border-[#C6A15B]/50'
            : isFocused
              ? 'bg-[#151820] border-[#C6A15B] shadow-[0_0_18px_rgba(198,161,91,0.22)]'
              : 'bg-[#101217] border-[#222630] hover:border-[#383E4C]'
        }`}
        style={{
          borderLeftWidth: isHuman ? 2 : 4,
          borderLeftColor: isHuman ? '#C6A15B' : agentColor,
        }}
      >
        {/* Active Spotlight Header */}
        {isFocused && (
          <div className="flex items-center gap-1.5 text-[9px] font-title uppercase tracking-widest text-[#C6A15B] mb-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-pulse" />
            <span>TESTIFYING BEFORE THE COURT</span>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            {/* Monogram Seal */}
            <div
              onClick={() => !isHuman && onInspectCharacter && onInspectCharacter(message.speakerId)}
              className={`w-7 h-7 rounded-full flex items-center justify-center font-title font-bold text-[11px] shrink-0 border ${
                !isHuman ? 'cursor-pointer hover:scale-105 transition-transform' : ''
              } ${isFocused ? 'ring-2 ring-[#C6A15B]/40' : ''}`}
              style={{
                borderColor: isHuman ? '#C6A15B' : agentColor,
                color: isHuman ? '#E8DEC8' : agentColor,
                backgroundColor: '#161922',
              }}
              title={!isHuman ? `Inspect ${message.speakerName}'s Dossier` : 'Your Character'}
            >
              {isHuman ? 'YOU' : message.speakerName?.[0] || '⚜'}
            </div>

            {/* Name & Archetype */}
            <div className="flex items-baseline gap-2 truncate">
              <span
                onClick={() => !isHuman && onInspectCharacter && onInspectCharacter(message.speakerId)}
                className={`font-title text-xs font-semibold tracking-wider ${
                  !isHuman ? 'cursor-pointer hover:underline' : ''
                }`}
                style={{ color: isHuman ? '#E8DEC8' : agentColor }}
              >
                {isHuman ? 'YOU' : message.speakerName}
              </span>

              <span className="text-[11px] text-[#8A857A] font-serif italic truncate">
                {isHuman ? 'Court Member' : archetype || 'Courtier'}
              </span>

              {/* GM View Secret Role Indicator */}
              {gmView && !isHuman && (
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 border uppercase ${
                    isTraitor
                      ? 'text-[#C53030] bg-[#2B1414] border-[#8A2626]'
                      : 'text-[#2E7D5B] bg-[#14261C] border-[#2E7D5B]/30'
                  }`}
                >
                  {isTraitor ? 'TRAITOR' : 'INNOCENT'}
                </span>
              )}
            </div>
          </div>

          {/* Right Tags */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`font-title text-[9px] font-semibold tracking-widest uppercase px-2 py-0.5 border ${
                TAG_STYLES[tag] || TAG_STYLES.TESTIMONY
              }`}
            >
              {tag}
            </span>

            <span className="text-[10px] text-[#55524A] font-mono">
              R{message.roundNumber}
            </span>
          </div>
        </div>

        {/* Statement Body */}
        <div className="font-serif text-xs leading-relaxed text-[#E8DEC8] pl-9">
          {message.target_name && tag === 'QUESTION' ? (
            <div>
              <span className="text-[#C6A15B] font-title text-[10px] uppercase tracking-wider block mb-0.5">
                Directed to {message.target_name}:
              </span>
              <p className="italic">"{message.text}"</p>
            </div>
          ) : (
            <p className="italic">"{message.text}"</p>
          )}
        </div>

        {/* Progressive Trust Reaction Badges (FEATURE 3: "3 AGENTS REACTED: Mira -14, Ash +5...") */}
        {trustReactions && trustReactions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-[#1C2028] flex flex-wrap items-center gap-1.5 pl-9 animate-fade-in">
            <span className="text-[9px] font-title uppercase tracking-wider text-[#8C8578] mr-1">
              Council Reaction:
            </span>
            {trustReactions.map((tr, i) => (
              <span
                key={i}
                className={`text-[9px] font-mono px-1.5 py-0.2 border ${
                  tr.delta > 0
                    ? 'text-[#8CE8B5] bg-[#112017] border-[#2E7D5B]/40'
                    : 'text-[#E88C8C] bg-[#221313] border-[#8A2626]/40'
                }`}
                title={tr.reason || ''}
              >
                {tr.evaluatorName} {tr.delta > 0 ? `+${tr.delta}` : tr.delta}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
