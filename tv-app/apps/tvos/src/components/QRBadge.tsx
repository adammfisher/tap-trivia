import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PLAYER_APP_URL } from '../config';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

interface Props {
  barCode: string;
  /** 'inline' = horizontal glass badge for overlays; 'lobby' = large vertical for lobby screen */
  variant?: 'inline' | 'lobby';
}

export function QRBadge({ barCode, variant = 'inline' }: Props) {
  if (variant === 'lobby') {
    return <LobbyQR barCode={barCode} />;
  }
  return <InlineQR barCode={barCode} />;
}

/** Horizontal glass badge: QR left, info right */
function InlineQR({ barCode }: { barCode: string }) {
  return (
    <View style={inlineStyles.container}>
      {/* QR Code */}
      <View style={inlineStyles.qrWrapper}>
        <QRCode
          value={PLAYER_APP_URL}
          size={130}
          backgroundColor="white"
          color="#1e0f4a"
        />
      </View>

      {/* Info */}
      <View style={inlineStyles.info}>
        <Text style={inlineStyles.title}>Join Trivia!</Text>
        <Text style={inlineStyles.offer}>Play free for 7 days</Text>
        <Text style={inlineStyles.scan}>SCAN TO START</Text>
        <Text style={inlineStyles.url}>
          {PLAYER_APP_URL.replace('https://', '')}
        </Text>
        <View style={inlineStyles.codeRow}>
          <Text style={inlineStyles.codeLabel}>JOIN </Text>
          <Text style={inlineStyles.codeValue}>{barCode}</Text>
        </View>
      </View>
    </View>
  );
}

/** Large vertical layout for lobby screen */
function LobbyQR({ barCode }: { barCode: string }) {
  return (
    <View style={lobbyStyles.container}>
      {/* QR Code */}
      <View style={lobbyStyles.qrWrapper}>
        <QRCode
          value={PLAYER_APP_URL}
          size={300}
          backgroundColor="white"
          color="#1e0f4a"
        />
      </View>

      {/* Code section */}
      <View style={lobbyStyles.codeSection}>
        <Text style={lobbyStyles.codeLabel}>ENTER CODE</Text>
        <Text style={lobbyStyles.codeValue}>{barCode}</Text>
        <Text style={lobbyStyles.url}>
          {PLAYER_APP_URL.replace('https://', '')}
        </Text>
      </View>
    </View>
  );
}

const inlineStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 42,
    paddingVertical: 31,
    paddingLeft: 36,
    paddingRight: 47,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 21,
    padding: 31,
  },
  info: {
    flexDirection: 'column',
  },
  title: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 42,
    color: '#f0f0f0',
    lineHeight: 50,
  },
  offer: {
    fontFamily: fonts.outfit.bold,
    fontSize: 29,
    color: colors.green,
    marginTop: 3,
  },
  scan: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 17,
    color: w(0.4),
    letterSpacing: 3,
    marginTop: 8,
    marginBottom: 3,
  },
  url: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 29,
    color: colors.gold,
    marginTop: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 13,
  },
  codeLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 23,
    color: w(0.4),
    letterSpacing: 3,
  },
  codeValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 36,
    color: colors.gold,
    letterSpacing: 5,
  },
});

const lobbyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 48,
  },
  codeSection: {
    alignItems: 'center',
  },
  codeLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 22,
    color: w(0.4),
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  codeValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 112,
    color: colors.gold,
    letterSpacing: 16,
  },
  url: {
    fontFamily: fonts.outfit.medium,
    fontSize: 26,
    color: w(0.3),
    marginTop: 12,
  },
});
