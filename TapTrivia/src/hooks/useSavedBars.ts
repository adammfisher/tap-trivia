import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedBar } from '../types/game';

const SAVED_BARS_KEY = '@taptrivia:savedBars';

export function useSavedBars() {
  const [bars, setBars] = useState<SavedBar[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(SAVED_BARS_KEY);
      if (stored) {
        setBars(JSON.parse(stored));
      }
      setLoaded(true);
    })();
  }, []);

  const saveBar = useCallback(async (code: string, name: string) => {
    setBars((prev) => {
      const filtered = prev.filter((b) => b.code !== code);
      const updated = [
        { code, name, lastPlayed: 'Just now' },
        ...filtered,
      ];
      AsyncStorage.setItem(SAVED_BARS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeBar = useCallback(async (code: string) => {
    setBars((prev) => {
      const updated = prev.filter((b) => b.code !== code);
      AsyncStorage.setItem(SAVED_BARS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { bars, loaded, saveBar, removeBar };
}
