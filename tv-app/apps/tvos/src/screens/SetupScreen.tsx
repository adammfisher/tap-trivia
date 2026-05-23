import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { GradientBackground } from '../components/GradientBackground';
import { Logo } from '../components/Logo';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

type Screen = 'choose' | 'code' | 'register';

// ─────────────────────────────────────────────────────────────────────────────
// Choose screen — two rich cards, NO TextInputs, clean focus
// ─────────────────────────────────────────────────────────────────────────────
function ChooseScreen({ onCode, onRegister }: { onCode: () => void; onRegister: () => void }) {
  const [focused, setFocused] = useState<'code' | 'register' | null>(null);

  return (
    <View style={s.root}>
      <Logo size="lg" />
      <Text style={s.screenTitle}>TapTrivia for Venues</Text>
      <Text style={s.screenSub}>Display live trivia at your bar, restaurant, or venue.</Text>

      <View style={s.panels}>

        {/* LEFT: Register card */}
        <TouchableOpacity
          style={[s.panel, focused !== null && focused !== 'register' && s.panelDim]}
          onPress={onRegister}
          onFocus={() => setFocused('register')}
          onBlur={() => setFocused(null)}
          activeOpacity={0.9}
          hasTVPreferredFocus
        >
          <View style={[s.badge, s.badgeGold]}>
            <Text style={s.badgeText}>🖥️  NEW LOCATION</Text>
          </View>
          <Text style={s.panelTitle}>Register Your Location</Text>
          <Text style={s.panelSub}>
            Everything is free — live trivia, signage, analytics. Just enter your location name to get started.
          </Text>

          <View style={s.featureBox}>
            <Text style={s.featureTitle}>🖥️  Free Digital Signage</Text>
            <Text style={s.featureSub}>
              Add your email to get free signage, a dashboard &amp; analytics — all completely free
            </Text>
          </View>

          <Text style={s.bullet}>🏆  Free live trivia that drives traffic and keeps guests longer</Text>
          <Text style={s.bullet}>🖥️  Free digital signage to promote your specials &amp; events</Text>
          <Text style={s.bullet}>📊  Free dashboard with player metrics and engagement analytics</Text>

          <View style={[s.btn, s.btnGold, s.btnMt]}>
            <Text style={s.btnTextDark}>🖥️  REGISTER &amp; GET CODE</Text>
          </View>
          <Text style={s.inputHint}>Use your TV remote or USB keyboard to type</Text>
        </TouchableOpacity>

        {/* OR divider */}
        <View style={s.orWrap}>
          <View style={s.orCircle}>
            <Text style={s.orText}>OR</Text>
          </View>
        </View>

        {/* RIGHT: Enter code card */}
        <TouchableOpacity
          style={[s.panel, focused !== null && focused !== 'code' && s.panelDim]}
          onPress={onCode}
          onFocus={() => setFocused('code')}
          onBlur={() => setFocused(null)}
          activeOpacity={0.9}
        >
          <View style={[s.badge, s.badgeGreen]}>
            <Text style={s.badgeText}>🔑  ENTER CODE</Text>
          </View>
          <Text style={s.panelTitle}>Activate This TV</Text>
          <Text style={s.panelSub}>Enter your venue's 5-character TapTrivia code</Text>

          <View style={s.infoBox}>
            <Text style={s.infoTitle}>Use this code on all your TVs</Text>
            <Text style={s.infoSub}>One code activates every screen at your location</Text>
          </View>

          <View style={[s.btn, s.btnGreen, s.btnMt]}>
            <Text style={s.btnTextLight}>Start Display</Text>
          </View>
          <Text style={s.inputHint}>
            Don't have a code yet? Register your venue on the left — free, forever.
          </Text>
        </TouchableOpacity>

      </View>

      <Text style={s.footer}>taptrivia.tv · Free for venues · Powered by Visudo Labs</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Code entry screen — one input, one button, nothing else to fight focus
// ─────────────────────────────────────────────────────────────────────────────
function CodeScreen({ onBack, activate, initialCode }: {
  onBack: () => void;
  activate: (c: string) => Promise<void>;
  initialCode: string;
}) {
  const [code, setCode]   = useState(initialCode);
  const [busy, setBusy]   = useState(false);
  const [done, setDone]   = useState(false);
  const [error, setError] = useState('');


  async function submit() {
    if (code.length !== 5 || busy) return;
    setBusy(true); setError('');
    try   { await activate(code); setDone(true); }
    catch (e: any) { setError(e.message || 'Invalid code — please check and try again'); }
    finally { setBusy(false); }
  }

  return (
    <View style={s.root}>
      <View style={s.formHeader}>
        <Logo size="md" />
        <View style={[s.badge, s.badgeGreen, { alignSelf: 'center', marginTop: 12 }]}>
          <Text style={s.badgeText}>🔑  ENTER CODE</Text>
        </View>
        <Text style={s.formTitle}>Activate This TV</Text>
        <Text style={s.formSub}>Enter your venue's 5-character TapTrivia code</Text>
      </View>

      <View style={s.formBody}>
        <TextInput
          style={[s.codeInput, error ? s.inputErr : null]}
          value={code}
          onChangeText={v => {
            setError('');
            setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5));
          }}
          placeholder="_ _ _ _ _"
          placeholderTextColor={w(0.25)}
          maxLength={5}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          returnKeyType="done"
          onSubmitEditing={submit}
          hasTVPreferredFocus
        />

        {error ? <Text style={s.errText}>{error}</Text> : null}

        {done ? (
          <Text style={s.doneText}>✓  You're live!</Text>
        ) : (
          <TouchableOpacity
            style={[s.btn, s.btnGreen, (code.length < 5 || busy) && s.btnDim]}
            onPress={submit}
            disabled={code.length < 5 || busy}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTextLight}>Start Display</Text>}
          </TouchableOpacity>
        )}

        <View style={s.infoBox}>
          <Text style={s.infoTitle}>Use this code on all your TVs</Text>
          <Text style={s.infoSub}>One code activates every screen at your location</Text>
        </View>
      </View>

      <TouchableOpacity style={s.backBtn} onPress={onBack}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Register screen — name + email, nothing else to fight focus
