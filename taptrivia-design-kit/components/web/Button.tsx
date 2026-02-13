/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — Button Component
 *  Adaptive button that works on mobile web and TV surfaces.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #00D4FF 0%, #0098B8 100%)',
    color: '#0B0E17',
    border: 'none',
  },
  secondary: {
    background: 'var(--tt-slate)',
    color: 'var(--tt-snow)',
    border: '1.5px solid var(--tt-graphite)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--tt-cyan)',
    border: '1.5px solid var(--tt-cyan)',
  },
  danger: {
    background: 'linear-gradient(135deg, #FF3D5A 0%, #CC2244 100%)',
    color: '#FFFFFF',
    border: 'none',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { height: 36, padding: '0 12px', fontSize: 14, borderRadius: 8 },
  md: { height: 44, padding: '0 16px', fontSize: 16, borderRadius: 12 },
  lg: { height: 52, padding: '0 24px', fontSize: 18, borderRadius: 12 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'var(--tt-font-body)',
    fontWeight: 600,
    cursor: disabled || loading ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    width: fullWidth ? '100%' : 'auto',
    letterSpacing: '0.01em',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {icon && !loading && icon}
      {children}
    </button>
  );
};

const LoadingSpinner = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeDasharray="28" strokeDashoffset="8" />
  </svg>
);

export default Button;
