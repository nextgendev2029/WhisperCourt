import React from 'react';
import { COURT_PERSONAS } from '../../data/personas';

export default function CourtRoster({
  agents = [],
  activeSpeakerId,
  selectedAgentId,
  onSelectAgent,
  agentColor,
  gmView = false,
  currentPlayerId = null,
  recentlyAccusedIds = [],
}) {
  return (
    <div className="bg-[#0D0F13] border-b border-[#1F232B] flex flex-col h-full select-none">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#1F232B] flex items-center justify-between bg-[#0A0C0F] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[#C6A15B] text-xs font-serif">⚜</span>
          <h3 className="font-title text-[11px] uppercase tracking-widest text-[#E8DEC8] font-bold">
            The Living Court
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#8C8578]">
          {agents.filter(a => a.is_alive).length} Seated / {agents.length} Total
        </span>
      </div>

      {/* Attendee List */}
      <div className="p-2 space-y-1.5 flex-1 min-h-0 overflow-y-auto">
        {agents.map((agent) => {
          const persona = COURT_PERSONAS.find(p => p.name === agent.name);
          const isSpeaking = activeSpeakerId === agent.id;
          const isSelected = selectedAgentId === agent.id;
          const isRecentlyAccused = recentlyAccusedIds.includes(agent.id);
          const color = agentColor(agent.id);
          const isCurrentPlayer = agent.player_id && agent.player_id === currentPlayerId;

          // Determine Control Badge
          let controlBadge = { text: 'AI', bg: 'bg-[#15171D]', border: 'border-[#2D323E]', color: 'text-[#8C8578]', dot: '#8C8578' };

          if (agent.controller_state === 'ai_takeover' || (agent.player_id && agent.control_type === 'ai')) {
            controlBadge = {
              text: 'AI - CONTINUING SEAT',
              bg: 'bg-[#251E14]',
              border: 'border-[#C6A15B]/70',
              color: 'text-[#D8B774]',
              dot: '#D8B774',
            };
          } else if (agent.controller_state === 'reclaimed') {
            controlBadge = {
              text: isCurrentPlayer ? 'YOU - SEAT RECLAIMED' : 'HUMAN - SEAT RECLAIMED',
              bg: 'bg-[#14231B]',
              border: 'border-[#236348]/70',
              color: 'text-[#4EBA87]',
              dot: '#4EBA87',
              pulse: true,
            };
          } else if (agent.control_type === 'human' && agent.connection_status === 'connected') {
            controlBadge = {
              text: isCurrentPlayer ? 'YOU' : 'HUMAN',
              bg: 'bg-[#14231B]',
              border: 'border-[#236348]/70',
              color: 'text-[#4EBA87]',
              dot: '#4EBA87',
              pulse: true,
            };
          } else if (agent.player_id && agent.connection_status === 'disconnected') {
            controlBadge = {
              text: 'RECONNECTING...',
              bg: 'bg-[#261E14]',
              border: 'border-[#D97706]/70',
              color: 'text-[#FBBF24]',
              dot: '#FBBF24',
              pulse: true,
            };
          }

          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={`px-3 py-2 border transition-all cursor-pointer flex items-center justify-between ${
                !agent.is_alive
                  ? 'border-[#1A1D24] bg-[#0A0B0E] opacity-50 text-[#6B7280]'
                  : isSpeaking
                    ? 'border-[#C6A15B] bg-[#1A1812] shadow-[0_0_12px_rgba(198,161,91,0.25)]'
                    : isSelected
                      ? 'border-[#C6A15B]/70 bg-[#141720]'
                      : 'border-[#1C2028] bg-[#101217] hover:border-[#2E3340]'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                {/* Status Dot / Active Indicator */}
                {agent.is_alive ? (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                      isSpeaking ? 'scale-125 animate-ping' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ) : (
                  <span className="text-[#8A2626] font-mono text-xs font-bold shrink-0">
                    ✕
                  </span>
                )}

                <div className="truncate">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`font-title text-xs font-semibold truncate ${
                        agent.is_alive ? 'text-[#E8DEC8]' : 'text-[#6B7280] line-through'
                      }`}
                    >
                      {agent.player_name && agent.player_name !== agent.name
                        ? `${agent.name} (${agent.player_name})`
                        : agent.name}
                    </span>
                    {isSpeaking && (
                      <span className="text-[9px] font-title text-[#C6A15B] uppercase tracking-wider animate-pulse">
                        Speaking
                      </span>
                    )}
                    {isRecentlyAccused && (
                      <span className="text-[8px] font-mono text-[#E88C8C] uppercase tracking-wider bg-[#2B1414] border border-[#8A2626]/50 px-1">
                        Accused
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#7A756C] font-serif italic truncate">
                    {persona?.archetype || agent.personality || 'Courtier'}
                  </p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {gmView && (
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 border ${
                      agent.role === 'traitor'
                        ? 'text-[#C53030] bg-[#2B1414] border-[#8A2626]'
                        : 'text-[#2E7D5B] bg-[#14261C] border-[#2E7D5B]/30'
                    }`}
                  >
                    {agent.role}
                  </span>
                )}

                {/* Control Type Badge */}
                <span
                  className={`text-[9px] font-title tracking-wider uppercase px-2 py-0.5 border flex items-center gap-1 transition-all ${controlBadge.bg} ${controlBadge.border} ${controlBadge.color}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${controlBadge.pulse ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: controlBadge.dot }}
                  />
                  {controlBadge.text}
                </span>

                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border ${
                    agent.is_alive
                      ? 'text-[#2E7D5B] bg-[#112017] border-[#2E7D5B]/30'
                      : 'text-[#C53030] bg-[#241313] border-[#8A2626]/30'
                  }`}
                >
                  {agent.is_alive ? 'ACTIVE' : 'EXILED'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
