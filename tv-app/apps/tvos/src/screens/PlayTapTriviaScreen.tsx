import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTVState } from '../contexts/TVStateContext';
import { PLAYER_APP_URL } from '../config';
import { fonts } from '../theme/typography';
import { colors } from '../theme/colors';

let QRCode: any;
try { QRCode = require('react-native-qrcode-svg').default; } catch {}

// Between-games slide 3 (0:40–1:20): Play TapTrivia CTA — matches Roku PlayTapTrivia.
export function PlayTapTriviaScreen() {
  const { state } = useTVState();
  const { barCode } = state;

  return (
    <View style={s.root}>
      {/* Left: CTA */}
      <View style={s.left}>
        <Text style={s.emoji}>🧠</Text>
        <Text style={s.kicker}>NEW QUESTIONS EVERY 15 MIN</Text>
        <Text style={s.bigPlay}>
          Play <Text style={s.bigPlayGold}>TapTrivia</Text>
        </Text>
        <Text style={s.offer}>Free for 7 days</Text>
        <Text style={s.scan}>Scan the code → playing on your phone in seconds</Text>
        <Text style={s.url}>app.taptrivia.tv</Text>
        <Text style={s.codeLabel}>AND ENTER CODE</Text>
        <Text style={s.code}>{barCode}</Text>
      </View>

      {/* Right: QR */}
      <View style={s.right}>
        <View style={s.qrCard}>
          {QRCode && <QRCode value={PLAYER_APP_URL} size={460} color="#1e0f4a" backgroundColor="#ffffff" />}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingTop: 80 },
  left: { flex: 1.05, paddingLeft: 128, paddingRight: 40, justifyContent: 'center' },
  emoji: { fontSize: 100, marginBottom: 12 },
  kicker: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 24,
    color: '#667eea',
    marginBottom: 16,
    letterSpacing: 1,
  },
  bigPlay: { fontFamily: fonts.fredoka.bold, fontSize: 90, color: '#ffffff' },
  bigPlayGold: { color: colors.gold },
  offer: { fontFamily: fonts.fredoka.bold, fontSize: 46, color: colors.green, marginTop: 8 },
  scan: {
    fontFamily: fonts.outfit.regular,
    fontSize: 33,
    color: 'rgba(255,255,255,0.6)',
    maxWidth: 780,
    marginTop: 18,
  },
  url: { fontFamily: fonts.dmMono.regular, fontSize: 30, color: colors.gold, marginTop: 28 },
  codeLabel: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 24,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 28,
    letterSpacing: 2,
  },
  code: { fontFamily: fonts.fredoka.bold, fontSize: 78, color: colors.gold, letterSpacing: 6 },
  right: { flex: 0.95, alignItems: 'center', justifyContent: 'center' },
  qrCard: { backgroundColor: '#ffffff', borderRadius: 28, padding: 24 },
});
