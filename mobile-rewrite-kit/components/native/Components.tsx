/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — React Native Components
 *  Core component library for the mobile app (Ionic/Capacitor
 *  or pure React Native). Uses RN primitives only.
 * ═══════════════════════════════════════════════════════════════
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  palette,
  fontFamilyNative as font,
  fontSize,
  space,
  radius,
  elevation,
} from '../../tokens/tokens';

// ─── Button ──────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}

const BUTTON_BG: Record<ButtonVariant, string> = {
  primary:   palette.cyan,
  secondary: palette.slate,
  ghost:     'transparent',
  danger:    palette.wrong,
};
const BUTTON_TEXT: Record<ButtonVariant, string> = {
  primary:   palette.midnight,
  secondary: palette.snow,
  ghost:     palette.cyan,
  danger:    '#FFFFFF',
};
const BUTTON_HEIGHTS: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };

export const Button: React.FC<ButtonProps> = ({
  title, variant = 'primary', size = 'md', fullWidth, disabled, onPress,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
    style={[
      styles.button,
      {
        height: BUTTON_HEIGHTS[size],
        backgroundColor: BUTTON_BG[variant],
        borderColor: variant === 'ghost' ? palette.cyan : 'transparent',
        borderWidth: variant === 'ghost' ? 1.5 : 0,
        opacity: disabled ? 0.4 : 1,
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 24 : 16,
      },
    ]}
  >
    <Text style={[
      styles.buttonText,
      {
        color: BUTTON_TEXT[variant],
        fontSize: size === 'sm' ? 14 : size === 'lg' ? 18 : 16,
      },
    ]}>
      {title}
    </Text>
  </TouchableOpacity>
);


// ─── AnswerCard ──────────────────────────────────────────────

type AnswerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled';

const SLOT_COLORS = {
  A: '#4FC3F7',
  B: '#CE93D8',
  C: '#FFB74D',
  D: '#81C784',
};

interface AnswerCardProps {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  state?: AnswerState;
  onPress?: () => void;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({
  letter, text, state = 'idle', onPress,
}) => {
  const slotColor = SLOT_COLORS[letter];
  const isCorrect = state === 'correct';
  const isWrong = state === 'wrong';
  const isSelected = state === 'selected';

  const borderColor = isCorrect ? palette.correct
    : isWrong ? palette.wrong
    : isSelected ? slotColor
    : `${slotColor}40`;

  const bgColor = isCorrect ? `${palette.correct}18`
    : isWrong ? `${palette.wrong}18`
    : isSelected ? `${slotColor}20`
    : `${slotColor}08`;

  const textColor = isCorrect ? palette.correct
    : isWrong ? palette.wrong
    : isSelected ? slotColor
    : palette.snow;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={state === 'disabled'}
      activeOpacity={0.7}
      style={[
        styles.answerCard,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: state === 'disabled' ? 0.4 : 1,
        },
      ]}
    >
      <View style={[styles.answerLetter, { backgroundColor: `${slotColor}25` }]}>
        <Text style={[styles.answerLetterText, {
          color: isCorrect ? palette.correct : isWrong ? palette.wrong : slotColor,
        }]}>
          {letter}
        </Text>
      </View>
      <Text style={[styles.answerText, { color: textColor }]} numberOfLines={2}>
        {text}
      </Text>
    </TouchableOpacity>
  );
};


// ─── Timer ───────────────────────────────────────────────────

interface TimerProps {
  seconds: number;
  total: number;
}

export const Timer: React.FC<TimerProps> = ({ seconds, total }) => {
  const SIZE = 64;
  const STROKE = 4;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const progress = seconds / total;
  const offset = CIRC * (1 - progress);

  const color = progress > 0.5 ? palette.cyan
    : progress > 0.25 ? palette.warning
    : palette.wrong;

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE/2} cy={SIZE/2} r={R}
          fill="none" stroke={palette.graphite} strokeWidth={STROKE} />
        <Circle cx={SIZE/2} cy={SIZE/2} r={R}
          fill="none" stroke={color} strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={offset}
        />
      </Svg>
      <Text style={[styles.timerText, { color, position: 'absolute' }]}>
        {seconds}
      </Text>
    </View>
  );
};


// ─── CategoryPill ────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  geography:       '#4FC3F7',
  entertainment:   '#CE93D8',
  history:         '#FFB74D',
  'art & culture': '#F06292',
  'science':       '#81C784',
  sports:          '#64B5F6',
};

