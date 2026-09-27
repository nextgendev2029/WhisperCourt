import React, { useState, useMemo } from 'react';
import { COURT_PERSONAS } from '../../data/personas';
import { courtAudio } from '../../utils/courtAudio';

export default function VotingView({
  livingAgents = [],
  trustData = {},
  contradictions = [],
  onCastVote,
  isProcessing = false,
  agentColor,
  currentAgentId = null,
  currentPlayerId = null,
}) {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [hasVotedFor, setHasVotedFor] = useState(null);

  // A voter cannot vote for themselves
  const eligibleSuspects = useMemo(() => {
    return livingAgents.filter(a => {
      if (currentAgentId && a.id === currentAgentId) return false;
      if (currentPlayerId && a.player_id === currentPlayerId) return false;
      if (!currentAgentId && !currentPlayerId && a.is_human) return false;
      return true;
    });
  }, [livingAgents, currentAgentId, currentPlayerId]);

  // Compute public suspicion score for each candidate based on average trust from peers
  const candidateMetrics = useMemo(() => {
    const metrics = {};
    for (const suspect of eligibleSuspects) {
      let sumTrust = 0;
      let count = 0;
      for (const [evaluatorId, targets] of Object.entries(trustData || {})) {
        if (evaluatorId !== suspect.id && targets && targets[suspect.id] !== undefined) {
          sumTrust += targets[suspect.id];
          count++;
        }
      }
      const avgTrust = count > 0 ? sumTrust / count : 50;

      // Suspicion level (lower trust = higher suspicion)
      let suspicionLevel = 'MEDIUM';
      let suspicionStyle = 'text-[#D4B56A] bg-[#2A2312] border-[#C6A15B]/40';
      if (avgTrust < 40) {
        suspicionLevel = 'HIGH';
        suspicionStyle = 'text-[#E88C8C] bg-[#2B1414] border-[#8A2626]';
      } else if (avgTrust > 62) {
        suspicionLevel = 'LOW';
        suspicionStyle = 'text-[#8CE8B5] bg-[#14261C] border-[#2E7D5B]/40';
      }

      // Check if involved in any contradiction
      const contradictionCount = (contradictions || []).filter(c =>
        c.agent_a_id === suspect.id || c.agent_b_id === suspect.id ||
        c.agent_a_name === suspect.name || c.agent_b_name === suspect.name
      ).length;

      metrics[suspect.id] = {
        avgTrust: Math.round(avgTrust),
        suspicionLevel,
        suspicionStyle,
        contradictionCount,
      };
    }
    return metrics;
  }, [eligibleSuspects, trustData, contradictions]);

  const handleVote = () => {
    if (!selectedAgentId || isProcessing) return;
    const target = eligibleSuspects.find(a => a.id === selectedAgentId);
    setHasVotedFor(target?.name || 'Selected Noble');
    courtAudio.playBallotSeal();
    onCastVote(selectedAgentId);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-fade-in select-none">
      <div 
        className="w-full max-w-3xl bg-[#0F1116] border border-[#3A1E1E] shadow-2xl relative flex flex-col p-6 sm:p-8 text-center max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 0 60px rgba(0, 0, 0, 0.98), inset 0 0 35px rgba(197, 48, 48, 0.08)' }}
      >
        {/* Top Crimson Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C53030] to-transparent absolute top-0 left-0" />

        {/* Header */}
        <div className="mb-6 space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-xs font-title tracking-[0.25em] text-[#C53030] uppercase font-bold">
            <span>⚖</span>
            <span>HIGH COUNCIL SESSION</span>
            <span>⚖</span>
          </div>
          <h2 className="font-title text-2xl md:text-3xl text-[#E8DEC8] tracking-[0.2em] uppercase font-bold text-gold-gradient">
            THE COURT MUST DECIDE
          </h2>
          <p className="text-xs sm:text-sm font-serif italic text-[#A8988A] max-w-md mx-auto leading-relaxed">
            Spoken testimonies are sealed. Who among this assembly can no longer be permitted to remain in the chamber?
          </p>
        </div>

        {hasVotedFor ? (
          /* Sealed Ballot & Waiting on Peers State */
          <div className="py-8 sm:py-12 space-y-5 animate-fade-in">
            <div className="w-14 h-14 rounded-full border border-[#C53030] flex items-center justify-center mx-auto bg-[#1A1010] shadow-[0_0_20px_rgba(197,48,48,0.3)]">
              <span className="text-2xl text-[#C53030]">🗳️</span>
            </div>

            <div className="space-y-1">
              <span className="font-title text-sm sm:text-base text-[#E8DEC8] uppercase tracking-widest block font-bold">
                BALLOT SEALED IN WAX
              </span>
              <p className="text-xs sm:text-sm font-serif italic text-[#C6A15B]">
                Your vote to banish <strong className="text-white not-italic">{hasVotedFor}</strong> has been cast.
              </p>
            </div>

            {/* Waiting on Council Peers Status */}
            <div className="max-w-md mx-auto p-4 bg-[#0A0C0F] border border-[#2A1818] text-left space-y-2.5">
              <span className="font-title text-[10px] text-[#A8988A] uppercase tracking-wider block border-b border-[#1A1212] pb-1">
                COUNCIL DELIBERATION STATUS
              </span>
              <div className="space-y-1.5 text-xs">
                {livingAgents.map(agent => {
                  const isYou = agent.id === currentAgentId || (currentPlayerId && agent.player_id === currentPlayerId);
                  return (
                    <div key={agent.id} className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#E8DEC8] flex items-center gap-1.5">
                        <span className="text-[#C6A15B]">⚜</span>
                        <span>{agent.name} {isYou ? '(You)' : ''}</span>
                      </span>
                      <span className={isYou ? 'text-[#4EBA87]' : 'text-[#8C8578] italic'}>
                        {isYou ? '✓ Ballot Cast' : 'Weighing council testimony...'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] font-mono text-[#7A6A6A] animate-pulse">
              Awaiting remaining council ballots & tallying decree...
            </p>
          </div>
        ) : (
          /* Ballot Suspect Cards */
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto p-1">
              {eligibleSuspects.map((agent) => {
                const persona = COURT_PERSONAS.find(p => p.name === agent.name);
                const isSelected = selectedAgentId === agent.id;
                const color = agentColor ? agentColor(agent.id) : '#C6A15B';
                const metrics = candidateMetrics[agent.id] || {
                  avgTrust: 50,
                  suspicionLevel: 'MEDIUM',
                  suspicionStyle: 'text-[#D4B56A] bg-[#2A2312] border-[#C6A15B]/40',
                  contradictionCount: 0,
                };

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`p-3.5 border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#C53030] bg-[#241313] shadow-[0_0_15px_rgba(197,48,48,0.3)] scale-[1.02]'
                        : 'border-[#221818] bg-[#110E0E] hover:border-[#3D2222]'
                    }`}
                  >
                    <div>
                      {/* Name & Badge Row */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className="w-7 h-7 rounded-full border flex items-center justify-center font-title font-bold text-xs shrink-0"
                            style={{
                              borderColor: color,
                              color,
                              backgroundColor: '#181212',
                            }}
                          >
                            {agent.name[0]}
                          </div>
                          <div className="truncate">
                            <h4 className="font-title text-xs font-bold text-[#E8DEC8] tracking-wider truncate">
                              {agent.name}
                            </h4>
                            <span className="text-[10px] text-[#8C7A7A] font-serif italic truncate block">
                              {persona?.archetype || 'Noble'}
                            </span>
                          </div>
                        </div>

                        {/* Suspicion Meter Pill */}
                        <span className={`text-[9px] font-mono uppercase px-2 py-0.5 border ${metrics.suspicionStyle}`}>
                          SUSPICION: {metrics.suspicionLevel}
                        </span>
                      </div>

                      {/* Character Summary */}
                      <p className="text-[11px] text-[#9A8A8A] font-serif italic line-clamp-2 leading-relaxed mb-2.5">
                        {persona?.summary || agent.personality}
                      </p>

                      {/* Contradiction Indicator if Any */}
                      {metrics.contradictionCount > 0 && (
                        <div className="flex items-center gap-1 text-[9px] font-mono text-[#E88C8C] mb-2 bg-[#2B1414] px-1.5 py-0.5 border border-[#8A2626]/50">
                          <span>⚡</span>
                          <span>Involved in {metrics.contradictionCount} contradiction</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#1C1212] flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase text-[#7A6A6A]">
                        Mean Peer Trust: {metrics.avgTrust}%
                      </span>
                      <span
                        className={`text-[9px] font-title uppercase px-2 py-0.5 border ${
                          isSelected
                            ? 'bg-[#3A1414] text-[#E88C8C] border-[#C53030]'
                            : 'bg-transparent text-[#6A5A5A] border-[#2A1818]'
                        }`}
                      >
                        {isSelected ? '✓ SELECTED' : 'MARK'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-[#2A1818] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-serif italic text-[#8A7A7A] text-left">
                The noble receiving the plurality of votes will be banished from court.
              </span>

              <button
                onClick={handleVote}
                disabled={!selectedAgentId || isProcessing}
                className="w-full sm:w-auto px-8 py-3 font-title text-xs uppercase tracking-widest border border-[#C53030] bg-[#2B1414] hover:bg-[#3D1A1A] text-[#E8DEC8] hover:text-white transition-all cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>SEAL & CAST BALLOT</span>
                <span className="text-[#C53030]">⚖</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
