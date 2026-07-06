import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FadeInView } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { getCategoryIcon } from '../utils/format';
import { PLAYER_APP_URL } from '../config';
import { fonts } from '../theme/typography';
import { colors } from '../theme/colors';

let QRCode: any;
try { QRCode = require('react-native-qrcode-svg').default; } catch {}

// Between-games slide 5 (1:40–2:00): next-round hype — matches Roku ComingUp.
export function ComingUpScreen() {
  const { state } = useTVState();
  const { barCode } = state;
  const categories = (state.betweenData?.hype?.categories || []).slice(0, 8);

  return (
    <View style={s.root}>
      {/* Left: Join CTA */}
      <View style={s.left}>
        <Text style={s.emoji}>🧠</Text>
        <Text style={s.bigPlay}>
          Play <Text style={s.bigPlayGold}>TapTrivia</Text>
        </Text>
        <Text style={s.offer}>Free for 7 days</Text>
        <View style={s.qrCard}>
          {QRCode && <QRCode value={PLAYER_APP_URL} size={300} color="#1e0f4a" backgroundColor="#ffffff" />}
        </View>
        <Text style={s.url}>app.taptrivia.tv</Text>
        <Text style={s.codeLabel}>AND ENTER CODE</Text>
        <Text style={s.code}>{barCode}</Text>
      </View>

      {/* Right: next-round categories */}
      <View style={s.right}>
        <Text style={s.kicker}>NEXT ROUND STARTS SOON</Text>
        <Text style={s.heading}>Coming Up</Text>
        {categories.length > 0 ? (
          <View style={s.grid}>
            {categories.map((cat, i) => (
              <FadeInView key={cat + i} delay={i * 60} style={s.cell}>
                <Text style={s.cellIcon}>{getCategoryIcon(cat)}</Text>
                <Text style={s.cellName} numberOfLines={2}>{cat}</Text>
              </FadeInView>
            ))}
          </View>
        ) : (
          <Text style={s.soon}>New categories every round</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', paddingTop: 80 },
  left: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 60 },
  emoji: { fontSize: 84, marginBottom: 8 },
  bigPlay: { fontFamily: fonts.fredoka.bold, fontSize: 72, color: '#ffffff' },
  bigPlayGold: { color: colors.gold },
  offer: { fontFamily: fonts.fredoka.bold, fontSize: 34, color: colors.green, marginTop: 4, marginBottom: 24 },
  qrCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 12 },
  url: { fontFamily: fonts.dmMono.regular, fontSize: 24, color: colors.gold, marginTop: 20 },
  codeLabel: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 18,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 12,
    letterSpacing: 2,
  },
  code: { fontFamily: fonts.fredoka.bold, fontSize: 58, color: colors.gold, letterSpacing: 4 },
  right: { flex: 1, justifyContent: 'center', paddingHorizontal: 60 },
  kicker: { fontFamily: fonts.dmMono.regular, fontSize: 21, color: '#667eea', letterSpacing: 1 },
  heading: { fontFamily: fonts.fredoka.bold, fontSize: 49, color: '#ffffff', marginTop: 6, marginBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: 358,
    height: 84,
    paddingHorizontal: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
  },
  cellIcon: { fontSize: 36 },
  cellName: { flex: 1, fontFamily: fonts.outfit.semiBold, fontSize: 21, color: 'rgba(255,255,255,0.85)' },
  soon: { fontFamily: fonts.outfit.medium, fontSize: 28, color: 'rgba(255,255,255,0.4)' },
});