interface CategoryPillProps {
  category: string;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({ category }) => {
  const key = Object.keys(CAT_COLORS).find(k => category.toLowerCase().includes(k));
  const color = key ? CAT_COLORS[key] : '#B0B7CC';

  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}50` }]}>
      <Text style={[styles.pillText, { color }]}>{category}</Text>
    </View>
  );
};


// ─── DifficultyDots ──────────────────────────────────────────

interface DifficultyDotsProps {
  level: number;
}

export const DifficultyDots: React.FC<DifficultyDotsProps> = ({ level }) => {
  const color = level <= 2 ? palette.correct : level <= 3 ? palette.warning : palette.wrong;
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <View key={i} style={{
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: i <= level ? color : palette.graphite,
        }} />
      ))}
    </View>
  );
};


// ─── ScoreboardRow ───────────────────────────────────────────

interface Player {
  name: string;
  score: number;
  rank: number;
  avatar?: string;
  isCorrect?: boolean;
  streak?: number;
}

interface ScoreboardRowProps {
  player: Player;
  isHighlighted?: boolean;
}

export const ScoreboardRow: React.FC<ScoreboardRowProps> = ({ player, isHighlighted }) => {
  const { name, score, rank, avatar, isCorrect, streak } = player;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <View style={[
      styles.scoreRow,
      isHighlighted && styles.scoreRowHighlighted,
    ]}>
      <Text style={[styles.scoreRank, rank <= 3 && { color: palette.warning }]}>
        {rank <= 3 ? medals[rank-1] : `#${rank}`}
      </Text>
      <View style={styles.scoreAvatar}>
        <Text style={{ fontSize: 16 }}>{avatar || name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.scoreName} numberOfLines={1}>
        {name}
        {isCorrect !== undefined && (
          <Text style={{ color: isCorrect ? palette.correct : palette.wrong }}>
            {` ${isCorrect ? '✓' : '✗'}`}
          </Text>
        )}
      </Text>
      {streak && streak >= 3 && (
        <Text style={{ fontSize: 12, color: palette.warning }}>🔥{streak}</Text>
      )}
      <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
    </View>
  );
};


// ─── TextInput ───────────────────────────────────────────────

interface TapInputProps {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const TapInput: React.FC<TapInputProps> = ({
  label, error, value, onChangeText, placeholder,
}) => (
  <View style={{ gap: 6 }}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.ash}
      style={[styles.input, error && { borderColor: palette.wrong }]}
    />
    {error && <Text style={styles.inputError}>{error}</Text>}
  </View>
);


// ─── Toast ───────────────────────────────────────────────────

type ToastVariant = 'info' | 'success' | 'error' | 'warning';

const TOAST_MAP: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  info:    { bg: `${palette.cyan}12`, border: `${palette.cyan}40`, text: palette.cyan },
  success: { bg: `${palette.correct}12`, border: `${palette.correct}40`, text: palette.correct },
  error:   { bg: `${palette.wrong}12`, border: `${palette.wrong}40`, text: palette.wrong },
  warning: { bg: `${palette.warning}12`, border: `${palette.warning}40`, text: palette.warning },
};

interface ToastProps {
  variant?: ToastVariant;
  message: string;
  icon?: string;
}

export const Toast: React.FC<ToastProps> = ({ variant = 'info', message, icon }) => {
  const colors = TOAST_MAP[variant];
  return (
    <View style={[styles.toast, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {icon && <Text style={{ fontSize: 18 }}>{icon}</Text>}
      <Text style={[styles.toastText, { color: colors.text }]}>{message}</Text>
    </View>
  );
};


// ─── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    gap: 8,
  },
  buttonText: {
    fontFamily: font.bodyMedium,
    fontWeight: '600',
  },

  answerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    paddingHorizontal: 16,
    minHeight: 56,
    borderRadius: radius.xl,
    borderWidth: 2,
  },
  answerLetter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerLetterText: {
    fontFamily: font.display,
    fontSize: 16,
    fontWeight: '700',
  },
  answerText: {
    flex: 1,
    fontFamily: font.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },

  timerText: {
    fontFamily: font.monoBold,
    fontSize: 24,
    fontWeight: '700',
  },

  pill: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontFamily: font.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  scoreRowHighlighted: {
    backgroundColor: `${palette.cyan}12`,
    borderColor: `${palette.cyan}30`,
  },
  scoreRank: {
    fontFamily: font.mono,
    fontSize: 13,
    fontWeight: '700',
    color: palette.ash,
    minWidth: 24,
    textAlign: 'center',
  },
  scoreAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: palette.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreName: {
    flex: 1,
    fontFamily: font.bodyMedium,
    fontSize: 15,
    color: palette.snow,
  },
  scoreValue: {
    fontFamily: font.monoBold,
    fontSize: 16,
    fontWeight: '700',
    color: palette.cyan,
    minWidth: 48,
    textAlign: 'right',
  },

  input: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: palette.slate,
    borderWidth: 1.5,
    borderColor: palette.graphite,
    color: palette.snow,
    fontFamily: font.body,
    fontSize: 16,
  },
  inputLabel: {
    fontFamily: font.bodyMedium,
    fontSize: 13,
    color: palette.frost,
  },
  inputError: {
    fontFamily: font.body,
    fontSize: 12,
    color: palette.wrong,
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  toastText: {
    fontFamily: font.bodyMedium,
    fontSize: 14,
  },
});
