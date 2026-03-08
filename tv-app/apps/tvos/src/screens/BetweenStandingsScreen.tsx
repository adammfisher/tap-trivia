import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Avatar } from '../components/Avatar';
import { QRBadge } from '../components/QRBadge';
import { CountdownBar } from '../components/CountdownBar';
import { FadeInView, FadeInText } from '../utils/animations';
import { useTVState } from '../contexts/TVStateContext';
import { formatNumber } from '../utils/format';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

export function BetweenStandingsScreen() {
  const { state } = useTVState();
  const standings = state.betweenData?.barStandings;
  const barCode = state.barCode;

  if (!standings) return <View style={s.root} />;

  const yourBar = standings.yourBar;
  const stateRanking = standings.stateRanking || [];

  return (
    <>
      <CountdownBar />
      <View style={s.root}>
        <View style={s.body}>
          {/* Left: Bar callout + state rankings */}
          <View style={s.leftCol}>
            <FadeInText delay={0} style={s.heading}>TAP STANDINGS</FadeInText>

            {/* Your bar callout card */}
            <FadeInView delay={100} style={s.calloutCard}>
              <View style={s.calloutLeft}>
                <Text style={s.barName}>{yourBar.name}</Text>
                <Text style={s.barCity}>
                  {[yourBar.city, yourBar.state].filter(Boolean).join(', ')}
                </Text>
              </View>
              <View style={s.calloutRight}>
                <Text style={s.indexLabel}>Score Index</Text>
                <Text style={s.indexValue}>{formatNumber(yourBar.index)}</Text>
              </View>
            </FadeInView>

            {/* State rankings */}
            <FadeInText delay={200} style={s.stateLabel}>
              {standings.stateName} Rankings
            </FadeInText>
            {stateRanking.map((bar, i) => (
              <FadeInView key={bar.name + i} delay={300 + i * 80} style={s.barRow}>
                <Text style={s.barRank}>#{bar.rank}</Text>
                <View style={s.barInfo}>
                  <Text style={s.barRowName} numberOfLines={1}>{bar.name}</Text>
                  {bar.city ? <Text style={s.barRowCity}>{bar.city}</Text> : null}
                </View>
                <Text style={s.barIndex}>{formatNumber(bar.index)}</Text>
              </FadeInView>
            ))}
          </View>

          {/* Right: Explainer + national rank */}
          <View style={s.rightCol}>
            {/* Score Index explainer */}
            <FadeInView delay={200} style={s.card}>
              <Text style={s.cardEmoji}>{'\u{1F4CA}'}</Text>
              <View style={s.cardContent}>
                <Text style={s.cardTitle}>What is Score Index?</Text>
                <Text style={s.cardDesc}>
                  Average points per question across all players at your bar this week.
                </Text>
              </View>
            </FadeInView>

            {/* National rank card */}
            <FadeInView delay={400} style={s.card}>
              <Text style={s.cardEmoji}>{'\u{1F1FA}\u{1F1F8}'}</Text>
              <View style={s.cardContent}>
                <Text style={s.cardLabel}>National Rank</Text>
                <Text style={s.nationalValue}>
                  {yourBar.nationalRank > 0
                    ? `#${yourBar.nationalRank} of ${yourBar.totalBars} bars`
                    : '—'}
                </Text>
              </View>
            </FadeInView>

            <View style={s.qrWrap}>
              <QRBadge barCode={barCode} />
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, flexDirection: 'row', paddingTop: 80 },
  leftCol: { flex: 1, padding: 48 },
  rightCol: { flex: 1, padding: 48 },
  heading: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 40,
    color: colors.gold,
    textAlign: 'center',
    marginBottom: 20,
  },
  calloutCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  calloutLeft: { flex: 1 },
  calloutRight: { alignItems: 'flex-end' },
  barName: {
    fontFamily: fonts.outfit.bold,
    fontSize: 26,
    color: '#f0f0f0',
    marginBottom: 4,
  },
  barCity: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.5),
  },
  indexLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.4),
    marginBottom: 2,
  },
  indexValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 40,
    color: colors.green,
  },
  stateLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 24,
    color: w(0.7),
    marginBottom: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 8,
  },
  barRank: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: w(0.4),
    width: 48,
  },
  barInfo: { flex: 1 },
  barRowName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 22,
    color: '#f0f0f0',
  },
  barRowCity: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.4),
  },
  barIndex: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 22,
    color: colors.gold,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 48 },
  cardContent: { flex: 1 },
  cardTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 22,
    color: '#f0f0f0',
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.5),
  },
  cardLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.5),
    marginBottom: 2,
  },
  nationalValue: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 32,
    color: '#f0f0f0',
  },
  qrWrap: {
    position: 'absolute',
    bottom: 20,
    right: 48,
  },
});
