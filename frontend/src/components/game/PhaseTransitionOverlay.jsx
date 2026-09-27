import React, { useEffect, useState } from 'react';

const PHASE_DETAILS = {
  convening: {
    badge: 'ROYAL DECREE',
    title: 'THE COURT CONVENES',
    subtitle: 'The chamber is locked. Every word carries consequence.',
    icon: '⚜',
    accent: '#C6A15B',
  },
  round_testimony: {
    badge: 'ROUND {round}',
    title: 'THE INQUIRY DEEPENS',
    subtitle: 'Alibis are challenged. Private trust shifts in silence.',
    icon: '📜',
    accent: '#C6A15B',
  },
  deliberation: {
    badge: 'CROSS-EXAMINATION',
    title: 'THE CHAMBER CONFRONTS',
    subtitle: 'Statements are weighed against the record.',
    icon: '⚔',
    accent: '#D4B56A',
  },
  voting: {
    badge: 'THE HIGH COUNCIL',
    title: 'THE BALLOT IS SUMMONED',
    subtitle: 'Discussion ends. Cast your vote of exile.',
    icon: '⚖',
    accent: '#C53030',
  },
  verdict: {
    badge: 'SOLEMN DECREE',
    title: 'THE VERDICT',
    subtitle: 'The council has spoken. Exile shall be executed.',
    icon: '🗡️',
    accent: '#C53030',
  },
  ended: {
    badge: 'INQUIRY CONCLUDED',
    title: 'REVELATION',
    subtitle: 'The hidden alignments are laid bare.',
    icon: '🕊️',
    accent: '#2E7D5B',
  },
};

export default function PhaseTransitionOverlay({
  currentPhase = 'discussion',
  roundNumber = 1,
  onComplete,
}) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let key = 'round_testimony';
    if (roundNumber === 1 && currentPhase === 'discussion') {
      key = 'convening';
    } else if (currentPhase === 'voting') {
      key = 'voting';
    } else if (currentPhase === 'reveal') {
      key = 'verdict';
    } else if (currentPhase === 'ended') {
      key = 'ended';
    } else {
      key = 'round_testimony';
    }

    const conf = PHASE_DETAILS[key] || PHASE_DETAILS.round_testimony;
    setConfig({
      ...conf,
      badge: conf.badge.replace('{round}', roundNumber),
    });
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, 1100);

    return () => clearTimeout(timer);
  }, [currentPhase, roundNumber, onComplete]);

  if (!visible || !config) return null;

  return (
    <div
      onClick={() => setVisible(false)}
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 animate-fade-in select-none"
    >
      <div className="text-center max-w-xl px-6 py-5 relative animate-slide-up">
        {/* Heraldic Insignia */}
        <div className="w-12 h-12 rounded-full border border-[#C6A15B]/40 flex items-center justify-center mx-auto mb-3 bg-[#0F1115]/90 shadow-[0_0_24px_rgba(198,161,91,0.2)]">
          <span className="text-xl font-serif" style={{ color: config.accent }}>
            {config.icon}
          </span>
        </div>

        {/* Phase Badge */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#C6A15B]/60" />
          <span className="font-title text-[10px] uppercase tracking-[0.25em] text-[#C6A15B] font-bold">
            {config.badge}
          </span>
          <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#C6A15B]/60" />
        </div>

        {/* Main Title */}
        <h1 className="font-title text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.2em] uppercase text-gold-gradient drop-shadow-md">
          {config.title}
        </h1>

        {/* Subtitle */}
        <p className="font-serif italic text-xs sm:text-sm text-[#A8A295] mt-2 tracking-wide">
          {config.subtitle}
        </p>
      </div>
    </div>
  );
}
