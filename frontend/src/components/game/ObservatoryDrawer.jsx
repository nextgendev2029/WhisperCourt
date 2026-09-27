import React, { useState, useMemo } from 'react';

export default function ObservatoryDrawer({
  isOpen,
  onClose,
  socialHeat = [],
  contradictions = [],
  influenceEvents = [],
  socialEvents = [],
  claims = [],
  courtAnalysis = null,
  phase = 'discussion',
  roundNumber = 1,
  agents = [],
  onInspectRelationship = null,
  agentColor = () => '#C6A15B',
}) {
  const [activeTab, setActiveTab] = useState('heat'); // 'heat' | 'conflicts' | 'influence' | 'timeline' | 'analysis'

  const isPostGameUnlocked = phase === 'ended' || phase === 'reveal' || Boolean(courtAnalysis);

  // Compute most influential speaker leaderboard from influence events
  const influenceLeaderboard = useMemo(() => {
    const scores = {};
    influenceEvents.forEach(evt => {
      const sp = evt.speaker_name;
      scores[sp] = (scores[sp] || 0) + Math.abs(evt.delta);
    });
    return Object.entries(scores)
      .map(([name, impact]) => ({ name, impact }))
      .sort((a, b) => b.impact - a.impact);
  }, [influenceEvents]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] lg:w-[500px] bg-[#0A0C0F] border-l border-[#2B303E] shadow-2xl flex flex-col animate-slide-left select-none">
      {/* Top Gold Trim Accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent shrink-0" />

      {/* Header */}
      <div className="p-4 border-b border-[#1F232B] flex items-start justify-between bg-[#0B0D10] shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#C6A15B] text-base font-serif">⚜</span>
            <h2 className="font-title text-sm tracking-[0.2em] uppercase text-[#E8DEC8] font-bold">
              THE OBSERVATORY
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 border border-[#3A3324] bg-[#161410] text-[#D8B774]">
              Round {roundNumber}
            </span>
          </div>
          <p className="text-[11px] text-[#8A857A] font-serif italic mt-0.5">
            Emergent Social Reasoning • Claims • Conflicts • Influence • Tension
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-[#726E65] hover:text-[#E8DEC8] text-sm p-1 transition-colors cursor-pointer"
          title="Close Observatory"
        >
          ✕
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-[#1F232B] bg-[#0E1015] px-2 overflow-x-auto shrink-0 text-xs font-title tracking-wider uppercase">
        <button
          onClick={() => setActiveTab('heat')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'heat'
              ? 'border-[#C6A15B] text-[#E8DEC8] font-bold bg-[#141720]/50'
              : 'border-transparent text-[#7A756C] hover:text-[#A8A295]'
          }`}
        >
          <span>🔥</span>
          <span>Social Heat ({socialHeat.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'conflicts'
              ? 'border-[#C6A15B] text-[#E8DEC8] font-bold bg-[#141720]/50'
              : 'border-transparent text-[#7A756C] hover:text-[#A8A295]'
          }`}
        >
          <span>⚠</span>
          <span>Conflicts ({contradictions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('influence')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'influence'
              ? 'border-[#C6A15B] text-[#E8DEC8] font-bold bg-[#141720]/50'
              : 'border-transparent text-[#7A756C] hover:text-[#A8A295]'
          }`}
        >
          <span>⇄</span>
          <span>Influence</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'border-[#C6A15B] text-[#E8DEC8] font-bold bg-[#141720]/50'
              : 'border-transparent text-[#7A756C] hover:text-[#A8A295]'
          }`}
        >
          <span>📜</span>
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'analysis'
              ? 'border-[#C6A15B] text-[#E8DEC8] font-bold bg-[#141720]/50'
              : 'border-transparent text-[#7A756C] hover:text-[#A8A295]'
          }`}
        >
          <span>⚖</span>
          <span>Court Analysis</span>
          {isPostGameUnlocked && <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D5B] animate-pulse" />}
        </button>
      </div>

      {/* Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ── TAB 1: SOCIAL HEAT ── */}
        {activeTab === 'heat' && (
          <div className="space-y-3.5">
            <div className="p-3 bg-[#12141B] border border-[#1E232F] text-xs font-serif leading-relaxed text-[#A8A295]">
              <span className="font-title text-[10px] text-[#C6A15B] uppercase block font-semibold mb-1">
                Courtroom Tension Matrix
              </span>
              Social heat measures relational tension derived from mutual distrust, conflicting testimonies, and recent aggressive accusations.
            </div>

            {socialHeat.length === 0 ? (
              <p className="text-xs font-serif italic text-[#726E65] text-center py-6">
                Chamber is calm. Awaiting court deliberation...
              </p>
            ) : (
              <div className="space-y-2.5">
                {socialHeat.map((pair, idx) => {
                  const levelStyles = {
                    calm: { badge: 'bg-[#15231C] text-[#2E7D5B] border-[#2E7D5B]/40', label: 'CALM' },
                    watch: { badge: 'bg-[#161B24] text-[#A8A295] border-[#3D4559]', label: 'WATCH' },
                    tense: { badge: 'bg-[#2A2312] text-[#D8B774] border-[#8A6B2D]', label: 'TENSE' },
                    volatile: { badge: 'bg-[#2B1414] text-[#E88C8C] border-[#8A2626]', label: 'VOLATILE' },
                  }[pair.heat_level] || { badge: 'bg-[#161B24] text-[#A8A295]', label: 'CALM' };

                  return (
                    <div
                      key={idx}
                      onClick={() => onInspectRelationship && onInspectRelationship(pair.agent_a_id, pair.agent_b_id)}
                      className="p-3 bg-[#0F1116] border border-[#1F232B] hover:border-[#C6A15B]/50 transition-all cursor-pointer group"
                      title="Click to view detailed relationship dossier"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-title text-xs text-[#E8DEC8] font-bold group-hover:text-[#D8B774] transition-colors">
                            {pair.agent_a_name} ↔ {pair.agent_b_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 border ${levelStyles.badge}`}>
                            {levelStyles.label}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#E8DEC8]">
                            {pair.tension_score}
                          </span>
                        </div>
                      </div>

                      {/* Tension Bar */}
                      <div className="w-full h-1.5 bg-[#171920] overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all duration-500 ${
                            pair.heat_level === 'volatile'
                              ? 'bg-[#9B2C2C]'
                              : pair.heat_level === 'tense'
                              ? 'bg-[#C6A15B]'
                              : pair.heat_level === 'watch'
                              ? 'bg-[#8C8E94]'
                              : 'bg-[#2E7D5B]'
                          }`}
                          style={{ width: `${pair.tension_score}%` }}
                        />
                      </div>

                      {/* Contributing Factors */}
                      <div className="space-y-0.5">
                        {pair.factors?.map((factor, fIdx) => (
                          <span key={fIdx} className="text-[10px] text-[#7A756C] font-serif block italic">
                            • {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CONFLICTS & CONTRADICTIONS ── */}
        {activeTab === 'conflicts' && (
          <div className="space-y-3.5">
            <div className="p-3 bg-[#1F1414] border border-[#8A2626]/40 text-xs font-serif leading-relaxed text-[#D8B4B4]">
              <span className="font-title text-[10px] text-[#E88C8C] uppercase block font-semibold mb-1">
                Contradiction Ledger
              </span>
              The court records irreconcilable differences between testimonies. The council does not declare guilt prematurely; only that two spoken claims cannot both be true.
            </div>

            {contradictions.length === 0 ? (
              <p className="text-xs font-serif italic text-[#726E65] text-center py-6">
                No formal contradictions detected on record yet.
              </p>
            ) : (
              <div className="space-y-3">
                {contradictions.map((ct, idx) => (
                  <div key={idx} className="p-3.5 bg-[#12141A] border border-[#2A2E3D] space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] uppercase px-2 py-0.5 bg-[#2B1414] text-[#E88C8C] border border-[#8A2626]">
                        {ct.severity?.replace('_', ' ').toUpperCase() || 'CONFLICT'}
                      </span>
                      <span className="font-mono text-[10px] text-[#7A756C]">
                        Detected Round {ct.detected_round}
                      </span>
                    </div>

                    <p className="text-xs font-serif italic text-[#E8DEC8] leading-relaxed border-l-2 border-[#C6A15B] pl-2.5">
                      "{ct.description}"
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 bg-[#0B0D10] border border-[#1C2028]">
                        <span className="text-[9px] font-mono text-[#7A756C] uppercase block mb-0.5">
                          Speaker A
                        </span>
                        <span className="font-title text-xs text-[#C6A15B] font-bold block">
                          {ct.speaker_a}
                        </span>
                      </div>

                      <div className="p-2 bg-[#0B0D10] border border-[#1C2028]">
                        <span className="text-[9px] font-mono text-[#7A756C] uppercase block mb-0.5">
                          Speaker B
                        </span>
                        <span className="font-title text-xs text-[#C6A15B] font-bold block">
                          {ct.speaker_b}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: INFLUENCE ── */}
        {activeTab === 'influence' && (
          <div className="space-y-4">
            {/* Top Influencers Leaderboard */}
            {influenceLeaderboard.length > 0 && (
              <div>
                <span className="font-title text-[10px] uppercase tracking-wider text-[#C6A15B] block mb-2 font-semibold">
                  Court Sway: Most Influential Speakers
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {influenceLeaderboard.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-[#12141A] border border-[#1E232F] flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-mono text-[#7A756C] block">Rank #{idx + 1}</span>
                        <span className="font-title text-xs text-[#E8DEC8] font-bold">{item.name}</span>
                      </div>
                      <span className="font-mono text-xs text-[#C6A15B] font-bold">
                        {item.impact} pts sway
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Directional Influence Event Stream */}
            <div>
              <span className="font-title text-[10px] uppercase tracking-wider text-[#8A857A] block mb-2 font-semibold">
                Directional Shifts ({influenceEvents.length} recorded)
              </span>

              {influenceEvents.length === 0 ? (
                <p className="text-xs font-serif italic text-[#726E65] text-center py-6">
                  No influence events logged yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {influenceEvents.slice(-15).reverse().map((evt, idx) => (
                    <div key={idx} className="p-2.5 bg-[#0F1116] border border-[#1F232B] flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-title text-xs text-[#E8DEC8]">
                          <span className="font-bold">{evt.speaker_name}</span>
                          <span className="text-[#C6A15B] font-mono">→ swayed →</span>
                          <span className="font-bold">{evt.evaluator_name}</span>
                        </div>
                        <span className="text-[10px] font-serif italic text-[#7A756C] block">
                          Reason: {evt.reason}
                        </span>
                      </div>

                      <span
                        className={`font-mono font-bold text-xs px-2 py-0.5 border ${
                          evt.delta > 0
                            ? 'bg-[#15231C] text-[#2E7D5B] border-[#2E7D5B]/40'
                            : 'bg-[#2B1414] text-[#C53030] border-[#8A2626]/40'
                        }`}
                      >
                        {evt.delta > 0 ? `+${evt.delta}` : evt.delta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: TIMELINE ── */}
        {activeTab === 'timeline' && (
          <div className="space-y-3">
            <span className="font-title text-[10px] uppercase tracking-wider text-[#C6A15B] block mb-1 font-semibold">
              Chronological Event Stream
            </span>

            {socialEvents.length === 0 ? (
              <p className="text-xs font-serif italic text-[#726E65] text-center py-6">
                Chamber proceedings have commenced. Awaiting formal actions.
              </p>
            ) : (
              <div className="space-y-2">
                {socialEvents.slice(-25).reverse().map((ev, idx) => {
                  const badgeColor = {
                    STATEMENT: 'bg-[#14161C] text-[#A8A295] border-[#2E3342]',
                    QUESTION: 'bg-[#14232B] text-[#80D4F6] border-[#2B607A]',
                    ACCUSATION: 'bg-[#2B1414] text-[#E88C8C] border-[#8A2626]',
                    DEFENSE: 'bg-[#14231B] text-[#8CE8B5] border-[#2E7D5B]',
                    CONTRADICTION: 'bg-[#3A1414] text-[#FF9E9E] border-[#A83232]',
                    TRUST_CHANGE: 'bg-[#1F1E16] text-[#D8B774] border-[#8A6B2D]',
                    VOTE: 'bg-[#1F182A] text-[#CBB2FF] border-[#6D4AA8]',
                    ELIMINATION: 'bg-[#2B1010] text-[#FF6B6B] border-[#9B2C2C]',
                    ROLE_REVEAL: 'bg-[#1F2516] text-[#A8E88C] border-[#5A8A2E]',
                  }[ev.event_type] || 'bg-[#14161C] text-[#A8A295]';

                  return (
                    <div key={idx} className="p-2.5 bg-[#0D0F13] border border-[#1C2028] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className={`px-1.5 py-0.2 border uppercase ${badgeColor}`}>
                          {ev.event_type}
                        </span>
                        <span className="text-[#5A574E]">
                          Round {ev.round_number}
                        </span>
                      </div>
                      <p className="text-xs font-serif text-[#C8C2B4] leading-relaxed">
                        {ev.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: COURT ANALYSIS ── */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            {!isPostGameUnlocked ? (
              <div className="p-6 bg-[#101217] border border-[#1E222C] text-center space-y-3">
                <span className="text-2xl text-[#C6A15B] font-serif block">🔒</span>
                <h4 className="font-title text-xs uppercase tracking-widest text-[#E8DEC8] font-bold">
                  ROYAL RECORD SEALED
                </h4>
                <p className="text-xs font-serif italic text-[#8A857A] leading-relaxed max-w-xs mx-auto">
                  The deep post-game analysis and traitor suspicion trajectory remain locked until royal decrees conclude and secret alignments are unmasked.
                </p>
              </div>
            ) : courtAnalysis ? (
              <div className="space-y-4 animate-fade-in">
                {/* Traitor Banner */}
                <div className="p-4 bg-[#1F1212] border border-[#8A2626] text-center space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#E88C8C] block">
                    THE TRAITOR UNMASKED
                  </span>
                  <h3 className="font-title text-base text-[#FFFFFF] font-bold tracking-wide">
                    {courtAnalysis.traitor_name}
                  </h3>
                  <span className="text-xs font-serif italic text-[#D8B4B4]">
                    {courtAnalysis.outcome === 'innocents_win' ? '⚜ Banished by Council Decree' : '💀 Court Subjugated'}
                  </span>
                </div>

                {/* Narrative Summary */}
                <div className="p-3 bg-[#12141A] border border-[#1E232F] space-y-1">
                  <span className="font-title text-[10px] text-[#C6A15B] uppercase block font-semibold">
                    Historical Record
                  </span>
                  <p className="text-xs font-serif italic text-[#C8C2B4] leading-relaxed">
                    "{courtAnalysis.narrative_summary}"
                  </p>
                </div>

                {/* Turning Point & Suspicion Cards */}
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-3 bg-[#0F1116] border border-[#1F232B] space-y-1">
                    <span className="text-[9px] font-mono text-[#7A756C] uppercase block">
                      First Point of Suspicion
                    </span>
                    <span className="font-title text-xs text-[#E8DEC8] font-bold block">
                      Round {courtAnalysis.first_suspicion_round}
                    </span>
                    <p className="text-xs font-serif italic text-[#8A857A]">
                      Cause: {courtAnalysis.first_suspicion_text}
                    </p>
                  </div>

                  <div className="p-3 bg-[#0F1116] border border-[#1F232B] space-y-1">
                    <span className="text-[9px] font-mono text-[#7A756C] uppercase block">
                      Major Turning Point Testimony
                    </span>
                    <span className="font-title text-xs text-[#C6A15B] font-bold block">
                      {courtAnalysis.turning_point_speaker}
                    </span>
                    <p className="text-xs font-serif italic text-[#A8A295]">
                      "{courtAnalysis.turning_point_statement}"
                    </p>
                  </div>

                  {courtAnalysis.largest_trust_collapse?.summary && (
                    <div className="p-3 bg-[#1A1111] border border-[#8A2626]/40 space-y-1">
                      <span className="text-[9px] font-mono text-[#E88C8C] uppercase block">
                        Largest Trust Collapse
                      </span>
                      <p className="text-xs font-serif text-[#D8B4B4] font-semibold">
                        {courtAnalysis.largest_trust_collapse.summary}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-[#0F1116] border border-[#1F232B] space-y-1">
                    <span className="text-[9px] font-mono text-[#7A756C] uppercase block">
                      Critical Contradiction
                    </span>
                    <p className="text-xs font-serif italic text-[#C8C2B4]">
                      {courtAnalysis.critical_contradiction}
                    </p>
                  </div>

                  {courtAnalysis.final_coalition?.length > 0 && (
                    <div className="p-3 bg-[#111A14] border border-[#2E7D5B]/40 space-y-1">
                      <span className="text-[9px] font-mono text-[#8CE8B5] uppercase block">
                        Final Coalition of Innocents
                      </span>
                      <p className="font-title text-xs text-[#E8DEC8] font-semibold">
                        {courtAnalysis.final_coalition.join(' + ')}
                      </p>
                    </div>
                  )}

                  {/* Feature 17: Post-Game Agent Journeys */}
                  {courtAnalysis.agent_journeys && Object.keys(courtAnalysis.agent_journeys).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#1F232B]">
                      <span className="font-title text-[10px] uppercase tracking-wider text-[#C6A15B] block font-semibold">
                        Council Journeys & Verdicts
                      </span>
                      <div className="space-y-2">
                        {Object.values(courtAnalysis.agent_journeys).map((j, idx) => (
                          <div key={idx} className="p-3 bg-[#12141A] border border-[#1E232F] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-title text-xs font-bold text-[#E8DEC8]">
                                {j.agent_name}
                              </span>
                              <span
                                className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 border ${
                                  j.was_correct
                                    ? 'bg-[#15231C] text-[#4EBA87] border-[#236348]'
                                    : 'bg-[#2B1414] text-[#E88C8C] border-[#8A2626]'
                                }`}
                              >
                                {j.role === 'traitor'
                                  ? (j.was_correct ? 'VICTORIOUS TRAITOR' : 'EXPOSED TRAITOR')
                                  : (j.was_correct ? 'RIGHT ON VERDICT' : 'MISLED BY TRAITOR')}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-[#8C8578] flex items-center justify-between">
                              <span>Voted: <strong>{j.vote_target_name}</strong></span>
                              <span>Trust shift: <strong>{j.net_trust_delta_traitor >= 0 ? `+${j.net_trust_delta_traitor}` : j.net_trust_delta_traitor}</strong></span>
                            </div>
                            <p className="text-xs font-serif italic text-[#A8A295] leading-relaxed">
                              "{j.journey_summary}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs font-serif italic text-[#726E65] text-center py-6">
                Compiling retrospective analysis...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-[#0B0D10] border-t border-[#1F232B] flex items-center justify-between shrink-0">
        <span className="text-[10px] font-serif italic text-[#7A756C]">
          Authoritative living court observatory.
        </span>
        <button
          onClick={onClose}
          className="px-3 py-1 btn-court-secondary text-xs uppercase tracking-wider cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
