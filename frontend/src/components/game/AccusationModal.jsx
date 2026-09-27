import React, { useState, useMemo, useEffect } from 'react';
import { COURT_PERSONAS } from '../../data/personas';

const ACCUSATION_REASONS = [
  'Contradictory timeline & inconsistent accounts',
  'Suspicious evasion and guarded demeanor',
  'Deflecting blame onto innocent nobles',
  'Convenient and uncorroborated alibi',
  'Covert alliance and suspicious protection',
];

export default function AccusationModal({
  isOpen,
  livingAgents = [],
  contradictions = [],
  onClose,
  onSubmitAccusation,
  isProcessing = false,
  currentAgentId = null,
  currentPlayerId = null,
}) {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reason, setReason] = useState(ACCUSATION_REASONS[0]);
  const [isConfirming, setIsConfirming] = useState(false);

  // Filter out the current player's own seat; ensure all other living courtiers are included
  const aiTargets = useMemo(() => {
    return (livingAgents || []).filter(a => {
      if (a.is_alive === false) return false;
      if (currentAgentId && a.id === currentAgentId) return false;
      if (currentPlayerId && a.player_id && a.player_id === currentPlayerId) return false;
      return true;
    });
  }, [livingAgents, currentAgentId, currentPlayerId]);

  // Ensure an available target is automatically selected upon opening
  useEffect(() => {
    if (isOpen) {
      setIsConfirming(false);
      if (aiTargets.length > 0 && (!selectedAgentId || !aiTargets.some(a => a.id === selectedAgentId))) {
        setSelectedAgentId(aiTargets[0].id);
      }
    }
  }, [isOpen, aiTargets, selectedAgentId]);

  if (!isOpen) return null;

  const targetAgent = aiTargets.find(a => a.id === selectedAgentId);

  const isValid = Boolean(selectedAgentId && reason && !isProcessing);
  let actionButtonText = 'Continue to Formal Charge →';
  if (isProcessing) {
    actionButtonText = 'Recording Charge...';
  } else if (!selectedAgentId) {
    actionButtonText = 'Select a Dignitary First';
  } else if (!reason) {
    actionButtonText = 'Select Grounds for Charge';
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    onSubmitAccusation(selectedAgentId, reason);
    setIsConfirming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#0F1115] border border-[#3A1E1E] shadow-2xl relative flex flex-col p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 0 45px rgba(0, 0, 0, 0.95), inset 0 0 25px rgba(197, 48, 48, 0.05)' }}
      >
        {/* Top Crimson Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C53030] to-transparent absolute top-0 left-0" />

        {/* Title */}
        <div className="flex items-center justify-between border-b border-[#2B1818] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[#C53030] text-lg font-serif">⚔</span>
            <div>
              <h3 className="font-title text-sm uppercase tracking-wider text-[#E8DEC8] font-bold">
                {isConfirming ? 'Confirm Formal Accusation' : 'Level Public Accusation'}
              </h3>
              <p className="text-xs text-[#A8988A] font-serif italic">
                {isConfirming ? 'This action is irreversible and carries severe social consequence.' : 'State your charges on record before the entire chamber.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsConfirming(false);
              onClose();
            }}
            disabled={isProcessing}
            className="text-[#726E65] hover:text-[#E8DEC8] p-1 transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {isConfirming ? (
          /* Consequential Confirmation Step */
          <div className="space-y-4 py-2 text-center animate-fade-in">
            <div className="p-4 bg-[#1E1111] border border-[#8A2626] text-left space-y-2">
              <span className="text-[10px] font-title uppercase tracking-widest text-[#E88C8C] block">
                FORMAL ACCUSATION UNDER DECREE
              </span>
              <p className="font-serif text-sm text-[#E8DEC8]">
                You are publicly accusing <strong className="text-[#C6A15B] font-title">{targetAgent?.name}</strong> of treachery against the Crown.
              </p>
              <div className="text-xs font-mono text-[#A8988A] border-t border-[#3A1E1E] pt-2 mt-2">
                Grounds: <span className="text-[#E8DEC8] italic font-serif">"{reason}"</span>
              </div>
            </div>

            <p className="text-xs font-serif italic text-[#A8988A]">
              This statement will permanently shift court trust and place {targetAgent?.name} under formal scrutiny.
            </p>

            <div className="pt-3 border-t border-[#231717] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="px-4 py-2 font-title text-xs text-[#8A857A] hover:text-[#E8DEC8] border border-[#231717] transition-colors cursor-pointer uppercase tracking-wider"
              >
                Withdraw
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isProcessing}
                className="px-6 py-2 font-title text-xs tracking-wider uppercase border border-[#C53030] bg-[#3B1414] hover:bg-[#4D1A1A] text-white transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span>Confirm Accusation ⚔</span>
              </button>
            </div>
          </div>
        ) : (
          /* Initial Target & Reason Selection */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Target Selector */}
            <div>
              <label className="font-title text-[11px] uppercase tracking-wider text-[#E88C8C] block mb-2 font-semibold">
                1. Accuse Which Dignitary:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {aiTargets.length === 0 ? (
                  <div className="col-span-2 p-3 text-center text-[#8C7A7A] border border-dashed border-[#3A1E1E] font-serif italic text-xs">
                    No other living courtiers available to accuse.
                  </div>
                ) : (
                  aiTargets.map((agent) => {
                    const persona = COURT_PERSONAS.find(p => p.name === agent.name);
                    const isSelected = selectedAgentId === agent.id;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`p-2.5 text-left border transition-all cursor-pointer flex items-center justify-between gap-2.5 relative ${
                          isSelected
                            ? 'border-[#C53030] bg-[#241313] ring-1 ring-[#C53030]/70 shadow-[0_0_12px_rgba(197,48,48,0.25)]'
                            : 'border-[#221616] bg-[#110E0E] hover:border-[#3A1E1E]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1">
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-title text-[10px] shrink-0 ${
                            isSelected ? 'border-[#C53030] text-[#E88C8C] bg-[#3B1414]' : 'border-[#4A3A3A] text-[#E8DEC8] bg-[#1A1010]'
                          }`}>
                            {agent.name[0]}
                          </div>
                          <div className="truncate">
                            <span className={`font-title text-[11px] block truncate font-semibold ${isSelected ? 'text-[#E88C8C]' : 'text-[#E8DEC8]'}`}>
                              {agent.name}
                            </span>
                            <span className="text-[10px] text-[#8C7A7A] font-serif italic truncate block">
                              {persona?.archetype || 'Noble'}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] font-title uppercase text-[#E88C8C] font-bold tracking-wider shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Formal Grounds / Reason */}
            <div>
              <label className="font-title text-[11px] uppercase tracking-wider text-[#E88C8C] block mb-2 font-semibold">
                2. Grounds for Accusation:
              </label>
              <div className="space-y-1.5">
                {ACCUSATION_REASONS.map((r, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-2.5 p-2 border cursor-pointer transition-colors ${
                      reason === r
                        ? 'border-[#C53030]/80 bg-[#1E1111] text-[#E8DEC8]'
                        : 'border-[#1C1414] bg-[#0E0C0C] text-[#9A8A8A] hover:border-[#2E1A1A]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-[#C53030]"
                    />
                    <span className="font-serif text-xs">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-[#231717] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-title text-xs text-[#8A857A] hover:text-[#E8DEC8] border border-[#231717] transition-colors cursor-pointer uppercase tracking-wider"
              >
                Withdraw
              </button>
              <button
                type="submit"
                disabled={!isValid}
                className="px-6 py-2 font-title text-xs tracking-wider uppercase border border-[#C53030] bg-[#2B1414] hover:bg-[#3D1A1A] text-[#E8DEC8] hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {actionButtonText}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
