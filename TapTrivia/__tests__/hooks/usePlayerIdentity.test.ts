import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlayerIdentity } from '../../src/hooks/usePlayerIdentity';

const KEY_PREFIX = '@taptrivia:';
const NICKNAME_KEY = `${KEY_PREFIX}nickname`;
const DEVICE_ID_KEY = `${KEY_PREFIX}deviceId`;
const PLAYER_ID_KEY = `${KEY_PREFIX}playerId`;
const BAR_CODE_KEY = `${KEY_PREFIX}barCode`;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the mock storage
  const storage = (AsyncStorage as any)._mockStorage;
  Object.keys(storage).forEach((k) => delete storage[k]);
  // Re-implement the mock fns to pick up cleared storage
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(storage[key] ?? null)
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    storage[key] = value;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    delete storage[key];
    return Promise.resolve();
  });
});

describe('usePlayerIdentity — initial load with no stored data', () => {
  test('generates a new UUID-format deviceId and sets loaded=true', async () => {
    const { result } = renderHook(() => usePlayerIdentity());
    // Initially not loaded
    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.deviceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(result.current.nickname).toBeNull();
    expect(result.current.playerId).toBeNull();
    expect(result.current.barCode).toBeNull();
  });

  test('stores generated deviceId in AsyncStorage', async () => {
    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      DEVICE_ID_KEY,
      result.current.deviceId
    );
  });
});

describe('usePlayerIdentity — initial load with stored data', () => {
  test('loads all stored values from AsyncStorage', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[NICKNAME_KEY] = 'Alice';
    storage[DEVICE_ID_KEY] = 'stored-device-id';
    storage[PLAYER_ID_KEY] = 'player-123';
    storage[BAR_CODE_KEY] = 'ABC12';

    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.nickname).toBe('Alice');
    expect(result.current.deviceId).toBe('stored-device-id');
    expect(result.current.playerId).toBe('player-123');
    expect(result.current.barCode).toBe('ABC12');
  });

  test('does not regenerate deviceId if one exists', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[DEVICE_ID_KEY] = 'existing-device-id';

    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.deviceId).toBe('existing-device-id');
    // setItem should NOT be called for DEVICE_ID_KEY since it already exists
    const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    const deviceIdSetCalls = setItemCalls.filter(([k]) => k === DEVICE_ID_KEY);
    expect(deviceIdSetCalls.length).toBe(0);
  });
});

describe('usePlayerIdentity — setNickname', () => {
  test('stores nickname in AsyncStorage and updates state', async () => {
    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.setNickname('Alice');
    });

    expect(result.current.nickname).toBe('Alice');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(NICKNAME_KEY, 'Alice');
  });

  test('updates nickname from one value to another', async () => {
    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.setNickname('Bob');
    });
    expect(result.current.nickname).toBe('Bob');

    await act(async () => {
      await result.current.setNickname('Charlie');
    });
    expect(result.current.nickname).toBe('Charlie');
  });
});

describe('usePlayerIdentity — setPlayerId', () => {
  test('stores playerId in AsyncStorage and updates state', async () => {
    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.setPlayerId('player-abc');
    });

    expect(result.current.playerId).toBe('player-abc');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(PLAYER_ID_KEY, 'player-abc');
  });

  test('removes playerId from AsyncStorage when set to null', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[PLAYER_ID_KEY] = 'existing-player';

    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.setPlayerId(null);
    });

    expect(result.current.playerId).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(PLAYER_ID_KEY);
  });
});

describe('usePlayerIdentity — setBarCode', () => {
  test('stores barCode in AsyncStorage and updates state', async () => {
    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.setBarCode('XYZ99');
    });

    expect(result.current.barCode).toBe('XYZ99');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(BAR_CODE_KEY, 'XYZ99');
  });

  test('removes barCode from AsyncStorage when set to null', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[BAR_CODE_KEY] = 'OLD12';

    const { result } = renderHook(() => usePlayerIdentity());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.setBarCode(null);
    });

    expect(result.current.barCode).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(BAR_CODE_KEY);
  });
});
