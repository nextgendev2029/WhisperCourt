import React from 'react';

export default function SettingsModal({ isOpen, onClose, settings, onUpdateSettings }) {
  if (!isOpen) return null;

  const toggle = (key) => {
    onUpdateSettings({ ...settings, [key]: !settings[key] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="w-full max-w-lg bg-[#0F1115] border border-[#2A2E38] shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 0 40px rgba(0, 0, 0, 0.9), inset 0 0 20px rgba(198, 161, 91, 0.03)' }}
      >
        {/* Ornate Gold Header Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent opacity-80" />

        <div className="px-7 py-5 border-b border-[#23272E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[#C6A15B] text-lg font-serif">⚜</span>
            <div>
              <h2 className="font-title text-base text-[#E8DEC8] tracking-widest uppercase">
                Chamber Settings
              </h2>
              <p className="text-xs text-[#8A857A] font-serif italic">
                Court preferences & observation configurations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A857A] hover:text-[#E8DEC8] p-1.5 transition-colors cursor-pointer"
            title="Close Settings"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-7 py-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* DISPLAY */}
          <div className="space-y-3">
            <h3 className="font-title text-xs tracking-wider text-[#C6A15B] uppercase border-b border-[#23272E] pb-1">
              Visual & Display
            </h3>
            
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-[#E8DEC8] font-medium">Courtroom Animations</span>
                <p className="text-xs text-[#7A756C]">Transitions, node pulses, and floating trust deltas</p>
              </div>
              <button
                type="button"
                onClick={() => toggle('animations')}
                className={`w-12 h-6 flex items-center px-1 rounded-sm border transition-colors cursor-pointer ${
                  settings.animations 
                    ? 'bg-[#1C2028] border-[#C6A15B] justify-end' 
                    : 'bg-[#121417] border-[#2A2E38] justify-start'
                }`}
              >
                <div className={`w-4 h-4 rounded-xs ${settings.animations ? 'bg-[#C6A15B]' : 'bg-[#404654]'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-[#E8DEC8] font-medium">Reduced Motion</span>
                <p className="text-xs text-[#7A756C]">Dampen force graph physics and rapid camera shifts</p>
              </div>
              <button
                type="button"
                onClick={() => toggle('reducedMotion')}
                className={`w-12 h-6 flex items-center px-1 rounded-sm border transition-colors cursor-pointer ${
                  settings.reducedMotion 
                    ? 'bg-[#1C2028] border-[#C6A15B] justify-end' 
                    : 'bg-[#121417] border-[#2A2E38] justify-start'
                }`}
              >
                <div className={`w-4 h-4 rounded-xs ${settings.reducedMotion ? 'bg-[#C6A15B]' : 'bg-[#404654]'}`} />
              </button>
            </div>
          </div>

          {/* GAME */}
          <div className="space-y-3">
            <h3 className="font-title text-xs tracking-wider text-[#C6A15B] uppercase border-b border-[#23272E] pb-1">
              Deliberation Flow
            </h3>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-[#E8DEC8] font-medium">Auto-Advance Pacing</span>
                <p className="text-xs text-[#7A756C]">Pause between testimonies for audience readability</p>
              </div>
              <button
                type="button"
                onClick={() => toggle('autoAdvance')}
                className={`w-12 h-6 flex items-center px-1 rounded-sm border transition-colors cursor-pointer ${
                  settings.autoAdvance 
                    ? 'bg-[#1C2028] border-[#C6A15B] justify-end' 
                    : 'bg-[#121417] border-[#2A2E38] justify-start'
                }`}
              >
                <div className={`w-4 h-4 rounded-xs ${settings.autoAdvance ? 'bg-[#C6A15B]' : 'bg-[#404654]'}`} />
              </button>
            </div>
          </div>

          {/* AUDIO */}
          <div className="space-y-3">
            <h3 className="font-title text-xs tracking-wider text-[#C6A15B] uppercase border-b border-[#23272E] pb-1">
              Audio Atmosphere
            </h3>

            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-[#E8DEC8] font-medium">Chamber Audio Cues</span>
                <p className="text-xs text-[#7A756C]">Subtle gavel, parchment, and accusation chime</p>
              </div>
              <button
                type="button"
                onClick={() => toggle('sound')}
                className={`w-12 h-6 flex items-center px-1 rounded-sm border transition-colors cursor-pointer ${
                  settings.sound 
                    ? 'bg-[#1C2028] border-[#C6A15B] justify-end' 
                    : 'bg-[#121417] border-[#2A2E38] justify-start'
                }`}
              >
                <div className={`w-4 h-4 rounded-xs ${settings.sound ? 'bg-[#C6A15B]' : 'bg-[#404654]'}`} />
              </button>
            </div>
          </div>

          {/* DEBUG / GM VIEW */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#3A2B15] pb-1">
              <h3 className="font-title text-xs tracking-wider text-[#D4B56A] uppercase flex items-center gap-1.5">
                <span>⚠️</span> Game Master / Debug Inspection
              </h3>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 bg-[#2A2312] border border-[#C6A15B]/40 text-[#D8B774]">
                Staff Only
              </span>
            </div>

            <div className="bg-[#18150F] border border-[#423219] p-3 rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#F3EDE2] font-semibold">Expose Secret Roles</span>
                  <p className="text-xs text-[#A89878]">
                    Unmasks the Traitor in the roster and statement headers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle('gmView')}
                  className={`w-12 h-6 flex items-center px-1 rounded-sm border transition-colors cursor-pointer ${
                    settings.gmView 
                      ? 'bg-[#3D2F17] border-[#D4B56A] justify-end' 
                      : 'bg-[#121417] border-[#2A2E38] justify-start'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-xs ${settings.gmView ? 'bg-[#D4B56A]' : 'bg-[#404654]'}`} />
                </button>
              </div>
              <p className="text-[11px] text-[#A88B4D] italic border-t border-[#3A2B15] pt-2">
                * Note: Keep this disabled during genuine demo recordings to preserve dramatic mystery.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-[#23272E] bg-[#0B0D10] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 font-title text-xs text-[#E8DEC8] border border-[#3A3F4D] hover:border-[#C6A15B] transition-colors cursor-pointer tracking-widest uppercase"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
