import React from 'react';
import { COURT_PERSONAS } from '../../data/personas';

export default function DossierPanel({
  agent,
  recentTestimonies = [],
  onClose,
  agentColor = '#C6A15B',
  gmView = false,
}) {
  if (!agent) return null;

  const persona = COURT_PERSONAS.find(p => p.name === agent.name);
  const isHuman = agent.is_human;

  return (
    <div className="p-4 bg-[#0F1116] border border-[#2B303E] space-y-3.5 relative shadow-xl animate-slide-up">
      {/* Top Gold Accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C6A15B]/50 to-transparent absolute top-0 left-0" />

      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#1F232B] pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border flex items-center justify-center font-title font-bold text-xs shrink-0 shadow-inner"
            style={{
              borderColor: isHuman ? '#C6A15B' : agentColor,
              color: isHuman ? '#E8DEC8' : agentColor,
              backgroundColor: '#161922',
            }}
          >
            {isHuman ? 'YOU' : agent.name?.[0] || '⚜'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-title text-sm font-bold text-[#E8DEC8] tracking-wide">
                {isHuman ? `${agent.name} (You)` : agent.name}
              </h4>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 border ${
                  agent.is_alive
                    ? 'bg-[#15231C] text-[#2E7D5B] border-[#2E7D5B]/40'
                    : 'bg-[#2B1414] text-[#C53030] border-[#8A2626]/40'
                }`}
              >
                {agent.is_alive ? 'SEATED' : 'EXILED'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`text-[9px] font-title uppercase tracking-wider px-1.5 py-0.5 border ${
                  agent.controller_state === 'ai_takeover'
                    ? 'bg-[#251E14] text-[#D8B774] border-[#C6A15B]/70'
                    : agent.controller_state === 'reclaimed'
                      ? 'bg-[#14231B] text-[#4EBA87] border-[#236348]/70'
                      : isHuman
                        ? 'bg-[#14231B] text-[#4EBA87] border-[#236348]/70'
                        : 'bg-[#15171D] text-[#8C8578] border-[#2D323E]'
                }`}
              >
                {agent.controller_state === 'ai_takeover'
                  ? 'AI - Continuing Seat'
                  : agent.controller_state === 'reclaimed'
                    ? 'Human - Seat Reclaimed'
                    : isHuman
                      ? 'Human Player'
                      : 'AI Sovereign'}
              </span>
            </div>

            <p className="text-xs text-[#C6A15B] font-serif italic mt-0.5">
              {isHuman ? 'Noble Council Member' : persona?.archetype || agent.personality}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-[#726E65] hover:text-[#E8DEC8] p-1 transition-colors cursor-pointer text-xs"
          title="Close Dossier"
        >
          ✕
        </button>
      </div>

      {/* Strategic Focus & Public Stance (Master Prompt 06) */}
      <div className="bg-[#12141A] border border-[#232734] p-2.5 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-title uppercase tracking-wider text-[#C6A15B]">
          <span>Current Public Stance</span>
          <span className="text-[#8C8578] font-mono text-[9px]">Strategic Focus</span>
        </div>
        <p className="text-xs text-[#E8DEC8] font-serif italic">
          "{agent.strategic_state?.public_position || 'Observing council testimonies and evaluating demeanor.'}"
        </p>
        {agent.strategic_state?.focus_agent_name && (
          <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-[#D8B774]">
            <span className="text-[#8C8578]">Scrutiny Target:</span>
            <span className="font-bold underline">{agent.strategic_state.focus_agent_name}</span>
          </div>
        )}
      </div>

      {/* Council Record Metrics (Feature 14) */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div className="bg-[#0A0C0F] border border-[#1C2028] p-1.5">
          <span className="text-[#8C8578] block text-[8px] uppercase font-mono">Accusations</span>
          <span className="text-[#C6A15B] font-mono font-bold text-xs">
            {agent.memory_ledger?.accusations_made?.length || 0}
          </span>
        </div>
        <div className="bg-[#0A0C0F] border border-[#1C2028] p-1.5">
          <span className="text-[#8C8578] block text-[8px] uppercase font-mono">Challenged</span>
          <span className="text-[#E8DEC8] font-mono font-bold text-xs">
            {agent.memory_ledger?.accusations_received?.length || 0}
          </span>
        </div>
        <div className="bg-[#0A0C0F] border border-[#1C2028] p-1.5">
          <span className="text-[#8C8578] block text-[8px] uppercase font-mono">Defended</span>
          <span className="text-[#4EBA87] font-mono font-bold text-xs">
            {agent.memory_ledger?.defended_agents?.length || 0}
          </span>
        </div>
      </div>

      {/* Public Profile Demeanor */}
      <div className="space-y-1">
        <span className="font-title text-[10px] uppercase tracking-wider text-[#8A857A]">
          Persona & Archetype
        </span>
        <p className="text-xs text-[#C8C2B4] font-serif leading-relaxed italic bg-[#0A0C0F] p-2.5 border border-[#1C2028]">
          "{persona?.summary || agent.personality || 'Attending royal council inquiries.'}"
        </p>
      </div>

      {/* Tone & Stance Attributes */}
      {persona && (
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="bg-[#12141A] p-2 border border-[#1E222C]">
            <span className="text-[#7A756C] font-mono uppercase block text-[9px]">Tone & Posture</span>
            <span className="text-[#E8DEC8] font-serif font-medium">{persona.tone}</span>
          </div>
          <div className="bg-[#12141A] p-2 border border-[#1E222C]">
            <span className="text-[#7A756C] font-mono uppercase block text-[9px]">Chamber Seal</span>
            <span className="text-[#E8DEC8] font-serif font-medium">{persona.seal} Imperial House</span>
          </div>
        </div>
      )}

      {/* Recent Statements in Court */}
      <div className="space-y-1.5 pt-1">
        <span className="font-title text-[10px] uppercase tracking-wider text-[#8A857A] flex items-center justify-between">
          <span>Recent Testimony in Chamber</span>
          <span className="font-mono text-[9px] text-[#5A574E]">{recentTestimonies.length} on record</span>
        </span>

        {recentTestimonies.length > 0 ? (
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {recentTestimonies.slice(-2).map((item, idx) => (
              <div key={idx} className="p-2 bg-[#0A0C0F] border border-[#1C2028] text-[11px] font-serif italic text-[#BDB7A8]">
                <span className="text-[9px] font-mono text-[#C6A15B] uppercase not-italic block mb-0.5">
                  Round {item.round_number || item.roundNumber}:
                </span>
                "{item.text}"
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[#5A574E] font-serif italic py-1">
            No formal statements recorded yet in current proceedings.
          </p>
        )}
      </div>

      {/* GM View Debug Reveal */}
      {gmView && (
        <div className="p-2 bg-[#2B2312] border border-[#C6A15B] text-center text-xs font-mono text-[#D8B774]">
          GM INSPECT: TRUE ALIGNMENT = <strong>{agent.role.toUpperCase()}</strong>
        </div>
      )}
    </div>
  );
}
