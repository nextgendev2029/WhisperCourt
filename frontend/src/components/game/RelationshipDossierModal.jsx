import React, { useState, useEffect } from 'react';

export default function RelationshipDossierModal({
  isOpen,
  onClose,
  evaluator,
  target,
  dossierData = null,
  onRequestDossier = null,
  agentColor = () => '#C6A15B',
}) {
  const [internalDossier, setInternalDossier] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (dossierData) {
      setInternalDossier(dossierData);
      setIsLoading(false);
    } else if (isOpen && evaluator && target && onRequestDossier) {
      setIsLoading(true);
      onRequestDossier(evaluator.id, target.id);
    }
  }, [isOpen, evaluator, target, dossierData, onRequestDossier]);

  if (!isOpen || !evaluator || !target) return null;

  const dossier = internalDossier || dossierData || {};
  const currentTrust = dossier.current_trust ?? evaluator.private_trust?.[target.id] ?? 50;
  const previousTrust = dossier.previous_trust ?? currentTrust;
  const delta = currentTrust - previousTrust;

  const trustColor =
    currentTrust >= 60
      ? '#2E7D5B' // Muted Emerald
      : currentTrust >= 40
      ? '#8C8E94' // Slate
      : '#9B2C2C'; // Muted Crimson

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#0F1116] border border-[#2B303E] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
        {/* Top Gold Foil Accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent shrink-0" />

        {/* Modal Header */}
        <div className="p-4 border-b border-[#1F232B] flex items-start justify-between bg-[#0B0D10] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#C6A15B] font-serif text-sm">⚜</span>
              <h3 className="font-title text-xs uppercase tracking-widest text-[#E8DEC8] font-bold">
                RELATIONSHIP DOSSIER
              </h3>
            </div>
            <p className="text-[10px] text-[#8A857A] font-serif italic mt-0.5">
              Grounded testimony evidence & trust causality
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-[#726E65] hover:text-[#E8DEC8] text-sm p-1 transition-colors cursor-pointer"
            title="Close Dossier"
          >
            ✕
          </button>
        </div>

        {/* Character Pairing Banner */}
        <div className="p-4 bg-[#14171E] border-b border-[#1F232B] flex items-center justify-between shrink-0">
          {/* Evaluator */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full border flex items-center justify-center font-title font-bold text-xs bg-[#0F1116]"
              style={{
                borderColor: agentColor(evaluator.id),
                color: agentColor(evaluator.id),
              }}
            >
              {evaluator.name?.[0] || 'A'}
            </div>
            <div>
              <span className="text-[9px] font-mono text-[#7A756C] uppercase block">Evaluator</span>
              <h4 className="font-title text-xs text-[#E8DEC8] font-bold">{evaluator.name}</h4>
            </div>
          </div>

          {/* Direction Indicator */}
          <div className="flex flex-col items-center px-3">
            <span className="text-[10px] font-mono text-[#C6A15B] font-semibold">TOWARD</span>
            <span className="text-sm text-[#C6A15B]">→</span>
          </div>

          {/* Target */}
          <div className="flex items-center gap-2.5 text-right">
            <div>
              <span className="text-[9px] font-mono text-[#7A756C] uppercase block">Subject</span>
              <h4 className="font-title text-xs text-[#E8DEC8] font-bold">{target.name}</h4>
            </div>
            <div
              className="w-9 h-9 rounded-full border flex items-center justify-center font-title font-bold text-xs bg-[#0F1116]"
              style={{
                borderColor: agentColor(target.id),
                color: agentColor(target.id),
              }}
            >
              {target.name?.[0] || 'T'}
            </div>
          </div>
        </div>

        {/* Trust Metric KPI Bar */}
        <div className="p-3 bg-[#0B0D10] border-b border-[#1F232B] grid grid-cols-4 gap-2 text-center shrink-0">
          <div className="p-2 bg-[#121419] border border-[#1E222C]">
            <span className="text-[9px] font-mono text-[#7A756C] uppercase block">Current Trust</span>
            <span className="font-mono text-sm font-bold" style={{ color: trustColor }}>
              {currentTrust} / 100
            </span>
          </div>

          <div className="p-2 bg-[#121419] border border-[#1E222C]">
            <span className="text-[9px] font-mono text-[#7A756C] uppercase block">High / Low</span>
            <span className="font-mono text-xs text-[#A8A295] font-semibold block mt-0.5">
              <span className="text-[#2E7D5B]">{dossier.historical_high ?? currentTrust}</span>
              <span className="text-[#555] mx-1">/</span>
              <span className="text-[#C53030]">{dossier.historical_low ?? currentTrust}</span>
            </span>
          </div>

          <div className="p-2 bg-[#121419] border border-[#1E222C]">
            <span className="text-[9px] font-mono text-[#7A756C] uppercase block">Alignment</span>
            <span className="font-mono text-sm font-bold text-[#C6A15B]">
              {dossier.alignment_score ?? 50}%
            </span>
          </div>

          <div className="p-2 bg-[#121419] border border-[#1E222C]">
            <span className="text-[9px] font-mono text-[#7A756C] uppercase block">Shift / Rec</span>
            <span
              className={`font-mono text-xs font-bold block mt-0.5 ${
                delta > 0 ? 'text-[#2E7D5B]' : delta < 0 ? 'text-[#C53030]' : 'text-[#8C8E94]'
              }`}
            >
              {delta > 0 ? `+${delta}` : delta}
              <span className="text-[9px] text-[#7A756C] font-normal ml-1 font-sans">
                ({dossier.accusations_count ?? 0}⚔ / {dossier.defenses_count ?? 0}🛡)
              </span>
            </span>
          </div>
        </div>

        {/* Scrollable Evidence Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Causal Factors */}
          <div>
            <span className="font-title text-[10px] uppercase tracking-wider text-[#C6A15B] block mb-2 font-semibold">
              Recent Causal Factors
            </span>
            {dossier.recent_factors && dossier.recent_factors.length > 0 ? (
              <ul className="space-y-1.5">
                {dossier.recent_factors.map((factor, idx) => (
                  <li
                    key={idx}
                    className="p-2 bg-[#12151D] border border-[#1F2432] text-xs font-serif text-[#C8C2B4] flex items-start gap-2"
                  >
                    <span className="text-[#C6A15B] text-xs">•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-serif italic text-[#726E65] p-2 bg-[#101217] border border-[#1A1D24]">
                No drastic shifts recorded. The relationship remains anchored at customary court neutrality.
              </p>
            )}
          </div>

          {/* Direct Contradictions between the two */}
          {dossier.contradictions && dossier.contradictions.length > 0 && (
            <div>
              <span className="font-title text-[10px] uppercase tracking-wider text-[#E88C8C] block mb-2 font-semibold flex items-center gap-1.5">
                <span>⚠</span>
                <span>Active Testimony Conflicts ({dossier.contradictions.length})</span>
              </span>
              <div className="space-y-2">
                {dossier.contradictions.map((ct, idx) => (
                  <div key={idx} className="p-2.5 bg-[#1F1212] border border-[#8A2626]/40 text-xs">
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 bg-[#3A1414] text-[#E88C8C] border border-[#8A2626] inline-block mb-1">
                      {ct.severity?.replace('_', ' ').toUpperCase() || 'CONFLICT'}
                    </span>
                    <p className="font-serif italic text-[#D8B4B4] leading-relaxed">
                      "{ct.description}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real Quote Evidence Excerpts */}
          <div>
            <span className="font-title text-[10px] uppercase tracking-wider text-[#C6A15B] block mb-2 font-semibold">
              Ground Truth Testimony Citations
            </span>
            {dossier.evidence_quotes && dossier.evidence_quotes.length > 0 ? (
              <div className="space-y-2">
                {dossier.evidence_quotes.map((quote, idx) => (
                  <div key={idx} className="p-2.5 bg-[#0C0E12] border border-[#1E232F] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8A857A]">
                      <span className="text-[#C6A15B] font-semibold">
                        Round {quote.round_number} - {quote.speaker_name}
                      </span>
                      <span
                        className={
                          quote.delta > 0
                            ? 'text-[#2E7D5B]'
                            : quote.delta < 0
                            ? 'text-[#C53030]'
                            : 'text-[#8C8E94]'
                        }
                      >
                        {quote.delta > 0 ? `+${quote.delta}` : quote.delta} shift
                      </span>
                    </div>
                    <p className="text-xs font-serif italic text-[#E8DEC8] leading-relaxed">
                      "{quote.text}"
                    </p>
                    {quote.reason && (
                      <p className="text-[10px] font-serif text-[#7A756C] pt-0.5">
                        Cause: <span className="text-[#A8A295]">{quote.reason}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-serif italic text-[#726E65] p-2 bg-[#101217] border border-[#1A1D24]">
                Awaiting further testimonies under cross-examination.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0B0D10] border-t border-[#1F232B] flex items-center justify-between shrink-0">
          <span className="text-[10px] font-serif italic text-[#7A756C]">
            Evidence grounded in authentic court transcripts & evaluations.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 btn-court-secondary text-xs uppercase tracking-wider cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
