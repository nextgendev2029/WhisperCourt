import React from 'react';

const THINKING_PHRASES = {
  'Lord Ashwick': 'is examining the testimony...',
  'Sister Vael': 'is reconsidering her position...',
  'Mira Solenne': 'is weighing the accusation...',
  'Duchess Morvaine': "is measuring the court's sentiment...",
  'Brother Renner': 'is searching the silence...',
};

export default function ThinkingCard({ speakerName, archetype, color = '#C6A15B' }) {
  const phrase = THINKING_PHRASES[speakerName] || 'is preparing testimony before the court...';

  return (
    <div className="p-4 bg-[#0F1116] border border-[#2B303C] animate-fade-in shadow-md relative overflow-hidden max-w-[85%] select-none">
      {/* Subtle top shimmer accent */}
      <div 
        className="h-0.5 w-full absolute top-0 left-0 bg-gradient-to-r from-transparent via-[#C6A15B]/50 to-transparent" 
      />

      <div className="flex items-center gap-3">
        {/* Monogram Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center font-title font-bold text-xs shrink-0 border"
          style={{
            borderColor: color,
            color: color,
            backgroundColor: '#161922',
          }}
        >
          {speakerName?.[0] || '⚜'}
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-title text-xs font-semibold tracking-wider" style={{ color }}>
              {speakerName}
            </span>
            {archetype && (
              <span className="text-[11px] text-[#A8A295] font-serif italic">
                {archetype}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* 3 Restrained Pulsing Dots */}
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
            <span className="text-xs font-serif italic text-[#C6A15B]">
              {phrase}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
