/**
 * DISABLED R4 — Confetti creates 160 Animated.Value with useNativeDriver:true
 * (40 pieces × 4 values each). This fills KeplerScript's native animation heap
 * and causes JSReactThread 8s timeout kill when HadesGC does a full collection.
 */
import React from 'react';

export function Confetti() {
  return null;
}
