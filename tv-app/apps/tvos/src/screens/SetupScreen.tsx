import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { Logo } from '../components/Logo';
import { useTVState } from '../contexts/TVStateContext';
import { fonts } from '../theme/typography';
import { colors, w } from '../theme/colors';

export function SetupScreen() {
  const { state, register, activate } = useTVState();

  // ── Code entry ────────────────────────────────────────────
  const [code, setCode] = useState(state.barCode || '');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeDone, setCodeDone] = useState(false);
  const [codeError, setCodeError] = useState('');

  // ── Registration ──────────────────────────────────────────
  const [locName, setLocName] = useState('');
  const [email, setEmail]     = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [regDone, setRegDone] = useState(false);
  const [regError, setRegError] = useState('');

  async function doActivate(c: string) {
    setCodeBusy(true);
    setCodeError('');
    try {
      await activate(c);
      setCodeDone(true);
    } catch (e: any) {
      setCodeError(e.message || 'Invalid code — check it and try again');
      setTimeout(() => setCodeError(''), 3000);
    } finally {
      setCodeBusy(false);
    }
  }

  async function doRegister() {
    if (!locName.trim()) return;
    setRegBusy(true);
    setRegError('');
    try {
      const barCode = await register(locName.trim(), email.trim() || undefined);
      setCode(barCode);
      setRegDone(true);
      await doActivate(barCode);
    } catch (e: any) {
      setRegError(e.message || 'Registration failed — please try again');
      setRegBusy(false);
    }
  }

  return (
    <View style={s.root}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <Logo size="lg" />
        <Text style={s.tagline}>Venue display · Free forever</Text>
      </View>

      {/* ── Two columns ────────────────────────────────────── */}
      <View style={s.cols}>

        {/* LEFT: Register ─────────────────────────────────── */}
        <View style={s.col}>
          <Text style={s.colLabel}>NEW VENUE</Text>
          <Text style={s.colHead}>Register for free</Text>
          <Text style={s.colSub}>Get live trivia, signage, and analytics — all free.</Text>

          <TextInput
            style={s.input}
            value={locName}
            onChangeText={setLocName}
            placeholder="Venue name"
            placeholderTextColor={w(0.35)}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />

          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Owner email  (optional)"
            placeholderTextColor={w(0.35)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />

          {regError ? <Text style={s.errText}>{regError}</Text> : null}

          {regDone ? (
            <Text style={s.doneText}>✓  Registered! Activating display…</Text>
          ) : (
            <TouchableOpacity
              style={[s.btn, s.btnGold, (!locName.trim() || regBusy) && s.btnDim]}
              onPress={doRegister}
              disabled={!locName.trim() || regBusy}
            >
              {regBusy
                ? <ActivityIndicator color="#1a0a2e" />
                : <Text style={s.btnTextDark}>Register &amp; Get Code</Text>}
            </TouchableOpacity>
          )}

          <Text style={s.footNote}>Use your remote or a USB keyboard to type</Text>
        </View>

        {/* Divider */}
        <View style={s.divider}>
          <View style={s.divLine} />
          <Text style={s.divOr}>OR</Text>
          <View style={s.divLine} />
        </View>

        {/* RIGHT: Enter code ───────────────────────────────── */}
        <View style={s.col}>
          <Text style={s.colLabel}>HAVE A CODE?</Text>
          <Text style={s.colHead}>Activate this TV</Text>
          <Text style={s.colSub}>Enter your 5-character venue code to start the display.</Text>

          <TextInput
            style={[s.input, s.codeInput, codeError ? s.inputErr : null]}
            value={code}
            onChangeText={v => {
              setCodeError('');
              setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5));
            }}
            placeholder="_ _ _ _ _"
            placeholderTextColor={w(0.25)}
            maxLength={5}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />

          {codeError ? <Text style={s.errText}>{codeError}</Text> : null}

          {codeDone ? (
            <Text style={s.doneText}>✓  You're live!</Text>
          ) : (
            <TouchableOpacity
              style={[s.btn, s.btnGreen, (code.length < 5 || codeBusy) && s.btnDim]}
              onPress={() => doActivate(code)}
              disabled={code.length < 5 || codeBusy}
            >
              {codeBusy
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTextLight}>Start Display</Text>}
            </TouchableOpacity>
          )}

          <Text style={s.footNote}>
            No code yet? Register your venue on the left.
          </Text>
        </View>
      </View>

      <Text style={s.footer}>taptrivia.tv · Powered by Visudo Labs</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 80,
    paddingVertical: 32,
  },

  // ── Header ─────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  tagline: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.4),
    marginTop: 6,
  },

  // ── Columns ────────────────────────────────────────────────
  cols: {
    flex: 1,
    flexDirection: 'row',
    gap: 0,
  },
  col: {
    flex: 1,
    paddingHorizontal: 40,
  },
  colLabel: {
    fontFamily: fonts.outfit.bold,
    fontSize: 14,
    color: colors.green,
    letterSpacing: 2,
    marginBottom: 10,
  },
  colHead: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 42,
    color: '#ffffff',
    marginBottom: 8,
  },
  colSub: {
    fontFamily: fonts.outfit.regular,
    fontSize: 20,
    color: w(0.5),
    marginBottom: 28,
    lineHeight: 28,
  },

  // ── Inputs ─────────────────────────────────────────────────
  input: {
    fontFamily: fonts.outfit.medium,
    fontSize: 24,
    color: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginBottom: 16,
  },
  codeInput: {
    fontFamily: fonts.dmMono.medium,
    fontSize: 32,
    letterSpacing: 10,
    textAlign: 'center',
  },
  inputErr: {
    borderColor: colors.red,
  },

  // ── Buttons ────────────────────────────────────────────────
  btn: {
    borderRadius: 10,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 64,
  },
  btnGreen: {
    backgroundColor: colors.green,
  },
  btnGold: {
    backgroundColor: colors.gold,
  },
  btnDim: {
    opacity: 0.35,
  },
  btnTextLight: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  btnTextDark: {
    fontFamily: fonts.outfit.bold,
    fontSize: 24,
    color: '#1a0a2e',
    letterSpacing: 0.5,
  },

  // ── Divider ────────────────────────────────────────────────
  divider: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  divLine: {
    flex: 1,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  divOr: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 16,
    color: w(0.3),
  },

  // ── Status text ────────────────────────────────────────────
  errText: {
    fontFamily: fonts.outfit.medium,
    fontSize: 18,
    color: colors.red,
    marginBottom: 8,
  },
  doneText: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 28,
    color: colors.green,
    marginTop: 8,
  },
  footNote: {
    fontFamily: fonts.outfit.regular,
    fontSize: 16,
    color: w(0.28),
    marginTop: 16,
  },
  footer: {
    fontFamily: fonts.outfit.regular,
    fontSize: 15,
    color: w(0.2),
    textAlign: 'center',
    marginTop: 8,
  },
});
