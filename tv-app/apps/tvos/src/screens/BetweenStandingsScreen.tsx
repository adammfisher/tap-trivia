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
            <FadeInView delay={0} style={s.headingWrap}>
              <Text style={s.headingIcon}>{'\u{1F3C6}'}</Text>
              <View>
                <Text style={s.heading}>Tap Standings</Text>
                <Text style={s.headingSub}>Weekly Score Index · {standings.stateName}</Text>
              </View>
            </FadeInView>

            {/* Your bar callout card */}
            <FadeInView delay={100} style={s.calloutCard}>
              <View style={s.calloutLeft}>
                <Text style={s.yourBarLabel}>YOUR BAR</Text>
                <Text style={s.barName}>{yourBar.name}</Text>
                <Text style={s.barCity}>
                  {[yourBar.city, yourBar.state].filter(Boolean).join(', ')}
                </Text>
                {yourBar.delta !== 0 && (
                  <View style={[s.deltaPill, yourBar.delta > 0 ? s.deltaPillUp : s.deltaPillDown]}>
                    <Text style={s.deltaText}>
                      {yourBar.delta > 0 ? '\u25B2' : '\u25BC'} {Math.abs(yourBar.delta)} spots this week
                    </Text>
                  </View>
                )}
              </View>
              <View style={s.calloutRight}>
                <Text style={s.indexValue}>{formatNumber(yourBar.index)}</Text>
                <Text style={s.indexLabel}>SCORE INDEX</Text>
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
              <View style={s.cardContent}>
                <Text style={s.cardTitle}>{'\u{1F4CA}'} SCORE INDEX</Text>
                <Text style={s.cardDesc}>
                  Average points per player, per question. The higher your bar's index, the sharper your regulars.
                </Text>
                <Text style={s.cardNote}>Resets every <Text style={s.cardNoteBold}>Monday</Text></Text>
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
  headingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  headingIcon: { fontSize: 48 },
  heading: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 40,
    color: '#f0f0f0',
  },
  headingSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.4),
    marginTop: 2,
  },
  calloutCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  calloutLeft: { flex: 1, gap: 2 },
  yourBarLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: w(0.4),
    letterSpacing: 2,
    marginBottom: 2,
  },
  deltaPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  deltaPillUp: { backgroundColor: 'rgba(0,212,170,0.15)' },
  deltaPillDown: { backgroundColor: 'rgba(255,71,87,0.15)' },
  deltaText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: colors.green,
  },
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
  cardContent: { flex: 1 },
  cardTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    color: colors.gold,
    marginBottom: 8,
  },
  cardDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.5),
    lineHeight: 24,
  },
  cardNote: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.4),
    marginTop: 8,
  },
  cardNoteBold: {
    fontFamily: fonts.outfit.bold,
    color: w(0.6),
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
