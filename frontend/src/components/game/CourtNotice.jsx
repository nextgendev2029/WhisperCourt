import React from 'react';

export default function CourtNotice({ notices, onDismiss }) {
  if (!notices || notices.length === 0) return null;

  return (
    <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-40 flex flex-col items-center gap-2 max-w-xl w-[90%] pointer-events-none">
      {notices.map((notice) => {
        const isTakeover = notice.type === 'takeover' || notice.text.includes('AI CONTROL ASSUMED');
        const isReturn = notice.type === 'return' || notice.text.includes('HUMAN CONTROL RESTORED');
        const isLeave = notice.type === 'leave';

        let borderColor = 'border-[#C6A15B]/50';
        let bgGradient = 'bg-gradient-to-r from-[#14161C]/95 via-[#1E212B]/95 to-[#14161C]/95';
        let textColor = 'text-[#E8DEC8]';
        let icon = '⚜';

        if (isTakeover) {
          borderColor = 'border-[#C6A15B] shadow-[0_0_15px_rgba(198,161,91,0.25)]';
          textColor = 'text-[#D8B774]';
          icon = '⚙';
        } else if (isReturn) {
          borderColor = 'border-[#236348] shadow-[0_0_15px_rgba(78,186,135,0.25)]';
          textColor = 'text-[#4EBA87]';
          icon = '✦';
        } else if (isLeave) {
          borderColor = 'border-[#C53030]/60';
          textColor = 'text-[#F28B82]';
          icon = '⚠';
        }

        return (
          <div
            key={notice.id}
            className={`w-full py-2.5 px-4 rounded border ${borderColor} ${bgGradient} backdrop-blur-md shadow-2xl flex items-center justify-between pointer-events-auto animate-slide-up transition-all`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-serif">{icon}</span>
              <div>
                <span className="font-title text-[9px] uppercase tracking-[0.25em] text-[#8C8578] block">
                  COURT NOTICE
                </span>
                <span className={`font-serif text-xs sm:text-sm font-medium tracking-wide ${textColor}`}>
                  {notice.text}
                </span>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={() => onDismiss(notice.id)}
                className="text-xs text-[#8C8578] hover:text-[#E8DEC8] ml-3 px-1.5 py-0.5 cursor-pointer"
                title="Dismiss Notice"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
