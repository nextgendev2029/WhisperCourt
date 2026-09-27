import React, { useState, useMemo, useEffect } from 'react';
import { COURT_PERSONAS } from '../../data/personas';

const SUGGESTED_QUESTIONS = [
  'Where were you before the second bell rang?',
  'Why has your demeanor been so guarded today?',
  'Who among this assembly do you suspect most?',
  'Does your account not contradict what was stated earlier?',
];

export default function InterrogationModal({
  isOpen,
  livingAgents = [],
  trustData = {},
  contradictions = [],
  onClose,
  onSubmitQuestion,
  isProcessing = false,
  currentAgentId = null,
  currentPlayerId = null,
}) {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [questionText, setQuestionText] = useState('');

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
    if (isOpen && aiTargets.length > 0) {
      if (!selectedAgentId || !aiTargets.some(a => a.id === selectedAgentId)) {
        setSelectedAgentId(aiTargets[0].id);
      }
    }
  }, [isOpen, aiTargets, selectedAgentId]);

  if (!isOpen) return null;

  const isValid = Boolean(selectedAgentId && questionText.trim() && !isProcessing);
  let actionButtonText = 'Ask the Court →';
  if (isProcessing) {
    actionButtonText = 'Demanding Answer...';
  } else if (!selectedAgentId) {
    actionButtonText = 'Select a Courtier First';
  } else if (!questionText.trim()) {
    actionButtonText = 'Enter Your Question';
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmitQuestion(selectedAgentId, questionText.trim());
    setQuestionText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#0F1115] border border-[#2B303C] shadow-2xl relative flex flex-col p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 0 45px rgba(0, 0, 0, 0.95), inset 0 0 25px rgba(198, 161, 91, 0.03)' }}
      >
        {/* Top Gold Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent absolute top-0 left-0" />

        {/* Title */}
        <div className="flex items-center justify-between border-b border-[#1F232B] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[#C6A15B] text-lg font-serif">❓</span>
            <div>
              <h3 className="font-title text-sm uppercase tracking-wider text-[#E8DEC8] font-bold">
                Interrogate a Courtier
              </h3>
              <p className="text-xs text-[#8A857A] font-serif italic">
                Demand an immediate spoken response from an assembled noble.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-[#726E65] hover:text-[#E8DEC8] p-1 transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Target Selector */}
          <div>
            <label className="font-title text-[11px] uppercase tracking-wider text-[#C6A15B] block mb-2 font-semibold">
              1. Select Noble to Question:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {aiTargets.length === 0 ? (
                <div className="col-span-2 p-3 text-center text-[#7A756C] border border-dashed border-[#1C2028] font-serif italic text-xs">
                  No other living courtiers available to question.
                </div>
              ) : (
                aiTargets.map((agent) => {
                  const persona = COURT_PERSONAS.find(p => p.name === agent.name);
                  const isSelected = selectedAgentId === agent.id;

                  // Contradiction involvement count
                  const contradictionCount = (contradictions || []).filter(c =>
                    c.agent_a_id === agent.id || c.agent_b_id === agent.id ||
                    c.agent_a_name === agent.name || c.agent_b_name === agent.name
                  ).length;

                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`p-2.5 text-left border transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'border-[#C6A15B] bg-[#1C1F28] ring-1 ring-[#C6A15B]/60 shadow-[0_0_12px_rgba(198,161,91,0.2)]'
                          : 'border-[#1C2028] bg-[#111318] hover:border-[#2D3342]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-title text-[10px] shrink-0 ${
                          isSelected ? 'border-[#C6A15B] text-[#C6A15B] bg-[#2A2418]' : 'border-[#4A453A] text-[#E8DEC8] bg-[#161820]'
                        }`}>
                          {agent.name[0]}
                        </div>
                        <div className="truncate flex-1">
                          <span className={`font-title text-[11px] block truncate font-semibold ${isSelected ? 'text-[#C6A15B]' : 'text-[#E8DEC8]'}`}>
                            {agent.name}
                          </span>
                          <span className="text-[10px] text-[#7A756C] font-serif italic truncate block">
                            {persona?.archetype || 'Noble'}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[9px] font-title uppercase text-[#C6A15B] font-bold tracking-wider">
                            ✓
                          </span>
                        )}
                      </div>

                      {contradictionCount > 0 && (
                        <span className="text-[9px] font-mono text-[#E88C8C] flex items-center gap-1 mt-1">
                          <span>⚡</span>
                          <span>{contradictionCount} contradiction</span>
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Suggested Quick Questions */}
          <div>
            <label className="font-title text-[10px] uppercase tracking-wider text-[#8A857A] block mb-1.5">
              Suggested Inquiries:
            </label>
            <div className="space-y-1">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setQuestionText(q)}
                  className="w-full text-left px-2.5 py-1.5 border border-[#1A1D24] bg-[#0C0E12] hover:bg-[#141720] hover:border-[#2C3240] text-[11px] font-serif italic text-[#A8A295] hover:text-[#E8DEC8] transition-colors cursor-pointer truncate"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>

          {/* 3. Question Input */}
          <div>
            <label className="font-title text-[11px] uppercase tracking-wider text-[#C6A15B] block mb-1.5 font-semibold">
              2. Your Spoken Interrogation:
            </label>
            <textarea
              rows={3}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="State your question clearly before the council..."
              className="w-full p-2.5 bg-[#0C0E12] border border-[#232730] focus:border-[#C6A15B] outline-none text-xs text-[#E8DEC8] font-serif resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#1F232B] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-title text-xs text-[#8A857A] hover:text-[#E8DEC8] border border-[#232730] transition-colors cursor-pointer uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-6 py-2 btn-court-primary text-xs tracking-wider cursor-pointer uppercase shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
