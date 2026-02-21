import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GradientBackground } from '../components/GradientBackground';
import { usePlayerIdentity } from '../hooks/usePlayerIdentity';
import { updatePlayer, isApiError } from '../services/api';
import { gradients, w, colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditNickname'>;

export function EditNicknameScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { nickname: savedNickname, deviceId, barCode, setNickname } = usePlayerIdentity();
  const [name, setName] = useState(savedNickname || '');
  const [loading, setLoading] = useState(false);

  const isValid = name.trim().length >= 2 && name.trim().length <= 16;
  const hasChanged = name.trim() !== (savedNickname || '');

  const handleSave = async () => {
    if (!isValid || !hasChanged || !deviceId) return;
    setLoading(true);
    Keyboard.dismiss();
    try {
      // Call backend to set name with dedup at current bar
      const result = await updatePlayer(deviceId, name.trim(), barCode || undefined);
      if (isApiError(result)) {
        setLoading(false);
        return;
      }
      await setNickname(result.displayName || name.trim());
    } catch {
      setLoading(false);
      return;
    }
    setLoading(false);
    navigation.goBack();
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Name</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Text style={styles.closeText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        {/* Center */}
        <View style={styles.center}>
          <Text style={styles.subtitle}>This is shown on the leaderboard</Text>

          <View style={styles.inputContainer}>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={16}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              placeholder="Your nickname"
              placeholderTextColor={w(0.25)}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Text style={styles.charCount}>{name.length}/16</Text>
          </View>

          <Pressable
            onPress={handleSave}
            disabled={!isValid || !hasChanged || loading}
            style={({ pressed }) => [pressed && { opacity: 0.9 }]}
          >
            <LinearGradient
              colors={[...gradients.selected]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.saveButton, (!isValid || !hasChanged || loading) && styles.saveDisabled]}
            >
              <Text style={styles.saveText}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  subtitle: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.4),
    marginBottom: 24,
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
  saveButton: {
    width: '100%',
    minWidth: 280,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: '#fff',
  },
});
