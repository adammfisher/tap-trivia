import { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientBackground } from '../components/GradientBackground';
import { Avatar } from '../components/Avatar';
import { useSavedBars } from '../hooks/useSavedBars';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { useGame } from '../contexts/GameContext';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { bars } = useSavedBars();
  const { nickname } = usePlayerIdentity();
  const { gameState, resetGame } = useGame();
  const inGame = gameState.gamePhase !== 'idle';

  // Re-read nickname from AsyncStorage on screen focus (picks up changes from EditNickname)
  const [freshNickname, setFreshNickname] = useState<string | null>(nickname);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('@taptrivia:nickname').then((val) => {
        if (val !== null) setFreshNickname(val);
      });
    }, [])
  );
  const playerName = freshNickname || nickname || 'Player';

  // Auto-dismiss when game phase changes so we don't block navigation
  const initialPhaseRef = useRef(gameState.gamePhase);
  useEffect(() => {
    if (gameState.gamePhase !== initialPhaseRef.current) {
      navigation.goBack();
    }
  }, [gameState.gamePhase, navigation]);

  const handleLeaveGame = () => {
    resetGame();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Profile</Text>
            <View style={styles.profileRow}>
              <Avatar name={playerName} size={50} isYou />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{playerName}</Text>
                <Text style={styles.profileSince}>Playing since Feb 2026</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('EditNickname')} style={styles.editButton}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>
          </View>

          {/* Saved Locations */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Saved Games</Text>
            <View style={styles.barsList}>
              {bars.length === 0 ? (
                <Text style={styles.emptyText}>No saved locations yet</Text>
              ) : (
                bars.map((bar, i) => (
                  <View
                    key={bar.code}
                    style={[
                      styles.barRow,
                      i < bars.length - 1 && styles.barRowBorder,
                    ]}
                  >
                    <Text style={styles.barIcon}>{'\u{1F37A}'}</Text>
                    <View style={styles.barInfo}>
                      <Text style={styles.barName}>{bar.name}</Text>
                      <Text style={styles.barMeta}>{bar.code} {'\u00B7'} {bar.lastPlayed}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Leave Game */}
          {inGame && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Current Game</Text>
              <Text style={styles.leaveDescription}>
                Leave the current game and go back to the home screen. You can join a different location or play solo.
              </Text>
              <Pressable
                onPress={handleLeaveGame}
                style={({ pressed }) => [styles.leaveButton, pressed && { opacity: 0.8 }]}
              >
                <Text style={styles.leaveButtonText}>Leave Game</Text>
              </Pressable>
            </View>
          )}

          {/* App Info */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>App</Text>
            <View style={styles.linksList}>
              <Pressable onPress={() => Linking.openURL('https://taptrivia.tv/terms.html')} style={styles.linkRow}>
                <Text style={styles.linkText}>Terms of Service</Text>
                <Text style={styles.linkArrow}>{'\u2192'}</Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL('https://taptrivia.tv/privacy.html')} style={styles.linkRow}>
                <Text style={styles.linkText}>Privacy Policy</Text>
                <Text style={styles.linkArrow}>{'\u2192'}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Feedback')} style={styles.linkRow}>
                <Text style={styles.linkText}>Send Feedback</Text>
                <Text style={styles.linkArrow}>{'\u2192'}</Text>
              </Pressable>
              <View style={[styles.linkRow, { marginTop: 4 }]}>
                <Text style={styles.versionLabel}>Version</Text>
                <Text style={styles.versionText}>1.0.0 (1)</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 2,
  },
  headerTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 20,
    color: '#fff',
  },
  closeButton: {
    backgroundColor: w(0.08),
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeText: { fontSize: 14, color: w(0.5) },
  scrollContent: {
    padding: 20,
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: w(0.06),
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: w(0.06),
  },
  cardLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: w(0.3),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: '#fff',
  },
  profileSince: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: w(0.35),
  },
  editButton: {
    backgroundColor: w(0.08),
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: w(0.5),
  },
  barsList: { gap: 0 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  barRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: w(0.04),
  },
  barIcon: { fontSize: 18 },
  barInfo: { flex: 1 },
  barName: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  barMeta: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: w(0.3),
  },
  emptyText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.3),
  },
  leaveDescription: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.4),
    lineHeight: 19,
    marginBottom: 14,
  },
  leaveButton: {
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 15,
    color: '#fff',
  },
  linksList: { gap: 10 },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.6),
  },
  linkArrow: {
    fontSize: 14,
    color: w(0.2),
  },
  versionLabel: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.4),
  },
  versionText: {
    fontFamily: fonts.dmMono.regular,
    fontSize: 12,
    color: w(0.2),
  },
});
