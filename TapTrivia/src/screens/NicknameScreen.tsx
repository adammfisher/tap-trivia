import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { updatePlayer, isApiError } from '../services/api';
import { gradients, w, colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Nickname'>;

export function NicknameScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { barCode, barName, nameCollision } = route.params;
  const { nickname: savedNickname, deviceId, setNickname, loaded } = usePlayerIdentity();
  const [name, setName] = useState(savedNickname || '');

  // Sync when saved nickname loads from AsyncStorage
  useEffect(() => {
    if (loaded && savedNickname && !name) {
      setName(savedNickname);
    }
  }, [loaded, savedNickname]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2 && name.trim().length <= 30;

  const handleSubmit = async () => {
    if (!isValid || !deviceId) return;

    const trimmed = name.trim();
    setLoading(true);
    setError('');
    Keyboard.dismiss();

    try {
      // Trial state lives entirely with Apple/Google + RevenueCat now —
      // no client-tracked timestamp to forward.
      const result = await updatePlayer(deviceId, trimmed, barCode, undefined);
      if (isApiError(result)) {
        setError(result.message || 'Failed to save nickname.');
        setLoading(false);
        return;
      }

      const effectiveName = result.displayName || trimmed;
      await setNickname(effectiveName);
    } catch {
      setError('Failed to save nickname.');
      setLoading(false);
      return;
    }

    setLoading(false);
    navigation.navigate('Lobby', { barCode, barName, playerId: deviceId });
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2190'}</Text>
          </Pressable>
          <Logo size="sm" />
        </View>

        {/* Center */}
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled" bounces={false}>
          <Text style={styles.emoji}>{'\u{1F44B}'}</Text>
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.subtitle}>This is shown on the leaderboard</Text>

          {nameCollision && savedNickname ? (
            <View style={styles.collisionBanner}>
              <Text style={styles.collisionText}>
                Someone named <Text style={styles.collisionName}>{savedNickname}</Text> is already at this location.
                Pick a different name or you'll appear as {savedNickname}_2 on the leaderboard.
              </Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError('');
              }}
              maxLength={30}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              placeholder="Your nickname"
              placeholderTextColor={w(0.25)}
              style={styles.input}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            <Text style={styles.charCount}>{name.length}/30</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!isValid || loading}
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[...gradients.selected]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submitButton, (!isValid || loading) && styles.submitDisabled]}
            >
              <Text style={styles.submitText}>
                {loading ? 'Joining...' : "Let's Go!"}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 2,
  },
  backButton: { padding: 4 },
  backText: { fontSize: 20, color: w(0.5) },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontFamily: fonts.fredoka.bold, fontSize: 24, color: '#fff', marginBottom: 8 },
  subtitle: { fontFamily: fonts.outfit.regular, fontSize: 14, color: w(0.4), marginBottom: 32 },
  collisionBanner: {
    backgroundColor: w(0.06),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
  },
  collisionText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.6),
    textAlign: 'center',
    lineHeight: 20,
  },
  collisionName: {
    fontFamily: fonts.outfit.bold,
    color: colors.gold,
  },
  inputContainer: { width: '100%', position: 'relative', marginBottom: 8 },
  input: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: w(0.08),
    borderWidth: 2,
    borderColor: colors.blue,
    fontFamily: fonts.outfit.semiBold,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  charCount: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -8 }],
    fontFamily: fonts.outfit.regular,
    fontSize: 12,
    color: w(0.25),
  },
  error: { fontFamily: fonts.outfit.medium, fontSize: 13, color: colors.red, marginBottom: 8 },
  submitButton: {
    width: '100%',
    minWidth: 280,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: 'rgba(102,126,234,0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: fonts.outfit.bold, fontSize: 16, color: '#fff' },
});
