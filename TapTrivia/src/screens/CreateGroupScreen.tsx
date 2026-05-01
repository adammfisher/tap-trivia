import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { useSavedBars } from '../hooks/useSavedBars';
import { createGroup, joinBar, isApiError } from '../services/api';
import { gradients, w, colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateGroup'>;

export function CreateGroupScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { nickname, deviceId, setBarCode } = usePlayerIdentity();
  const { saveBar } = useSavedBars();

  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Success state
  const [createdCode, setCreatedCode] = useState('');
  const [createdName, setCreatedName] = useState('');

  const isValid = groupName.trim().length >= 2 && groupName.trim().length <= 30;

  const handleCreate = async () => {
    if (!isValid || !deviceId) return;

    const trimmed = groupName.trim();
    setLoading(true);
    setError('');
    Keyboard.dismiss();

    const result = await createGroup(trimmed, deviceId);
    if (isApiError(result)) {
      setError(result.message);
      setLoading(false);
      return;
    }

    // Auto-join the group
    await joinBar(result.barCode, deviceId);
    await setBarCode(result.barCode);
    await saveBar(result.barCode, result.barName, 'group');

    setCreatedCode(result.barCode);
    setCreatedName(result.barName);
    setLoading(false);
  };

  const handleShare = async () => {
    await Share.share({
      message: `Join my TapTrivia group "${createdName}"! Use code: ${createdCode}\n\nDownload: https://taptrivia.tv`,
    });
  };

  const handleContinue = () => {
    if (!deviceId) return;
    if (nickname) {
      navigation.navigate('Lobby', {
        barCode: createdCode,
        barName: createdName,
        playerId: deviceId,
      });
    } else {
      navigation.navigate('Nickname', {
        barCode: createdCode,
        barName: createdName,
      });
    }
  };

  // ── Success state ──
  if (createdCode) {
    return (
      <GradientBackground>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>{'←'}</Text>
            </Pressable>
            <Logo size="sm" />
          </View>

          <ScrollView contentContainerStyle={styles.center} bounces={false}>
            <Text style={styles.emoji}>{'\u2705'}</Text>
            <Text style={styles.title}>Group Created!</Text>
            <Text style={styles.subtitle}>Share this code with friends</Text>

            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{createdCode}</Text>
            </View>
            <Text style={styles.groupNameLabel}>{createdName}</Text>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [pressed && { opacity: 0.9 }]}
            >
              <LinearGradient
                colors={[...gradients.selected]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shareButton}
              >
                <Text style={styles.shareButtonText}>Share Code</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [styles.continueButton, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          </ScrollView>
        </View>
      </GradientBackground>
    );
  }

  // ── Create form ──
  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2190'}</Text>
          </Pressable>
          <Logo size="sm" />
        </View>

        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled" bounces={false}>
          <Text style={styles.emoji}>{'\u{1F465}'}</Text>
          <Text style={styles.title}>Create a Group</Text>
          <Text style={styles.subtitle}>
            Give your group a name. Share the code with friends to play together!
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text);
                setError('');
              }}
              maxLength={30}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              placeholder="Group name"
              placeholderTextColor={w(0.25)}
              style={styles.input}
              returnKeyType="go"
              onSubmitEditing={handleCreate}
            />
            <Text style={styles.charCount}>{groupName.length}/30</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleCreate}
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
                {loading ? 'Creating...' : 'Create Group'}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 2,
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
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 24,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.4),
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 8,
  },
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
  error: {
    fontFamily: fonts.outfit.medium,
    fontSize: 13,
    color: colors.red,
    marginBottom: 8,
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
  // Success state styles
  codeBox: {
    backgroundColor: w(0.08),
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: colors.blue,
    marginBottom: 8,
  },
  codeText: {
    fontFamily: fonts.dmMono.medium,
    fontSize: 36,
    color: colors.gold,
    letterSpacing: 8,
    textAlign: 'center',
  },
  groupNameLabel: {
    fontFamily: fonts.outfit.medium,
    fontSize: 14,
    color: w(0.4),
    marginBottom: 24,
  },
  shareButton: {
    width: '100%',
    minWidth: 280,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: 'rgba(102,126,234,0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  shareButtonText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: '#fff',
  },
  continueButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  continueText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 15,
    color: w(0.5),
  },
});
