import React from 'react';

export default function TrustShiftToast({ notifications = [], onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {notifications.slice(0, 2).map((item) => {
        const isNegative = item.delta < 0;
        const sign = item.delta > 0 ? '+' : '';

        return (
          <div
            key={item.id}
            className={`p-3.5 border shadow-2xl animate-slide-up pointer-events-auto flex flex-col gap-1 relative ${
              isNegative
                ? 'bg-[#140D0D] border-[#8A2626]/80 text-[#E8DEC8]'
                : 'bg-[#0D1410] border-[#2E7D5B]/80 text-[#E8DEC8]'
            }`}
            style={{
              boxShadow: isNegative
                ? '0 10px 30px rgba(0, 0, 0, 0.9), inset 0 0 15px rgba(197, 48, 48, 0.1)'
                : '0 10px 30px rgba(0, 0, 0, 0.9), inset 0 0 15px rgba(46, 125, 91, 0.1)',
            }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-white/5 pb-1">
              <span className="font-title text-[10px] tracking-widest uppercase text-[#C6A15B] font-bold">
                Trust Shift
              </span>
              <span
                className={`font-mono text-xs font-bold px-1.5 py-0.2 border ${
                  isNegative
                    ? 'text-[#C53030] bg-[#2B1414] border-[#8A2626]'
                    : 'text-[#2E7D5B] bg-[#14261C] border-[#2E7D5B]/40'
                }`}
              >
                {sign}{item.delta}
              </span>
            </div>

            {/* Shift Direction */}
            <div className="flex items-center gap-1.5 text-xs font-title font-semibold text-[#E8DEC8]">
              <span>{item.sourceName}</span>
              <span className="text-[#C6A15B] text-[10px]">→</span>
              <span>{item.targetName}</span>
            </div>

            {/* Rationale */}
            {item.reason && (
              <p className="text-[11px] font-serif italic text-[#BDB7A8] leading-tight mt-0.5">
                "{item.reason}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
