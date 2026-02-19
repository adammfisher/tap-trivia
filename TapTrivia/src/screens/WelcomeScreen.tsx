import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FadeInView } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { SavedBarCard } from '../components/SavedBarCard';
import { useSavedBars } from '../hooks/useSavedBars';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { joinBar, isApiError } from '../services/api';
import { gradients, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { bars } = useSavedBars();
  const { nickname, deviceId, setBarCode } = usePlayerIdentity();

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
    // Re-join the bar via API
    const result = await joinBar(code, deviceId);
    if (isApiError(result)) {
      // Bar may no longer be active — just go to Join screen
      navigation.navigate('Join');
      return;
    }
    await setBarCode(code);
    if (nickname) {
      navigation.navigate('Lobby', { barCode: result.barCode, barName: result.barName, playerId: deviceId });
    } else {
      navigation.navigate('Nickname', { barCode: result.barCode, barName: result.barName });
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
          <Text style={styles.tagline}>Live bar trivia on your phone</Text>

          {/* Join a Bar */}
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
              <Text style={styles.joinButtonText}>Join a Bar</Text>
              <Text style={styles.joinButtonSub}>Enter the code on the bar TV</Text>
            </LinearGradient>
          </Pressable>

          {/* Play Solo */}
          <Pressable
            onPress={handlePlaySolo}
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[...gradients.selected]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.joinButton}
            >
              <Text style={styles.joinButtonText}>Play Solo</Text>
              <Text style={styles.joinButtonSub}>No bar code needed</Text>
            </LinearGradient>
          </Pressable>

          {/* Saved bars */}
          {bars.length > 0 && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>YOUR BARS</Text>
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
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.footerText}>Games run every 15 minutes, 5 PM \u2013 2 AM ET</Text>
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
