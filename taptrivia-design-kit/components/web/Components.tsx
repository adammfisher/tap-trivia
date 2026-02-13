/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — Timer Component
 *  Circular countdown timer with color transitions.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';

interface TimerProps {
  seconds: number;
  total: number;
  surface?: 'mobile' | 'tv';
}

export const Timer: React.FC<TimerProps> = ({ seconds, total, surface = 'mobile' }) => {
  const isTv = surface === 'tv';
  const size = isTv ? 140 : 64;
  const stroke = isTv ? 6 : 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = seconds / total;
  const offset = circumference * (1 - progress);

  const color =
    progress > 0.5 ? '#00D4FF' :
    progress > 0.25 ? '#FFB300' :
    '#FF3D5A';

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="#2A2F42" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 500ms ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: isTv ? 48 : 24,
        fontWeight: 700,
        color,
        transition: 'color 500ms ease',
      }}>
        {seconds}
      </span>
    </div>
  );
};


/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — CategoryPill Component
 * ═══════════════════════════════════════════════════════════════
 */

const CATEGORY_COLORS: Record<string, string> = {
  'Geography':       '#4FC3F7',
  'Entertainment':   '#CE93D8',
  'History':         '#FFB74D',
  'Art & Culture':   '#F06292',
  'Science & Nature':'#81C784',
  'Sports & Leisure':'#64B5F6',
};

interface CategoryPillProps {
  category: string;
  surface?: 'mobile' | 'tv';
}

export const CategoryPill: React.FC<CategoryPillProps> = ({ category, surface = 'mobile' }) => {
  const isTv = surface === 'tv';
  // Match to super-category or default
  const superCat = Object.keys(CATEGORY_COLORS).find(k =>
    category.toLowerCase().includes(k.toLowerCase())
  );
  const color = superCat ? CATEGORY_COLORS[superCat] : '#B0B7CC';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: isTv ? 44 : 28,
      padding: `0 ${isTv ? 20 : 12}px`,
      borderRadius: 9999,
      background: `${color}18`,
      border: `1.5px solid ${color}50`,
      color,
      fontFamily: '"DM Sans", sans-serif',
      fontSize: isTv ? 22 : 12,
      fontWeight: 600,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {category}
    </span>
  );
};


/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — QuestionCard Component
 * ═══════════════════════════════════════════════════════════════
 */

interface QuestionCardProps {
  number: number;
  total: number;
  category: string;
  question: string;
  difficulty?: number;
  surface?: 'mobile' | 'tv';
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  number, total, category, question, difficulty = 1, surface = 'mobile',
}) => {
  const isTv = surface === 'tv';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isTv ? 'center' : 'flex-start',
      gap: isTv ? 20 : 12,
      padding: isTv ? 40 : 20,
      maxWidth: isTv ? 1400 : '100%',
      width: '100%',
    }}>
      {/* Meta row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isTv ? 16 : 8,
        width: '100%',
        justifyContent: isTv ? 'center' : 'flex-start',
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: isTv ? 24 : 13,
          fontWeight: 500,
          color: '#6B7494',
        }}>
          Q{number}/{total}
        </span>
        <CategoryPill category={category} surface={surface} />
        <DifficultyDots level={difficulty} surface={surface} />
      </div>

      {/* Question text */}
      <div style={{
        fontFamily: isTv ? '"Chakra Petch", sans-serif' : '"DM Sans", sans-serif',
        fontSize: isTv ? 56 : 22,
        fontWeight: isTv ? 700 : 600,
        color: '#EAEDF6',
        lineHeight: 1.25,
        textAlign: isTv ? 'center' : 'left',
        maxWidth: isTv ? 1200 : '100%',
      }}>
        {question}
      </div>
    </div>
  );
};


/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — DifficultyDots
 * ═══════════════════════════════════════════════════════════════
 */

interface DifficultyDotsProps {
  level: number;   // 1-5
  surface?: 'mobile' | 'tv';
}

export const DifficultyDots: React.FC<DifficultyDotsProps> = ({ level, surface = 'mobile' }) => {
  const isTv = surface === 'tv';
  const dotSize = isTv ? 10 : 6;
  const gap = isTv ? 5 : 3;

  const color =
    level <= 2 ? '#00E676' :
    level <= 3 ? '#FFB300' :
    '#FF3D5A';

  return (
    <div style={{ display: 'flex', gap, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: i <= level ? color : '#2A2F42',
          transition: 'background 300ms ease',
        }} />
      ))}
    </div>
  );
};


