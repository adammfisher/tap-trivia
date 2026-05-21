import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TVFocusGuideView,
} from 'react-native';

import { Logo } from '../components/Logo';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

type RegState = 'form' | 'sending' | 'sent';
type CodeState = 'input' | 'verifying' | 'activated' | 'error';
type EditField = 'name' | 'email' | 'code' | null;

export function SetupScreen() {
  const { state, register, activate } = useTVState();

  // Register panel state
  const [regState, setRegState] = useState<RegState>('form');
  const [locName, setLocName] = useState('');
  const [email, setEmail] = useState('');
  const [regError, setRegError] = useState('');
  const [registeredCode, setRegisteredCode] = useState('');

  // Activate panel state
  const [codeState, setCodeState] = useState<CodeState>('input');
  const [code, setCode] = useState(state.barCode || '');
  const [codeError, setCodeError] = useState('');

  // Text entry: one hidden TextInput serves all fields. No inline inputs on the main
  // screen so tvOS focus engine never auto-advances between fields.
  const [editingField, setEditingField] = useState<EditField>(null);
  const [editingValue, setEditingValue] = useState('');

  // Callback ref so TVFocusGuideView gets the node after first render
  const [codeRowNode, setCodeRowNode] = useState<any>(null);

  const openEdit = useCallback((field: EditField, currentValue: string) => {
    setEditingField(field);
    setEditingValue(currentValue);
  }, []);

  const confirmEdit = useCallback(() => {
    if (editingField === 'name') {
      setLocName(editingValue.trim());
    } else if (editingField === 'email') {
      setEmail(editingValue.trim());
    } else if (editingField === 'code') {
      const cleaned = editingValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
      console.log('[CodeInput] confirmed:', cleaned);
      setCode(cleaned);
      setCodeError('');
      setCodeState('input');
    }
    setEditingField(null);
  }, [editingField, editingValue]);

  // ─── Register ───────────────────────────────────────────────────────

  const handleRegister = useCallback(async () => {
    if (!locName.trim()) return;
    setRegState('sending');
    setRegError('');
    try {
      const barCode = await register(locName.trim(), email.trim() || undefined);
      setRegisteredCode(barCode);
      setCode(barCode);
      setRegState('sent');
      setCodeState('verifying');
      setCodeError('');
      try {
        await activate(barCode);
        setCodeState('activated');
      } catch (err: any) {
        setCodeError(err.message || 'Activation failed');
        setCodeState('error');
        setTimeout(() => setCodeState('input'), 2000);
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
      setRegState('form');
    }
  }, [locName, email, register, activate]);

  // ─── Activate ───────────────────────────────────────────────────────

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

  const editKeyboardType = editingField === 'email' ? 'email-address' as const : 'default' as const;
  const editAutoCapitalize = editingField === 'code' ? 'characters' as const
    : editingField === 'email' ? 'none' as const
    : 'words' as const;

  return (
    <>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Logo size="lg" />
        </View>

        {/* Two-column layout */}
        <View style={s.columns}>

          {/* ── LEFT: Register ─────────────────────────────── */}
          <View style={s.left}>
            <View style={s.badge}>
              <Text style={s.badgeText}>{'📺'} NEW LOCATION</Text>
            </View>

            <Text style={s.heading}>Register Your Location</Text>
            <Text style={s.desc}>
              Everything is free — live trivia, signage, analytics. Just enter your location name to get started.
            </Text>

            {regState === 'form' && (
              <>
                {/* Location name — focusable row, opens overlay on select */}
                <TouchableOpacity
                  style={s.fieldRow}
                  onPress={() => openEdit('name', locName)}
                >
                  <Text style={locName ? s.fieldValue : s.fieldPlaceholder}>
                    {locName || "📍  Your location's name"}
                  </Text>
                </TouchableOpacity>

                {/* Email — focusable row, opens overlay on select */}
                <TouchableOpacity
                  style={s.fieldRow}
                  onPress={() => openEdit('email', email)}
                >
                  <Text style={email ? s.fieldValue : s.fieldPlaceholder}>
                    {email || "✉️  Owner email (optional)"}
                  </Text>
                </TouchableOpacity>

                <View style={s.promoCard}>
                  <Text style={s.promoTitle}>{'📺'} Free Digital Signage</Text>
                  <Text style={s.promoDesc}>
                    Add your email to get free signage, a dashboard & analytics — all completely free
                  </Text>
                </View>

                <View style={s.features}>
                  <Text style={s.featureText}>{'🍹'} Free live trivia that drives traffic and keeps guests longer</Text>
                  <Text style={s.featureText}>{'📺'} Free digital signage to promote your specials & events</Text>
                  <Text style={s.featureText}>{'📊'} Free dashboard with player metrics and engagement analytics</Text>
                </View>

                {regError ? <Text style={s.error}>{regError}</Text> : null}

                <TouchableOpacity
                  style={[s.registerBtn, !locName.trim() && s.btnDisabled]}
                  onPress={handleRegister}
                  disabled={!locName.trim()}
                >
                  <Text style={s.registerBtnText}>{'📋'} REGISTER & GET CODE</Text>
                </TouchableOpacity>

                <Text style={s.hint}>Navigate with your remote · Select a field to type</Text>
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
                <Text style={s.successIcon}>{'✓'}</Text>
                <Text style={s.successText}>Registered!</Text>
                <Text style={s.registeredCode}>{registeredCode}</Text>
                <Text style={s.hintText}>Activating your display...</Text>
              </View>
            )}
          </View>

          {/* ── Divider ───────────────────────────────────── */}
          <View style={s.divider}>
            <View style={s.dividerCircle}>
              <Text style={s.dividerText}>OR</Text>
            </View>
          </View>

          {/* ── RIGHT: Activate — TVFocusGuideView directs any swipe into this
               column straight to the code row ────────────────────────── */}
          <TVFocusGuideView style={s.right} destinations={codeRowNode ? [codeRowNode] : []}>
            <View style={[s.badge, s.badgeCenter, codeReady && s.badgeReady]}>
              <Text style={s.badgeText}>
                {codeReady ? '✓ CODE READY' : '🔑 ENTER CODE'}
              </Text>
            </View>

            <Text style={s.heading}>TapTrivia for Venues</Text>
            <Text style={s.desc}>
              Display live trivia at your bar, restaurant, or venue.
            </Text>

            <Text style={s.inputLabel}>Enter your venue's 5-character TapTrivia code</Text>

            {/* Code field — focus guide destinations point here */}
            <TouchableOpacity
              ref={setCodeRowNode}
              style={[s.codeRow, codeState === 'error' && s.codeRowError]}
              onPress={() => openEdit('code', code)}
            >
              <Text style={code ? s.codeValue : s.codePlaceholder}>
                {code || '_ _ _ _ _'}
              </Text>
            </TouchableOpacity>

            <Text style={s.inputHelper}>
              No code yet? Enter your location name and email on the left to get one.
            </Text>

            {codeError ? <Text style={s.error}>{codeError}</Text> : null}

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
                <Text style={s.successIcon}>{'✓'}</Text>
                <Text style={s.successText}>You're Live!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.activateBtn, !codeReady && s.btnDisabled]}
                onPress={handleActivate}
                disabled={!codeReady}
              >
                <Text style={s.activateBtnText}>Start Display</Text>
              </TouchableOpacity>
            )}
          </TVFocusGuideView>
        </View>

        <Text style={s.footer}>taptrivia.tv · Free for venues · Powered by Visudo Labs</Text>
      </View>

      {/* Hidden input — triggers the Apple TV system keyboard with no app UI.
          1×1 invisible; autoFocus opens the keyboard on mount.
          Done fires onSubmitEditing → saves value → unmounts. */}
      {editingField !== null && (
        <TextInput
          style={s.hiddenInput}
          autoFocus
          value={editingValue}
          onChangeText={(val) => {
            if (editingField === 'code') {
              setEditingValue(val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5));
            } else {
              setEditingValue(val);
            }
          }}
          onSubmitEditing={confirmEdit}
          returnKeyType="done"
          autoCapitalize={editAutoCapitalize}
          autoCorrect={false}
          keyboardType={editKeyboardType}
          maxLength={editingField === 'code' ? 5 : undefined}
        />
      )}
    </>
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

  // ── Left panel field rows (no inline TextInputs) ──────────
  fieldRow: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 18,
  },
  fieldValue: {
    fontFamily: fonts.outfit.medium,
    fontSize: 24,
    color: '#ffffff',
  },
  fieldPlaceholder: {
    fontFamily: fonts.outfit.medium,
    fontSize: 24,
    color: w(0.35),
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

  // ── Right panel code row ──────────────────────────────────
  inputLabel: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 18,
    color: w(0.65),
    marginBottom: 10,
  },
  codeRow: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  codeRowError: {
    borderColor: colors.red,
  },
  codeValue: {
    fontFamily: fonts.outfit.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 6,
    textAlign: 'center',
  },
  codePlaceholder: {
    fontFamily: fonts.outfit.bold,
    fontSize: 28,
    color: w(0.25),
    letterSpacing: 6,
    textAlign: 'center',
  },
  inputHelper: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.4),
    marginBottom: 16,
    lineHeight: 22,
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

  // Hidden input — 1×1 invisible, triggers Apple TV system keyboard via autoFocus
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
