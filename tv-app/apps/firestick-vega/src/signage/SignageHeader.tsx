import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Logo } from '../components/Logo';
import { BarLogo } from '../components/BarLogo';
import { formatCountdown } from '../utils/format';
import { fonts, tvFontSizes } from '../theme/typography';
import { w } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface Props {
  barName: string;
  logoUrl?: string | null;
  secondsUntilNextGame?: number;
}

export const SignageHeader = React.memo(function SignageHeader({ barName, logoUrl, secondsUntilNextGame }: Props) {
  const [localSeconds, setLocalSeconds] = useState(secondsUntilNextGame || 0);

  // Sync when prop updates (every ~2s poll)
  useEffect(() => {
    setLocalSeconds(secondsUntilNextGame || 0);
  }, [secondsUntilNextGame]);

  // Tick down every second locally
  useEffect(() => {
    const t = setInterval(() => setLocalSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const countdownText = formatCountdown(localSeconds);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <BarLogo logoUrl={logoUrl} barName={barName} size={88} />
        <Text style={styles.barName} numberOfLines={1}>{barName}</Text>
      </View>
      <View style={styles.right}>
        <View style={styles.countdown}>
          <Text style={styles.countdownLabel}>Trivia starts in</Text>
          <Text style={styles.countdownValue}>{countdownText}</Text>
        </View>
        <View style={styles.divider} />
        <Logo size="sm" />
      </View>
    </View>
  );
}, (prev, next) =>
  prev.barName === next.barName &&
  prev.logoUrl === next.logoUrl &&
  prev.secondsUntilNextGame === next.secondsUntilNextGame
);

export function SignagePanelHeader({ barName, logoUrl }: { barName: string; logoUrl?: string | null }) {
  return (
    <View style={styles.panelHeader}>
      <BarLogo logoUrl={logoUrl} barName={barName} size={60} />
      <Text style={styles.panelBarName} numberOfLines={1}>{barName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 64,
    paddingVertical: 28,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  barName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: tvFontSizes.h4,
    color: '#ffffff',
    marginLeft: spacing.md,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdown: {
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  countdownLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: w(0.35),
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  countdownValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: tvFontSizes.h4,
    color: '#ffd200',
    letterSpacing: 1,
  },
  divider: {
    width: 2,
    height: 56,
    backgroundColor: w(0.15),
    marginHorizontal: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 28,
  },
  panelBarName: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 24,
    color: '#ffffff',
    flex: 1,
  },
});
