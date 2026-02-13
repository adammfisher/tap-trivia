/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — AnswerCard Component
 *  Used on both mobile (tap to select) and TV (display only).
 *  Supports states: idle, selected, correct, wrong, disabled.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';

type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled';

interface AnswerCardProps {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  state?: AnswerState;
  count?: number;        // number of players who chose this (TV mode)
  showCount?: boolean;   // show player count bar (TV reveal phase)
  totalPlayers?: number; // for percentage calc
  onPress?: () => void;
  surface?: 'mobile' | 'tv';
}

const SLOT_COLORS = {
  A: '#4FC3F7',
  B: '#CE93D8',
  C: '#FFB74D',
  D: '#81C784',
};

const STATE_OVERRIDES: Record<AnswerState, { bg: string; border: string; text: string }> = {
  idle:     { bg: 'transparent', border: '', text: '' },
  selected: { bg: '', border: '', text: '' }, // uses slot color
  correct:  { bg: '#00E67618', border: '#00E676', text: '#00E676' },
  wrong:    { bg: '#FF3D5A18', border: '#FF3D5A', text: '#FF3D5A' },
  disabled: { bg: '#141825', border: '#2A2F42', text: '#6B7494' },
};

export const AnswerCard: React.FC<AnswerCardProps> = ({
  letter,
  text,
  state = 'idle',
  count,
  showCount = false,
  totalPlayers = 1,
  onPress,
  surface = 'mobile',
}) => {
  const isTv = surface === 'tv';
  const slotColor = SLOT_COLORS[letter];
  const overrides = STATE_OVERRIDES[state];

  const borderColor =
    overrides.border ||
    (state === 'selected' ? slotColor : `${slotColor}40`);
  const bgColor =
    overrides.bg ||
    (state === 'selected' ? `${slotColor}20` : `${slotColor}08`);
  const textColor =
    overrides.text ||
    (state === 'selected' ? slotColor : '#EAEDF6');

  const pct = showCount && totalPlayers > 0
    ? Math.round(((count || 0) / totalPlayers) * 100)
    : 0;

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: isTv ? 20 : 12,
    padding: isTv ? '20px 28px' : '14px 16px',
    minHeight: isTv ? 120 : 56,
    background: bgColor,
    border: `${isTv ? 3 : 2}px solid ${borderColor}`,
    borderRadius: isTv ? 20 : 16,
    cursor: onPress && state !== 'disabled' ? 'pointer' : 'default',
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
  };

  const letterStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: isTv ? 52 : 32,
    height: isTv ? 52 : 32,
    borderRadius: isTv ? 14 : 8,
    background: `${slotColor}25`,
    color: state === 'correct' ? '#00E676' : state === 'wrong' ? '#FF3D5A' : slotColor,
    fontFamily: 'var(--tt-font-display)',
    fontSize: isTv ? 28 : 16,
    fontWeight: 700,
    flexShrink: 0,
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    fontFamily: 'var(--tt-font-body)',
    fontSize: isTv ? 36 : 16,
    fontWeight: 500,
    color: textColor,
    lineHeight: 1.3,
  };

  const countBarStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 4,
    width: `${pct}%`,
    background: state === 'correct' ? '#00E676' : slotColor,
    borderRadius: '0 4px 4px 0',
    transition: 'width 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  const pctStyle: React.CSSProperties = {
    fontFamily: 'var(--tt-font-mono)',
    fontSize: isTv ? 28 : 14,
    fontWeight: 700,
    color: state === 'correct' ? '#00E676' : '#B0B7CC',
    minWidth: isTv ? 70 : 44,
    textAlign: 'right',
  };

  return (
    <div style={cardStyle} onClick={onPress} role="button" tabIndex={0}>
      <div style={letterStyle}>{letter}</div>
      <div style={textStyle}>{text}</div>
      {showCount && <div style={pctStyle}>{pct}%</div>}
      {showCount && <div style={countBarStyle} />}
    </div>
  );
};

export default AnswerCard;
