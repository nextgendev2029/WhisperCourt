import React, { useState } from 'react';

const SUGGESTED_DEFENSES = [
  'I have been loyal to this court from the first hour.',
  'My accounts are consistent; look at the facts, not panic.',
  'You accuse me only to cast a shadow from your own misdeeds.',
  'I was in the gallery during the incident; check with the guards.',
];

export default function DefenseModal({
  isOpen,
  onClose,
  onSubmitDefense,
  isProcessing = false,
}) {
  const [defenseText, setDefenseText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!defenseText.trim() || isProcessing) return;
    onSubmitDefense(defenseText.trim());
    setDefenseText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0F1115] border border-[#21352A] shadow-2xl relative flex flex-col p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 0 45px rgba(0, 0, 0, 0.95), inset 0 0 25px rgba(46, 125, 91, 0.04)' }}
      >
        {/* Top Emerald Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#2E7D5B] to-transparent absolute top-0 left-0" />

        {/* Title */}
        <div className="flex items-center justify-between border-b border-[#1A2820] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[#2E7D5B] text-lg font-serif">🛡</span>
            <div>
              <h3 className="font-title text-sm uppercase tracking-wider text-[#E8DEC8] font-bold">
                Plead Your Defense
              </h3>
              <p className="text-xs text-[#8A9890] font-serif italic">
                Address suspicions and proclaim your innocence before the assembly.
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
          {/* Quick suggestions */}
          <div>
            <label className="font-title text-[10px] uppercase tracking-wider text-[#8A857A] block mb-1.5">
              Suggested Defenses:
            </label>
            <div className="space-y-1">
              {SUGGESTED_DEFENSES.map((d, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDefenseText(d)}
                  className="w-full text-left px-2.5 py-1.5 border border-[#16231C] bg-[#0A100C] hover:bg-[#111C15] hover:border-[#23382C] text-[11px] font-serif italic text-[#8CE8B5] hover:text-white transition-colors cursor-pointer truncate"
                >
                  "{d}"
                </button>
              ))}
            </div>
          </div>

          {/* Defense Input */}
          <div>
            <label className="font-title text-[11px] uppercase tracking-wider text-[#2E7D5B] block mb-1.5 font-semibold">
              Your Spoken Defense:
            </label>
            <textarea
              rows={3}
              value={defenseText}
              onChange={(e) => setDefenseText(e.target.value)}
              placeholder="Speak truth to the council and dispel false charges..."
              className="w-full p-2.5 bg-[#0C120E] border border-[#1D3025] focus:border-[#2E7D5B] outline-none text-xs text-[#E8DEC8] font-serif resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#18261E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-title text-xs text-[#8A857A] hover:text-[#E8DEC8] border border-[#18261E] transition-colors cursor-pointer uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!defenseText.trim() || isProcessing}
              className="px-6 py-2 font-title text-xs tracking-wider uppercase border border-[#2E7D5B] bg-[#14261C] hover:bg-[#1E382A] text-[#E8DEC8] hover:text-white transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Delivering Defense...' : 'Submit Defense 🛡'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
