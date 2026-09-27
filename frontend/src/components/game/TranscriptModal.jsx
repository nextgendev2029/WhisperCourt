import React, { useState, useMemo } from 'react';

export default function TranscriptModal({
  isOpen,
  onClose,
  messages = [],
  claims = [],
  contradictions = [],
  onInspectEvidence,
}) {
  const [selectedRound, setSelectedRound] = useState('all');

  const rounds = useMemo(() => {
    const set = new Set();
    messages.forEach(m => {
      if (m.roundNumber) set.add(m.roundNumber);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (selectedRound === 'all') return messages;
    return messages.filter(m => m.roundNumber === parseInt(selectedRound, 10));
  }, [messages, selectedRound]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-fade-in select-none">
      <div
        className="w-full max-w-4xl bg-[#0F1116] border border-[#2D3340] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        style={{ boxShadow: '0 0 60px rgba(0, 0, 0, 0.95), inset 0 0 30px rgba(198, 161, 91, 0.04)' }}
      >
        {/* Top Gold Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1F232B] flex items-center justify-between bg-[#0A0C0F]">
          <div className="flex items-center gap-3">
            <span className="text-[#C6A15B] text-lg font-serif">📜</span>
            <div>
              <h2 className="font-title text-sm uppercase tracking-widest text-[#E8DEC8] font-bold">
                The Royal Court Transcript
              </h2>
              <p className="text-[10px] text-[#8C8578] font-serif italic">
                Verbatim historical record of all testimonies, interrogations, and accusations
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#8C8578] hover:text-[#E8DEC8] text-sm p-1.5 transition-colors cursor-pointer"
            title="Close Transcript"
          >
            ✕
          </button>
        </div>

        {/* Filter Strip */}
        <div className="px-6 py-3 border-b border-[#1F232B] bg-[#0E1015] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-title text-[#8C8578] uppercase tracking-wider">
              Filter Chamber:
            </span>
            <button
              onClick={() => setSelectedRound('all')}
              className={`px-3 py-1 font-title text-[10px] uppercase tracking-wider transition-colors cursor-pointer border ${
                selectedRound === 'all'
                  ? 'bg-[#C6A15B]/20 text-[#E8DEC8] border-[#C6A15B]'
                  : 'bg-[#141720] text-[#8C8578] border-[#2D3340] hover:text-[#E8DEC8]'
              }`}
            >
              All Proceedings ({messages.length})
            </button>
            {rounds.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRound(r.toString())}
                className={`px-3 py-1 font-title text-[10px] uppercase tracking-wider transition-colors cursor-pointer border ${
                  selectedRound === r.toString()
                    ? 'bg-[#C6A15B]/20 text-[#E8DEC8] border-[#C6A15B]'
                    : 'bg-[#141720] text-[#8C8578] border-[#2D3340] hover:text-[#E8DEC8]'
                }`}
              >
                Round {r}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-[#7A756C]">
            {filteredMessages.length} Entries Logged
          </span>
        </div>

        {/* Verbatim Record Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-16 text-[#726E65]">
              <span className="text-3xl block mb-2">⚖</span>
              <p className="font-serif italic text-sm">No spoken testimonies on record for this phase.</p>
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              // Check if connected to a claim
              const matchingClaim = claims.find(c => 
                c.speaker_name === msg.speakerName && 
                (c.claim_text?.includes(msg.text?.substring(0, 20)) || msg.text?.includes(c.claim_text?.substring(0, 20)))
              );

              // Check if connected to contradiction
              const hasContradiction = contradictions.some(cd => 
                cd.agent_a_name === msg.speakerName || cd.agent_b_name === msg.speakerName
              );

              return (
                <div
                  key={msg.id || idx}
                  className="p-4 bg-[#12141A] border border-[#232733] space-y-2 hover:border-[#383E4C] transition-colors"
                >
                  <div className="flex items-center justify-between border-b border-[#1A1D26] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-title text-xs font-bold text-[#C6A15B] tracking-wider uppercase">
                        {msg.speakerName}
                      </span>
                      {msg.target_name && (
                        <span className="text-[11px] text-[#8C8578] font-serif">
                          addressing <strong className="text-[#E8DEC8] font-title">{msg.target_name}</strong>
                        </span>
                      )}
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-[#181B24] text-[#A8A295] border border-[#2D3340]">
                        {msg.tag || 'TESTIMONY'}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[#6A665E]">
                      ROUND {msg.roundNumber || 1} • #{idx + 1}
                    </span>
                  </div>

                  <p className="font-serif text-xs text-[#E8DEC8] italic leading-relaxed pl-2 border-l border-[#C6A15B]/30">
                    "{msg.text}"
                  </p>

                  {/* Evidence Link Footer */}
                  {(matchingClaim || hasContradiction) && (
                    <div className="pt-2 flex items-center justify-between text-[10px]">
                      <span className="text-[#C6A15B] font-title uppercase tracking-wider flex items-center gap-1">
                        <span>🔍</span>
                        <span>Evidence Anchor: Claim registered on court record</span>
                      </span>

                      <button
                        onClick={() => {
                          if (onInspectEvidence) onInspectEvidence(matchingClaim || msg);
                        }}
                        className="text-[#E8DEC8] hover:text-[#C6A15B] font-title uppercase tracking-widest cursor-pointer underline"
                      >
                        [ VIEW EVIDENCE IN OBSERVATORY ]
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1F232B] bg-[#0A0C0F] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 btn-court-secondary text-xs font-title tracking-wider uppercase cursor-pointer"
          >
            Close Record
          </button>
        </div>
      </div>
    </div>
  );
}
