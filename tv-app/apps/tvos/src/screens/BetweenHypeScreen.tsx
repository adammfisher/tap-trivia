import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Logo } from '../components/Logo';
import { CountdownBar } from '../components/CountdownBar';
import { FadeInView, FadeInText, ZoomInView } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { getCategoryIcon } from '../utils/format';
import { PLAYER_APP_URL } from '../config';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

let QRCode: any;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch {}

function CategoryPill({ name, delay }: { name: string; delay: number }) {
  const icon = getCategoryIcon(name);
  return (
    <FadeInView delay={delay} style={s.pill}>
      <Text style={s.pillIcon}>{icon}</Text>
      <Text style={s.pillText}>{name}</Text>
    </FadeInView>
  );
}

export function BetweenHypeScreen() {
  const { state } = useTVState();
  const hype = state.betweenData?.hype;
  const barCode = state.barCode;

  if (!hype) return <View style={s.root} />;

  const categories = (hype.categories || []).slice(0, 4);

  return (
    <>
      <CountdownBar />
      <View style={s.root}>
        <View style={s.center}>
          {/* Logo */}
          <ZoomInView spring style={s.logoWrap}>
            <Logo size="xl" />
          </ZoomInView>

          {/* Next Game heading */}
          <FadeInText delay={200} style={s.heading}>NEXT GAME</FadeInText>

          {/* Categories label */}
          <FadeInText delay={300} style={s.catLabel}>Categories</FadeInText>

          {/* Category pills */}
          <View style={s.pillGrid}>
            {categories.map((cat, i) => (
              <CategoryPill key={cat + i} name={cat} delay={400 + i * 80} />
            ))}
          </View>

          {/* Big QR code */}
          <FadeInView delay={600} style={s.qrArea}>
            {QRCode && (
              <QRCode
                value={PLAYER_APP_URL}
                size={200}
                color="#1e0f4a"
                backgroundColor="#ffffff"
              />
            )}
            <Text style={s.url}>play.taptrivia.tv</Text>
            <View style={s.codeRow}>
              <Text style={s.codeLabel}>CODE</Text>
              <Text style={s.codeValue}>{barCode}</Text>
            </View>
          </FadeInView>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  logoWrap: { marginBottom: 16 },
  heading: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 48,
    color: colors.gold,
    marginBottom: 8,
  },
  catLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: w(0.5),
    marginBottom: 16,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
    maxWidth: 1200,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 40,
  },
  pillIcon: { fontSize: 36 },
  pillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 32,
    color: '#f0f0f0',
  },
  qrArea: { alignItems: 'center', gap: 8 },
  url: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 26,
    color: colors.gold,
    marginTop: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 20,
    color: w(0.3),
  },
  codeValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 28,
    color: colors.gold,
  },
});
