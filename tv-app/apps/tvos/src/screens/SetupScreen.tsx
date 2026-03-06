import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { useTVState } from '../contexts/TVStateContext';
import { fonts, tvFontSizes } from '../theme/typography';
import { colors, w, b } from '../theme/colors';
import { borderRadius, spacing } from '../theme/spacing';

type RegState = 'form' | 'sending' | 'sent';
type CodeState = 'input' | 'verifying' | 'activated' | 'error';

export function SetupScreen() {
  const { state, register, activate } = useTVState();

  // Register panel state
  const [regState, setRegState] = useState<RegState>('form');
  const [locName, setLocName] = useState('');
  const [email, setEmail] = useState('');
  const [regError, setRegError] = useState('');
  const [registeredCode, setRegisteredCode] = useState('');

  // Activate panel state — pre-fill bar code if returning from a live session
  const [codeState, setCodeState] = useState<CodeState>('input');
  const [code, setCode] = useState(state.barCode || '');
  const [codeError, setCodeError] = useState('');
  const codeInputRef = useRef<TextInput>(null);


  // ─── Register ───────────────────────────────────────────────────────

  const handleRegister = useCallback(async () => {
    if (!locName.trim()) return;
    setRegState('sending');
    setRegError('');
    try {
      const barCode = await register(locName.trim(), email.trim() || undefined);
      setRegisteredCode(barCode);
      setRegState('sent');
      setCode(barCode);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
      setRegState('form');
    }
  }, [locName, email, register]);

  // ─── Activate ───────────────────────────────────────────────────────

  const handleCodeChange = useCallback((val: string) => {
    setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5));
    setCodeError('');
    setCodeState('input');
  }, []);

  const handleActivate = useCallback(async () => {
    if (code.length !== 5) return;
    setCodeState('verifying');
    setCodeError('');
    try {
      await activate(code);
      setCodeState('activated');
    } catch (err: any) {
      setCodeError(err.message || 'Invalid code');
      setCodeState('error');
      setTimeout(() => setCodeState('input'), 2000);
    }
  }, [code, activate]);

  const codeReady = code.length === 5;

  return (
    <GradientBackground>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Logo size="lg" />
        </View>

        {/* Two-column layout */}
        <View style={s.columns}>

          {/* ── LEFT: Register ─────────────────────────────── */}
          <View style={s.left}>
            {/* Badge */}
            <View style={s.badge}>
              <Text style={s.badgeText}>{'\uD83D\uDCFA'} NEW LOCATION</Text>
            </View>

            <Text style={s.heading}>Register Your Location</Text>
            <Text style={s.desc}>
              Everything is free — live trivia, signage, analytics. Just enter your location name to get started.
            </Text>

            {regState === 'form' && (
              <>
                <TextInput
                  style={s.input}
                  value={locName}
                  onChangeText={setLocName}
                  placeholder={"\uD83D\uDCCD  Your location's name"}
                  placeholderTextColor={w(0.35)}
                  autoCapitalize="words"
                />

                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={"\u2709\uFE0F  Owner email (optional)"}
                  placeholderTextColor={w(0.35)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                {/* Signage promo card */}
                <View style={s.promoCard}>
                  <Text style={s.promoTitle}>{'\uD83D\uDCFA'} Free Digital Signage</Text>
                  <Text style={s.promoDesc}>
                    Add your email to get free signage, a dashboard & analytics — all completely free
                  </Text>
                </View>

                {/* Feature bullets */}
                <View style={s.features}>
                  <Text style={s.featureText}>{'\uD83C\uDF79'} Free live trivia that drives traffic and keeps guests longer</Text>
                  <Text style={s.featureText}>{'\uD83D\uDCFA'} Free digital signage to promote your specials & events</Text>
                  <Text style={s.featureText}>{'\uD83D\uDCCA'} Free dashboard with player metrics and engagement analytics</Text>
                </View>

                {regError ? <Text style={s.error}>{regError}</Text> : null}

                <TouchableOpacity
                  style={[s.registerBtn, !locName.trim() && s.btnDisabled]}
                  onPress={handleRegister}
                  disabled={!locName.trim()}
                >
                  <Text style={s.registerBtnText}>{'\uD83D\uDCCB'} REGISTER & GET CODE</Text>
                </TouchableOpacity>

                <Text style={s.hint}>Use your TV remote or USB keyboard to type</Text>
              </>
            )}

            {regState === 'sending' && (
              <View style={s.centered}>
                <ActivityIndicator size="large" color={colors.gold} />
                <Text style={s.statusText}>Registering...</Text>
              </View>
            )}

            {regState === 'sent' && (
              <View style={s.centered}>
                <Text style={s.successIcon}>{'\u2713'}</Text>
                <Text style={s.successText}>Registered!</Text>
                <Text style={s.registeredCode}>{registeredCode}</Text>
                <Text style={s.hintText}>
                  Code auto-filled on the right. Press Activate to start.
                </Text>
              </View>
            )}
          </View>

          {/* ── Divider ───────────────────────────────────── */}
          <View style={s.divider}>
            <View style={s.dividerCircle}>
              <Text style={s.dividerText}>OR</Text>
            </View>
          </View>

          {/* ── RIGHT: Activate ────────────────────────────── */}
          <View style={s.right}>
            {/* Badge */}
            <View style={[s.badge, s.badgeCenter, codeReady && s.badgeReady]}>
              <Text style={s.badgeText}>
                {codeReady ? '\u2713 CODE READY' : '\uD83D\uDD11 ENTER CODE'}
              </Text>
            </View>

            <Text style={s.heading}>Activate This TV</Text>
            <Text style={s.desc}>
              {codeReady
                ? 'Your code is loaded and ready. Hit activate to start!'
                : 'Enter your 5-character bar code to connect this TV.'}
            </Text>

            {/* Single code input */}
            <TextInput
              ref={codeInputRef}
              style={[s.codeInput, codeState === 'error' && s.codeInputError]}
              value={code}
              onChangeText={handleCodeChange}
              maxLength={5}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="5-character code"
              placeholderTextColor={w(0.3)}
            />

            {codeError ? <Text style={s.error}>{codeError}</Text> : null}

            {/* Info card */}
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>Use this code on all your TVs</Text>
              <Text style={s.infoDesc}>One code activates every screen at your location</Text>
            </View>

            {codeState === 'verifying' ? (
              <View style={s.centered}>
                <ActivityIndicator size="large" color={colors.green} />
                <Text style={s.statusText}>Activating...</Text>
              </View>
            ) : codeState === 'activated' ? (
              <View style={s.centered}>
                <Text style={s.successIcon}>{'\u2713'}</Text>
                <Text style={s.successText}>You're Live!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.activateBtn, !codeReady && s.btnDisabled]}
                onPress={handleActivate}
                disabled={!codeReady}
              >
                <Text style={s.activateBtnText}>{'\uD83D\uDCFA'} ACTIVATE THIS TV</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={s.footer}>taptrivia.tv · Free for venues · Powered by Visudo Labs</Text>
      </View>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 80,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },

  // ── Columns ──────────────────────────────────────────────
  columns: {
    flex: 1,
    flexDirection: 'row',
  },
  left: {
    flex: 1.2,
    paddingRight: 20,
  },
  right: {
    flex: 1,
    paddingLeft: 24,
  },
  divider: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerText: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: w(0.35),
  },

  // ── Badge pills ──────────────────────────────────────────
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,212,170,0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeCenter: {
    alignSelf: 'center',
  },
  badgeReady: {
    backgroundColor: 'rgba(0,212,170,0.25)',
  },
  badgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 16,
    color: colors.green,
    letterSpacing: 1,
  },

  // ── Typography ───────────────────────────────────────────
  heading: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 48,
    color: '#ffffff',
    marginBottom: 12,
  },
  desc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 22,
    color: w(0.55),
    marginBottom: 32,
    lineHeight: 30,
  },

  // ── Inputs ──────────────────────────────────────────────
  input: {
    fontFamily: fonts.outfit.medium,
    fontSize: 24,
    color: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 18,
  },
  promoCard: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginBottom: 22,
  },
  promoTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    color: colors.green,
    marginBottom: 4,
  },
  promoDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.5),
    lineHeight: 24,
  },
  features: {
    marginBottom: 24,
  },
  featureText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.55),
    marginBottom: 12,
    lineHeight: 26,
  },
  registerBtn: {
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 14,
  },
  registerBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    color: '#1a0a2e',
    letterSpacing: 1,
  },
  hint: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.3),
    textAlign: 'center',
  },

  // ── Right: code input ─────────────────────────────────────
  codeInput: {
    fontFamily: fonts.outfit.bold,
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 6,
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  codeInputError: {
    borderColor: colors.red,
  },
  infoCard: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  infoTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 22,
    color: '#ffffff',
    marginBottom: 4,
  },
  infoDesc: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.45),
  },
  activateBtn: {
    backgroundColor: colors.green,
    borderRadius: 8,
    paddingVertical: 22,
    alignItems: 'center',
  },
  activateBtnText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 1,
  },
  btnDisabled: {
    opacity: 0.35,
  },

  // ── Shared states ────────────────────────────────────────
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  statusText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 20,
    color: w(0.6),
    marginTop: 16,
  },
  successIcon: {
    fontSize: 56,
    color: colors.green,
    marginBottom: 12,
  },
  successText: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 36,
    color: colors.green,
    marginBottom: 8,
  },
  registeredCode: {
    fontFamily: fonts.dmMono.medium,
    fontSize: 48,
    color: colors.gold,
    letterSpacing: 8,
    marginBottom: 12,
  },
  hintText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.5),
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.outfit.medium,
    fontSize: 18,
    color: colors.red,
    textAlign: 'center',
    marginVertical: 8,
  },
  footer: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: w(0.25),
    textAlign: 'center',
    marginTop: 8,
  },
});
