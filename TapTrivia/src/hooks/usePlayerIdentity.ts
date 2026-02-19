import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@taptrivia:';
const NICKNAME_KEY = `${KEY_PREFIX}nickname`;
const DEVICE_ID_KEY = `${KEY_PREFIX}deviceId`;
const PLAYER_ID_KEY = `${KEY_PREFIX}playerId`;
const BAR_CODE_KEY = `${KEY_PREFIX}barCode`;

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function usePlayerIdentity() {
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [playerId, setPlayerIdState] = useState<string | null>(null);
  const [barCode, setBarCodeState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedNickname, storedDeviceId, storedPlayerId, storedBarCode] = await Promise.all([
        AsyncStorage.getItem(NICKNAME_KEY),
        AsyncStorage.getItem(DEVICE_ID_KEY),
        AsyncStorage.getItem(PLAYER_ID_KEY),
        AsyncStorage.getItem(BAR_CODE_KEY),
      ]);

      let id = storedDeviceId;
      if (!id) {
        id = generateUUID();
        await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      }

      setNicknameState(storedNickname);
      setDeviceId(id);
      setPlayerIdState(storedPlayerId);
      setBarCodeState(storedBarCode);
      setLoaded(true);
    })();
  }, []);

  const setNickname = useCallback(async (name: string) => {
    await AsyncStorage.setItem(NICKNAME_KEY, name);
    setNicknameState(name);
  }, []);

  const setPlayerId = useCallback(async (id: string | null) => {
    if (id) {
      await AsyncStorage.setItem(PLAYER_ID_KEY, id);
    } else {
      await AsyncStorage.removeItem(PLAYER_ID_KEY);
    }
    setPlayerIdState(id);
  }, []);

  const setBarCode = useCallback(async (code: string | null) => {
    if (code) {
      await AsyncStorage.setItem(BAR_CODE_KEY, code);
    } else {
      await AsyncStorage.removeItem(BAR_CODE_KEY);
    }
    setBarCodeState(code);
  }, []);

  return {
    nickname,
    deviceId,
    playerId,
    barCode,
    loaded,
    setNickname,
    setPlayerId,
    setBarCode,
  };
}