/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — ScoreboardRow Component
 * ═══════════════════════════════════════════════════════════════
 */

interface Player {
  name: string;
  score: number;
  rank: number;
  avatar?: string;   // emoji or initial
  isCorrect?: boolean;
  streak?: number;
}

interface ScoreboardRowProps {
  player: Player;
  isHighlighted?: boolean;
  surface?: 'mobile' | 'tv';
}

export const ScoreboardRow: React.FC<ScoreboardRowProps> = ({
  player, isHighlighted = false, surface = 'mobile',
}) => {
  const isTv = surface === 'tv';
  const { name, score, rank, avatar, isCorrect, streak } = player;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: isTv ? 16 : 10,
      padding: isTv ? '14px 20px' : '10px 14px',
      height: isTv ? 64 : 48,
      borderRadius: isTv ? 16 : 12,
      background: isHighlighted ? '#00D4FF12' : 'transparent',
      border: isHighlighted ? '1.5px solid #00D4FF30' : '1.5px solid transparent',
      transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      {/* Rank */}
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: isTv ? 22 : 13,
        fontWeight: 700,
        color: rank <= 3 ? '#FFB300' : '#6B7494',
        minWidth: isTv ? 36 : 24,
        textAlign: 'center',
      }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
      </span>

      {/* Avatar */}
      <div style={{
        width: isTv ? 44 : 32,
        height: isTv ? 44 : 32,
        borderRadius: isTv ? 14 : 10,
        background: '#2A2F42',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isTv ? 22 : 16,
        flexShrink: 0,
      }}>
        {avatar || name.charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <span style={{
        flex: 1,
        fontFamily: '"DM Sans", sans-serif',
        fontSize: isTv ? 24 : 15,
        fontWeight: 500,
        color: '#EAEDF6',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
        {isCorrect !== undefined && (
          <span style={{
            marginLeft: 6,
            fontSize: isTv ? 18 : 12,
            color: isCorrect ? '#00E676' : '#FF3D5A',
          }}>
            {isCorrect ? '✓' : '✗'}
          </span>
        )}
      </span>

      {/* Streak */}
      {streak && streak >= 3 && (
        <span style={{
          fontSize: isTv ? 18 : 12,
          color: '#FFB300',
        }}>
          🔥{streak}
        </span>
      )}

      {/* Score */}
      <span style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: isTv ? 28 : 16,
        fontWeight: 700,
        color: '#00D4FF',
        minWidth: isTv ? 80 : 48,
        textAlign: 'right',
      }}>
        {score.toLocaleString()}
      </span>
    </div>
  );
};


/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — Toast / Notification Component
 * ═══════════════════════════════════════════════════════════════
 */

type ToastVariant = 'info' | 'success' | 'error' | 'warning';

interface ToastProps {
  variant?: ToastVariant;
  message: string;
  icon?: string;
}

const TOAST_COLORS: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  info:    { bg: '#00D4FF12', border: '#00D4FF40', text: '#00D4FF' },
  success: { bg: '#00E67612', border: '#00E67640', text: '#00E676' },
  error:   { bg: '#FF3D5A12', border: '#FF3D5A40', text: '#FF3D5A' },
  warning: { bg: '#FFB30012', border: '#FFB30040', text: '#FFB300' },
};

export const Toast: React.FC<ToastProps> = ({ variant = 'info', message, icon }) => {
  const colors = TOAST_COLORS[variant];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      minHeight: 48,
      maxWidth: 400,
      borderRadius: 12,
      background: colors.bg,
      border: `1.5px solid ${colors.border}`,
      backdropFilter: 'blur(12px)',
    }}>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      <span style={{
        fontFamily: '"DM Sans", sans-serif',
        fontSize: 14,
        fontWeight: 500,
        color: colors.text,
      }}>
        {message}
      </span>
    </div>
  );
};


/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — Input Component
 * ═══════════════════════════════════════════════════════════════
 */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 13,
          fontWeight: 500,
          color: '#B0B7CC',
          letterSpacing: '0.01em',
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          height: 44,
          padding: '0 16px',
          borderRadius: 12,
          background: '#1E2333',
          border: `1.5px solid ${error ? '#FF3D5A' : '#2A2F42'}`,
          color: '#EAEDF6',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 16,
          outline: 'none',
          transition: 'border-color 200ms ease',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 12,
          color: '#FF3D5A',
        }}>
          {error}
        </span>
      )}
    </div>
  );
};


export { Timer, CategoryPill, QuestionCard, DifficultyDots, ScoreboardRow, Toast, Input };
