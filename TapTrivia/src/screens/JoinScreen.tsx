import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FadeInView, triggerShake } from '../utils/animations';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { joinBar, isApiError } from '../services/api';
import { colors, gradients, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Join'>;

export function JoinScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { nickname, deviceId, setBarCode } = usePlayerIdentity();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeX = useRef(new Animated.Value(0)).current;

  const handleCodeChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    setCode(cleaned);
    setError('');
  };

  const handleBoxTap = (index: number) => {
    // Tap a box to clear from that position onward and refocus input
    setCode(code.slice(0, index));
    setError('');
    inputRef.current?.focus();
  };

  const handleSubmit = async (submittedCode?: string) => {
    const codeToSubmit = submittedCode || code;
    if (codeToSubmit.length !== 5 || !deviceId) return;

    setLoading(true);
    setError('');
    Keyboard.dismiss();

    const result = await joinBar(codeToSubmit, deviceId);

    setLoading(false);

    if (isApiError(result)) {
      setError(result.message || "That code doesn't match any active location.");
      triggerShake(shakeX);
      return;
    }

    await setBarCode(codeToSubmit);

    // Always show Nickname screen — pre-populated with last used name
    navigation.navigate('Nickname', {
      barCode: result.barCode,
      barName: result.barName,
      nameCollision: result.nameCollision,
    });
  };

  const codeChars = code.padEnd(5, ' ').split('');

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>{'\u2190'}</Text>
            </Pressable>
            <Logo size="sm" />
          </View>
        </View>

        {/* Center content */}
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled" bounces={false}>
          <Text style={styles.title}>Enter Game Code</Text>

          {/* Code display boxes */}
          <Animated.View style={[styles.codeBoxes, { transform: [{ translateX: shakeX }] }]}>
            {codeChars.map((ch, i) => (
              <FadeInView
                key={i}
                delay={i * 60}
                duration={300}
              >
                <Pressable onPress={() => handleBoxTap(i)}>
                  <View
                    style={[
                      styles.codeBox,
                      i < code.length && styles.codeBoxFilled,
                      i === code.length && styles.codeBoxActive,
                    ]}
                  >
                    <Text style={styles.codeChar}>{ch === ' ' ? '' : ch}</Text>
                  </View>
                </Pressable>
              </FadeInView>
            ))}
          </Animated.View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <Text style={styles.hint}>Enter a location or group code</Text>
          )}

          {/* Hidden input */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            maxLength={5}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            style={styles.hiddenInput}
            keyboardType="default"
            returnKeyType="go"
            onSubmitEditing={() => handleSubmit()}
          />

          {/* Submit button */}
          <Pressable
            onPress={() => handleSubmit()}
            disabled={code.length !== 5 || loading}
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[...gradients.selected]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submitButton, (code.length !== 5 || loading) && styles.submitDisabled]}
            >
              <Text style={styles.submitText}>
                {loading ? 'Checking...' : 'Join Game \u2192'}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 2,
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 20,
    color: w(0.5),
  },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: w(0.45),
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  codeBoxes: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  codeBox: {
    width: 52,
    height: 62,
    borderRadius: 14,
    backgroundColor: w(0.08),
    borderWidth: 2,
    borderColor: w(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: colors.blue,
  },
  codeBoxActive: {
    borderColor: colors.blue,
  },
  codeChar: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 28,
    color: '#fff',
  },
  hint: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.3),
    marginBottom: 6,
  },
  error: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.red,
    marginBottom: 6,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
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
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: '#fff',
  },
});
