import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState, useEffect } from 'react';
import { FadeInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { SavedBarCard } from '../components/SavedBarCard';
import { useSavedBars } from '../hooks/useSavedBars';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { joinBar, isApiError } from '../services/api';
import { isInGameWindow, minutesUntilNextGame } from '../utils/game-clock';
import { colors, gradients, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

function useOffHoursCountdown() {
  const [countdown, setCountdown] = useState<{ hours: number; mins: number } | null>(null);

  useEffect(() => {
    function update() {
      if (isInGameWindow()) {
        setCountdown(null);
        return;
      }
      const totalMins = minutesUntilNextGame();
      setCountdown({ hours: Math.floor(totalMins / 60), mins: totalMins % 60 });
    }
    update();
    const id = setInterval(update, 30000); // update every 30s
    return () => clearInterval(id);
  }, []);

  return countdown;
}

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { bars } = useSavedBars();
  const { nickname, deviceId, setBarCode } = usePlayerIdentity();
  const offHours = useOffHoursCountdown();

  const handlePlaySolo = () => {
    if (!deviceId) return;
    if (nickname) {
      navigation.navigate('Lobby', { barCode: 'SOLO', barName: 'Solo Play', playerId: deviceId });
    } else {
      navigation.navigate('Nickname', { barCode: 'SOLO', barName: 'Solo Play' });
    }
  };

  const handleSavedBar = async (code: string, name: string) => {
    if (!deviceId) return;
    const result = await joinBar(code, deviceId);
    if (isApiError(result)) {
      // Bar may no longer be active — just go to Join screen
      navigation.navigate('Join');
      return;
    }
    await setBarCode(code);
    if (result.nameCollision || !nickname) {
      navigation.navigate('Nickname', { barCode: result.barCode, barName: result.barName, nameCollision: result.nameCollision });
    } else {
      navigation.navigate('Lobby', { barCode: result.barCode, barName: result.barName, playerId: deviceId });
    }
  };

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Settings gear */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsIcon}>{'\u2699'}</Text>
          </Pressable>
        </View>

        {/* Center content */}
        <ScrollView
          contentContainerStyle={styles.centerContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Logo size="lg" />
          </View>
          <Text style={styles.tagline}>Live trivia on your phone</Text>

          {offHours ? (
            <>
              <FadeInView duration={500} direction="none" style={styles.offHoursBanner}>
                <Text style={styles.offHoursEmoji}>{'\u{1F319}'}</Text>
                <Text style={styles.offHoursCountdown}>
                  {offHours.hours > 0 && (
                    <><Text style={styles.offHoursNumber}>{offHours.hours}</Text>h{' '}</>
                  )}
                  <Text style={styles.offHoursNumber}>{offHours.mins}</Text>m
                </Text>
                <Text style={styles.offHoursLabel}>until games begin</Text>
                <Text style={styles.offHoursMessage}>
                  Trivia runs nightly — the perfect way to unwind after work. Grab a drink, rally your crew, and we'll see you soon!
                </Text>
              </FadeInView>

              <FadeInView duration={500} delay={200} direction="none" style={styles.didYouKnowBanner}>
                <Text style={styles.didYouKnowTitle}>Did you know?</Text>
                <Text style={styles.didYouKnowMessage}>
                  The TapTrivia TV app is available on most platforms like Fire TV, Samsung, and Roku. Ask your favorite bar to turn it on — it's free! Or download it and host your own trivia night!
                </Text>
              </FadeInView>
            </>
          ) : (
            /* Live — show join/play buttons + saved bars */
            <>
              {/* Join a Game */}
              <Pressable
                onPress={() => navigation.navigate('Join')}
                style={({ pressed }) => [pressed && { opacity: 0.9 }]}
              >
                <LinearGradient
                  colors={[...gradients.selected]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.joinButton}
                >
                  <Text style={styles.joinButtonText}>Join a Game</Text>
                  <Text style={styles.joinButtonSub}>Enter a location or group code</Text>
                </LinearGradient>
              </Pressable>

              {/* Create a Group */}
              <Pressable
                onPress={() => navigation.navigate('CreateGroup')}
                style={({ pressed }) => [pressed && { opacity: 0.9 }]}
              >
                <LinearGradient
                  colors={[...gradients.selected]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.joinButton}
                >
                  <Text style={styles.joinButtonText}>Create a Group</Text>
                  <Text style={styles.joinButtonSub}>Play with friends — no TV needed</Text>
                </LinearGradient>
              </Pressable>

              {/* Play Solo */}
              <Pressable
                onPress={handlePlaySolo}
                style={({ pressed }) => [styles.soloButton, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.soloButtonText}>Play Solo</Text>
              </Pressable>

              {/* Saved bars */}
              {bars.length > 0 && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>SAVED</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <View style={styles.barsList}>
                    {bars.map((bar, i) => (
                      <FadeInView key={bar.code} delay={i * 60} duration={300}>
                        <SavedBarCard
                          bar={bar}
                          onPress={() => handleSavedBar(bar.code, bar.name)}
                        />
                      </FadeInView>
                    ))}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.footerText}>Games run every 15 minutes, 10 AM \u2013 9 PM ET</Text>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 2,
  },
  settingsButton: {
    backgroundColor: w(0.08),
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  settingsIcon: {
    fontSize: 14,
    color: w(0.4),
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 20,
  },
  tagline: {
    fontFamily: fonts.outfit.medium,
    fontSize: 16,
    color: w(0.45),
    textAlign: 'center',
    marginBottom: 36,
  },
  joinButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: 'rgba(102,126,234,0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
    marginBottom: 12,
    minWidth: 300,
  },
  joinButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: '#fff',
  },
  joinButtonSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: w(0.08),
  },
  dividerText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: w(0.25),
    letterSpacing: 1,
  },
  barsList: {
    width: '100%',
    gap: 6,
    marginTop: 10,
  },
  offHoursBanner: {
    backgroundColor: w(0.06),
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: w(0.08),
  },
  offHoursEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  offHoursCountdown: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: w(0.4),
    letterSpacing: 1,
  },
  offHoursNumber: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 32,
    color: colors.gold,
  },
  offHoursLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: w(0.35),
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2,
    marginBottom: 10,
  },
  offHoursMessage: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.4),
    textAlign: 'center',
    lineHeight: 19,
  },
  didYouKnowBanner: {
    backgroundColor: w(0.06),
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: w(0.08),
  },
  didYouKnowTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: colors.gold,
    marginBottom: 8,
  },
  didYouKnowMessage: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.4),
    textAlign: 'center',
    lineHeight: 19,
  },
  soloButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  soloButtonText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: w(0.4),
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: w(0.15),
  },
});