// ─────────────────────────────────────────────────────────────────────────────
function RegisterScreen({ onBack, register, activate }: {
  onBack: () => void;
  register: (name: string, email?: string) => Promise<string>;
  activate: (c: string) => Promise<void>;
}) {
  const [locName, setLocName] = useState('');
  const [email, setEmail]     = useState('');
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [focused, setFocused] = useState<'name' | 'email' | null>(null);

  const submitBtnRef = useRef<any>(null);
  const donePressed  = useRef(false);


  async function submit() {
    if (!locName.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const barCode = await register(locName.trim(), email.trim() || undefined);
      setDone(true);
      await activate(barCode);
    } catch (e: any) {
      setError(e.message || 'Registration failed — please try again');
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      {/* Back at top — gets initial focus so keyboard doesn't auto-open */}
      <TouchableOpacity style={s.backBtn} onPress={onBack} hasTVPreferredFocus>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.registerScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.formHeader}>
          <Logo size="md" />
          <View style={[s.badge, s.badgeGold, { alignSelf: 'center', marginTop: 12 }]}>
            <Text style={s.badgeText}>🖥️  NEW LOCATION</Text>
          </View>
          <Text style={s.formTitle}>Register Your Location</Text>
          <Text style={s.formSub}>
            Everything is free — live trivia, signage, analytics &amp; dashboard included.
          </Text>
        </View>

        <View style={s.formBody}>
          {/* Venue name */}
          <Text style={s.fieldLabel}>Location Name</Text>
          <TextInput
            style={[s.input, focused === 'name' && s.inputFocused]}
            value={locName}
            onChangeText={setLocName}
            placeholder="📍  e.g. The Rusty Anchor Bar &amp; Grill"
            placeholderTextColor={w(0.35)}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onFocus={() => setFocused('name')}
            onSubmitEditing={() => { donePressed.current = true; }}
            onBlur={() => {
              setFocused(null);
              if (donePressed.current) {
                donePressed.current = false;
                setTimeout(() => {
                  submitBtnRef.current?.setNativeProps({ hasTVPreferredFocus: true });
                }, 50);
              }
            }}
          />

          {/* Email */}
          <Text style={s.fieldLabel}>Owner Email <Text style={s.fieldLabelOptional}>(optional)</Text></Text>
          <TextInput
            style={[s.input, focused === 'email' && s.inputFocused]}
            value={email}
            onChangeText={setEmail}
            placeholder="📧  your@email.com"
            placeholderTextColor={w(0.35)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            onSubmitEditing={submit}
          />

          {/* Email benefit intro */}
          <View style={s.benefitIntro}>
            <Text style={s.benefitIntroText}>
              Add your email and we'll send you a link to sign into your admin panel — where you get all of these features, completely free:
            </Text>
          </View>

          {/* Email benefit rows */}
          <View style={s.benefitRows}>
            <View style={s.benefitRow}>
              <Text style={s.benefitIcon}>🖥️</Text>
              <View style={s.benefitText}>
                <Text style={s.benefitTitle}>Free Digital Signage</Text>
                <Text style={s.benefitSub}>Promote specials &amp; events on your TV between games</Text>
              </View>
            </View>
            <View style={s.benefitRow}>
              <Text style={s.benefitIcon}>📊</Text>
              <View style={s.benefitText}>
                <Text style={s.benefitTitle}>Analytics Dashboard</Text>
                <Text style={s.benefitSub}>Player metrics, peak hours &amp; engagement data</Text>
              </View>
            </View>
            <View style={s.benefitRow}>
              <Text style={s.benefitIcon}>📋</Text>
              <View style={s.benefitText}>
                <Text style={s.benefitTitle}>Venue Management</Text>
                <Text style={s.benefitSub}>Manage everything at admin.taptrivia.tv</Text>
              </View>
            </View>
          </View>

          {error ? <Text style={s.errText}>{error}</Text> : null}

          {done ? (
            <Text style={s.doneText}>✓  Registered! Activating your display…</Text>
          ) : (
            <TouchableOpacity
              ref={submitBtnRef}
              style={[s.btn, s.btnGold, (!locName.trim() || busy) && s.btnDim]}
              onPress={submit}
              disabled={!locName.trim() || busy}
            >
              {busy
                ? <ActivityIndicator color="#1a0a2e" />
                : <Text style={s.btnTextDark}>🖥️  REGISTER &amp; GET CODE</Text>}
            </TouchableOpacity>
          )}

          <Text style={s.inputHint}>Use your TV remote or USB keyboard to type</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — routes between screens
// ─────────────────────────────────────────────────────────────────────────────
export function SetupScreen() {
  const { state, register, activate } = useTVState();
  const [screen, setScreen] = useState<Screen>('choose');
  const goChoose = () => setScreen('choose');

  return (
    <View style={{ flex: 1 }}>
      <ChooseScreen
        onCode={() => setScreen('code')}
        onRegister={() => setScreen('register')}
      />

      {/* Modal creates a real UIViewController stack entry on tvOS so
          the system Menu button dismisses it (goes back) instead of exiting */}
      <Modal
        visible={screen === 'code'}
        animationType="fade"
        onRequestClose={goChoose}
        transparent={false}
      >
        <GradientBackground style={{ flex: 1 }}>
          <CodeScreen
            onBack={goChoose}
            activate={activate}
            initialCode={state.barCode || ''}
          />
        </GradientBackground>
      </Modal>

      <Modal
        visible={screen === 'register'}
        animationType="fade"
        onRequestClose={goChoose}
        transparent={false}
      >
        <GradientBackground style={{ flex: 1 }}>
          <RegisterScreen
            onBack={goChoose}
            register={register}
            activate={activate}
          />
        </GradientBackground>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 80,
    paddingVertical: 36,
    alignItems: 'center',
  },

  // ── Screen header ─────────────────────────────────────────
  screenTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 30,
    color: '#ffffff',
    marginTop: 6,
    textAlign: 'center',
  },
  screenSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.45),
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Two-column choose layout ──────────────────────────────
  panels: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    width: '100%',
  },
  panel: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 28,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  panelDim: {
    opacity: 0.35,
  },

  // ── Badge ─────────────────────────────────────────────────
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeGold: {
    backgroundColor: 'rgba(255,210,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,0,0.35)',
  },
  badgeGreen: {
    backgroundColor: 'rgba(0,212,170,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0,212,170,0.35)',
  },
  badgeText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.8,
  },

  // ── Panel text ────────────────────────────────────────────
  panelTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 44,
    color: '#ffffff',
    marginBottom: 6,
  },
  panelSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.6),
    lineHeight: 26,
    marginBottom: 16,
  },

  // ── Mock input rows (visual only, no interactivity) ───────
  mockInputRow: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 10,
  },
  mockCodeRow: {
    marginBottom: 16,
  },
  mockInput: {
    fontFamily: fonts.outfit.medium,
    fontSize: 20,
    color: w(0.35),
  },
  mockCodeInput: {
    fontFamily: fonts.dmMono.medium,
    fontSize: 22,
    textAlign: 'center',
    letterSpacing: 4,
  },

  // ── Feature / info boxes ──────────────────────────────────
  featureBox: {
    backgroundColor: 'rgba(255,210,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,0,0.2)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  featureTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: colors.gold,
    marginBottom: 3,
  },
  featureSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: w(0.5),
    lineHeight: 21,
  },
  bullet: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.55),
    marginBottom: 4,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  infoTitle: {
    fontFamily: fonts.outfit.bold,
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 3,
  },
  infoSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: w(0.5),
  },

  // ── Buttons ───────────────────────────────────────────────
  btn: {
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  btnMt: { marginTop: 10 },
  btnGreen: { backgroundColor: colors.green },
  btnGold:  { backgroundColor: colors.gold },
  btnDim:   { opacity: 0.35 },
  btnTextLight: {
    fontFamily: fonts.outfit.bold,
    fontSize: 21,
    color: '#ffffff',
    letterSpacing: 1.2,
  },
  btnTextDark: {
    fontFamily: fonts.outfit.bold,
    fontSize: 21,
    color: '#1a0a2e',
    letterSpacing: 1.2,
  },

  // ── OR divider ────────────────────────────────────────────
  orWrap: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 200,
  },
  orCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  orText: {
    fontFamily: fonts.outfit.bold,
    fontSize: 15,
    color: w(0.4),
  },

  // ── Single-form screens ───────────────────────────────────
  formHeader: {
    alignItems: 'center',
    gap: 6,
  },
  formTitle: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 48,
    color: '#ffffff',
    marginTop: 4,
    textAlign: 'center',
  },
  formSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.5),
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: 700,
  },
  formBody: {
    width: 640,
    marginTop: 8,
  },
  registerScroll: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
    gap: 12,
  },
  fieldLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: w(0.55),
    marginBottom: 6,
    marginTop: 4,
  },
  fieldLabelOptional: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: w(0.35),
  },
  benefitIntro: {
    width: '100%',
    marginTop: 8,
    marginBottom: 2,
  },
  benefitIntroText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 18,
    color: w(0.6),
    lineHeight: 26,
  },
  benefitRows: {
    width: '100%',
    gap: 8,
    marginTop: 10,
    marginBottom: 18,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 14,
  },
  benefitIcon: {
    fontSize: 28,
    width: 38,
    textAlign: 'center',
  },
  benefitText: {
    flex: 1,
    gap: 2,
  },
  benefitTitle: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: w(0.85),
  },
  benefitSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: w(0.45),
    lineHeight: 20,
  },

  // ── Real inputs (form screens only) ───────────────────────
  input: {
    fontFamily: fonts.outfit.medium,
    fontSize: 24,
    color: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 14,
  },
  codeInput: {
    fontFamily: fonts.dmMono.medium,
    fontSize: 40,
    color: '#ffffff',
    letterSpacing: 8,
    textAlign: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 14,
  },
  inputErr: {
    borderColor: colors.red,
  },
  inputFocused: {
    borderColor: colors.gold,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 210, 0, 0.06)',
  },
  inputHint: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.3),
    textAlign: 'center',
    marginTop: 10,
  },

  // ── Status ────────────────────────────────────────────────
  errText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 18,
    color: colors.red,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  doneText: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 32,
    color: colors.green,
    textAlign: 'center',
    marginTop: 12,
  },

  // ── Back / footer ─────────────────────────────────────────
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  backText: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.35),
  },
  footer: {
    fontFamily: fonts.outfit.regular,
    fontSize: 14,
    color: w(0.2),
    marginTop: 8,
  },
});
