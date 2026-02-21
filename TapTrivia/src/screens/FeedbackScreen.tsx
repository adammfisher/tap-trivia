import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientBackground } from '../components/GradientBackground';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { submitFeedback, isApiError } from '../services/api';
import { colors, gradients, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;
type Category = 'general' | 'bug' | 'feature';

const CATEGORY_OPTIONS: { key: Category; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'bug', label: 'Bug Report' },
  { key: 'feature', label: 'Feature Idea' },
];

export function FeedbackScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { deviceId, nickname, barCode } = usePlayerIdentity();

  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const goBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (goBackTimer.current) clearTimeout(goBackTimer.current);
    };
  }, []);

  const isValid = message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError('');

    const result = await submitFeedback({
      message: message.trim(),
      category,
      email: email.trim() || undefined,
      nickname: nickname || undefined,
      barCode: barCode || undefined,
      platform: Platform.OS,
      appVersion: '1.0.0',
      deviceId: deviceId || undefined,
    });

    setLoading(false);

    if (isApiError(result)) {
      setError(result.message || 'Something went wrong. Please try again.');
      return;
    }

    setSuccess(true);
    goBackTimer.current = setTimeout(() => navigation.goBack(), 2500);
  };

  if (success) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.successContainer}>
            <Text style={styles.successEmoji}>{'\u2705'}</Text>
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successMessage}>
              Your feedback means a lot to us. We read every submission and use it to make TapTrivia better for everyone.
            </Text>
          </View>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Send Feedback</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.kavInner}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 10 : 0}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome card */}
          <View style={styles.card}>
            <Text style={styles.welcomeTitle}>We'd love to hear from you</Text>
            <Text style={styles.welcomeSubtitle}>
              Bug reports, feature ideas, or just saying hi — your voice helps shape TapTrivia.
            </Text>
          </View>

          {/* Category picker */}
          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORY_OPTIONS.map(({ key, label }) => (
              <Pressable key={key} onPress={() => setCategory(key)} style={styles.categoryPillWrap}>
                {category === key ? (
                  <LinearGradient
                    colors={[...gradients.selected]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryPill}
                  >
                    <Text style={styles.categoryPillTextActive}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.categoryPillInactive}>
                    <Text style={styles.categoryPillText}>{label}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Message input */}
          <Text style={styles.label}>MESSAGE</Text>
          <View style={styles.inputContainer}>
            <TextInput
              value={message}
              onChangeText={(t) => {
                setMessage(t);
                setError('');
              }}
              multiline
              maxLength={2000}
              placeholder="Tell us what's on your mind..."
              placeholderTextColor={w(0.25)}
              style={styles.messageInput}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{message.length}/2000</Text>
          </View>

          {/* Email input */}
          <Text style={styles.label}>EMAIL (OPTIONAL)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="For follow-up, if you'd like"
            placeholderTextColor={w(0.25)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.emailInput}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Submit button */}
          <Pressable onPress={handleSubmit} disabled={!isValid || loading}>
            <LinearGradient
              colors={[...gradients.selected]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.submitButton, (!isValid || loading) && styles.submitDisabled]}
            >
              <Text style={styles.submitText}>
                {loading ? 'Sending...' : 'Send Feedback'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.disclaimer}>
            Your device ID is included to help us follow up. No personal information is shared.
          </Text>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kavInner: { flex: 1 },
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
    paddingBottom: 40,
  },
  card: {
    backgroundColor: w(0.06),
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: w(0.06),
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 18,
    color: '#fff',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 13,
    color: w(0.4),
    lineHeight: 20,
    textAlign: 'center',
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: w(0.3),
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  categoryPillWrap: {
    flex: 1,
  },
  categoryPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  categoryPillInactive: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: w(0.08),
  },
  categoryPillTextActive: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: '#fff',
  },
  categoryPillText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 12,
    color: w(0.4),
  },
  inputContainer: {
    marginBottom: 18,
  },
  messageInput: {
    backgroundColor: w(0.08),
    borderWidth: 2,
    borderColor: w(0.1),
    borderRadius: 14,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: '#fff',
    minHeight: 100,
    padding: 16,
    paddingTop: 16,
  },
  charCount: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: w(0.2),
    textAlign: 'right',
    marginTop: 4,
  },
  emailInput: {
    backgroundColor: w(0.08),
    borderWidth: 2,
    borderColor: w(0.1),
    borderRadius: 14,
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: '#fff',
    padding: 16,
    marginBottom: 18,
  },
  error: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 13,
    color: colors.red,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
  disclaimer: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: w(0.2),
    textAlign: 'center',
    marginTop: 12,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  successEmoji: { fontSize: 48, marginBottom: 16 },
  successTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 24,
    color: colors.green,
    marginBottom: 12,
  },
  successMessage: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.5),
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
