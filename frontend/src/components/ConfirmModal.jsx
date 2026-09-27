import React from 'react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#0F1115] border border-[#2A2E38] shadow-2xl relative flex flex-col p-6 animate-slide-up"
        style={{ boxShadow: '0 0 40px rgba(0, 0, 0, 0.95), inset 0 0 20px rgba(198, 161, 91, 0.03)' }}
      >
        {/* Top Accent Line */}
        <div 
          className={`h-1 w-full absolute top-0 left-0 ${
            isDanger ? 'bg-gradient-to-r from-transparent via-[#C53030] to-transparent' : 'bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent'
          }`} 
        />

        <div className="flex items-center gap-3 mb-3">
          <span className={`text-xl ${isDanger ? 'text-[#C53030]' : 'text-[#C6A15B]'}`}>
            {isDanger ? '⚖️' : '⚜'}
          </span>
          <h3 className="font-title text-base text-[#E8DEC8] tracking-wider uppercase">
            {title}
          </h3>
        </div>

        <p className="text-sm text-[#A8A295] leading-relaxed mb-6 font-serif italic">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#23272E]">
          <button
            onClick={onCancel}
            className="px-4 py-2 font-title text-xs text-[#A8A295] border border-[#2D323E] hover:border-[#4B5263] hover:text-[#E8DEC8] transition-colors cursor-pointer tracking-wider uppercase"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 font-title text-xs tracking-wider uppercase transition-colors cursor-pointer border ${
              isDanger
                ? 'bg-[#2B1414] border-[#8A2626] text-[#E8DEC8] hover:bg-[#3B1919] hover:border-[#C53030]'
                : 'bg-[#1C1F26] border-[#C6A15B] text-[#E8DEC8] hover:bg-[#252933]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
