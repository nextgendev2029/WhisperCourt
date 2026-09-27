import React, { useState } from 'react';
import { courtAudio } from '../../utils/courtAudio';

export default function VerdictModal({
  revealInfo,
  roundNumber,
  onAcknowledge,
  onOpenAnalysis,
  onOpenReplay,
  onOpenTranscript,
}) {
  if (!revealInfo) return null;

  const isTraitor = revealInfo.true_role === 'traitor';
  const trustSnapshot = revealInfo.trust_snapshot || {};
  const voteTally = revealInfo.vote_tally || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 animate-fade-in select-none">
      <div 
        className={`w-full max-w-xl border p-6 sm:p-8 shadow-2xl relative flex flex-col text-center animate-slide-up max-h-[92vh] overflow-y-auto ${
          isTraitor
            ? 'bg-[#100D0D] border-[#C53030]/60'
            : 'bg-[#0E1014] border-[#C6A15B]/50'
        }`}
        style={{
          boxShadow: isTraitor
            ? '0 0 60px rgba(197, 48, 48, 0.25), inset 0 0 35px rgba(197, 48, 48, 0.05)'
            : '0 0 60px rgba(198, 161, 91, 0.2), inset 0 0 35px rgba(198, 161, 91, 0.05)',
        }}
      >
        {/* Accent Top Bar */}
        <div 
          className={`h-1 w-full absolute top-0 left-0 ${
            isTraitor
              ? 'bg-gradient-to-r from-transparent via-[#C53030] to-transparent'
              : 'bg-gradient-to-r from-transparent via-[#C6A15B] to-transparent'
          }`}
        />

        {/* Heraldic Emblem */}
        <div className="mb-3">
          <div className="w-12 h-12 rounded-full border border-[#C6A15B]/40 flex items-center justify-center mx-auto bg-[#141210] shadow-[0_0_20px_rgba(198,161,91,0.15)]">
            <span className="text-2xl font-serif">
              {isTraitor ? '🗡️' : '🕊️'}
            </span>
          </div>
          <span className="font-title text-[10px] tracking-[0.25em] uppercase text-[#8A857A] block mt-2 font-bold">
            THE HIGH COUNCIL HAS SPOKEN
          </span>
        </div>

        {/* Title */}
        <h2 className="font-title text-2xl sm:text-3xl font-bold tracking-[0.2em] uppercase text-[#E8DEC8] mb-1 text-gold-gradient">
          DECREE OF EXILE
        </h2>

        {/* Accused Name */}
        <p className="font-serif text-lg italic text-[#C6A15B] mb-4">
          {revealInfo.eliminated} has been banished from Whisper Court.
        </p>

        {/* 1. Vote Distribution Sequence */}
        {Object.keys(voteTally).length > 0 && (
          <div className="p-3 bg-[#0A0C0F] border border-[#232733] mb-4 text-xs">
            <span className="text-[10px] font-title uppercase tracking-widest text-[#8C8578] block mb-1.5">
              FINAL BALLOT TALLY
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {Object.entries(voteTally).map(([name, count]) => (
                <span
                  key={name}
                  className={`px-2.5 py-1 font-mono text-[11px] border ${
                    name === revealInfo.eliminated
                      ? 'bg-[#2B1414] text-[#E88C8C] border-[#8A2626] font-bold'
                      : 'bg-[#12141A] text-[#A8A295] border-[#222530]'
                  }`}
                >
                  {name}: {count} {count === 1 ? 'vote' : 'votes'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 2. Role Reveal Banner */}
        <div 
          className={`py-4 px-6 border mb-5 ${
            isTraitor
              ? 'bg-[#261010] border-[#8A2626] text-[#E88C8C]'
              : 'bg-[#14231B] border-[#2E7D5B] text-[#8CE8B5]'
          }`}
        >
          <span className="text-[10px] font-mono uppercase tracking-widest block mb-1 text-[#A8988A]">
            True Alignment Unmasked:
          </span>
          <h3 className="font-title text-xl sm:text-2xl font-bold tracking-[0.22em] uppercase">
            {isTraitor ? '🗡️ THE TRAITOR' : '🕊️ INNOCENT DIGNITARY'}
          </h3>
          <p className="text-xs font-serif italic mt-1.5 text-[#E8DEC8]">
            {isTraitor
              ? "The court's suspicions were correct. The shadow among the nobility has been excised."
              : 'The court eliminated an innocent. The true conspirator still breathes in the chamber.'}
          </p>
        </div>

        {/* 3. Post-Reveal Trust Retrospective */}
        {Object.keys(trustSnapshot).length > 0 && (
          <div className="bg-[#0A0C0F] border border-[#1C2028] p-3.5 text-left mb-5 space-y-2">
            <div className="flex items-center justify-between border-b border-[#181B22] pb-1.5">
              <span className="font-title text-[10px] uppercase tracking-wider text-[#C6A15B] font-semibold">
                Who Suspected {revealInfo.eliminated}?
              </span>
              <span className="text-[9px] font-mono text-[#6A655C]">
                Trust Snapshot at Time of Exile
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(trustSnapshot).map(([name, score]) => {
                let assessment = 'Neutral';
                let style = 'text-[#A8A295]';
                if (score < 40) {
                  assessment = 'Suspicious';
                  style = 'text-[#C53030]';
                } else if (score < 55) {
                  assessment = 'Uncertain';
                  style = 'text-[#E0A060]';
                } else {
                  assessment = 'Trusted';
                  style = 'text-[#2E7D5B]';
                }

                return (
                  <div key={name} className="flex items-center justify-between p-1.5 bg-[#101217] border border-[#1A1D24]">
                    <span className="font-title text-[11px] text-[#E8DEC8] truncate">{name}</span>
                    <span className={`text-[10px] font-mono ${style}`}>
                      {assessment} ({score}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Investigation & Debrief Actions */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {onOpenAnalysis && (
            <button
              onClick={onOpenAnalysis}
              className="py-2 px-2 bg-[#161820] hover:bg-[#20232E] border border-[#2D3340] hover:border-[#C6A15B]/50 text-[10px] font-title uppercase tracking-wider text-[#E8DEC8] cursor-pointer transition-colors"
            >
              📊 Court Analysis
            </button>
          )}

          {onOpenTranscript && (
            <button
              onClick={onOpenTranscript}
              className="py-2 px-2 bg-[#161820] hover:bg-[#20232E] border border-[#2D3340] hover:border-[#C6A15B]/50 text-[10px] font-title uppercase tracking-wider text-[#E8DEC8] cursor-pointer transition-colors"
            >
              📜 Transcript
            </button>
          )}

          {onOpenReplay && (
            <button
              onClick={onOpenReplay}
              className="py-2 px-2 bg-[#161820] hover:bg-[#20232E] border border-[#2D3340] hover:border-[#C6A15B]/50 text-[10px] font-title uppercase tracking-wider text-[#E8DEC8] cursor-pointer transition-colors"
            >
              ⏪ Social Replay
            </button>
          )}
        </div>

        {/* Primary Proceed Action */}
        <button
          onClick={onAcknowledge}
          className="w-full py-3 btn-court-primary text-xs tracking-widest uppercase cursor-pointer shadow-lg"
        >
          Acknowledge Decree & Proceed ⚔
        </button>
      </div>
    </div>
  );
}
