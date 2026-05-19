import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSavedBars } from '../../src/hooks/useSavedBars';

const SAVED_BARS_KEY = '@taptrivia:savedBars';

beforeEach(() => {
  jest.clearAllMocks();
  const storage = (AsyncStorage as any)._mockStorage;
  Object.keys(storage).forEach((k) => delete storage[k]);
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

describe('useSavedBars — initial load with no stored bars', () => {
  test('starts with empty bars array and loaded=true', async () => {
    const { result } = renderHook(() => useSavedBars());
    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.bars).toEqual([]);
  });
});

describe('useSavedBars — initial load with stored bars', () => {
  test('loads and parses JSON from AsyncStorage', async () => {
    const storedBars = [
      { code: 'ABC12', name: 'The Local', lastPlayed: '2 days ago', type: 'bar' },
      { code: 'DEF34', name: 'Sports Bar', lastPlayed: '1 week ago', type: 'bar' },
    ];
    const storage = (AsyncStorage as any)._mockStorage;
    storage[SAVED_BARS_KEY] = JSON.stringify(storedBars);

    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.bars).toEqual(storedBars);
  });
});

describe('useSavedBars — saveBar', () => {
  test('adds a new bar to the front of the list with lastPlayed="Just now"', async () => {
    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.saveBar('ABC12', 'The Local', 'bar');
    });

    expect(result.current.bars).toHaveLength(1);
    expect(result.current.bars[0].code).toBe('ABC12');
    expect(result.current.bars[0].name).toBe('The Local');
    expect(result.current.bars[0].lastPlayed).toBe('Just now');
    expect(result.current.bars[0].type).toBe('bar');
  });

  test('new bar appears at front when others already exist', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[SAVED_BARS_KEY] = JSON.stringify([
      { code: 'OLD12', name: 'Old Bar', lastPlayed: '3 days ago' },
    ]);

    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.saveBar('NEW34', 'New Bar', 'bar');
    });

    expect(result.current.bars[0].code).toBe('NEW34');
    expect(result.current.bars[1].code).toBe('OLD12');
  });

  test('deduplicates: removes old entry and adds to front', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[SAVED_BARS_KEY] = JSON.stringify([
      { code: 'ABC12', name: 'The Local', lastPlayed: '3 days ago' },
      { code: 'DEF34', name: 'Other Bar', lastPlayed: '1 day ago' },
    ]);

    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.saveBar('ABC12', 'The Local', 'bar');
    });

    expect(result.current.bars).toHaveLength(2);
    expect(result.current.bars[0].code).toBe('ABC12');
    expect(result.current.bars[0].lastPlayed).toBe('Just now');
    expect(result.current.bars[1].code).toBe('DEF34');
  });

  test('persists to AsyncStorage when bar is saved', async () => {
    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.saveBar('ABC12', 'The Local', 'bar');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SAVED_BARS_KEY,
      expect.stringContaining('ABC12')
    );
  });
});

describe('useSavedBars — removeBar', () => {
  test('removes a bar from the list', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[SAVED_BARS_KEY] = JSON.stringify([
      { code: 'ABC12', name: 'The Local', lastPlayed: 'Just now' },
      { code: 'DEF34', name: 'Sports Bar', lastPlayed: '2 days ago' },
    ]);

    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.removeBar('ABC12');
    });

    expect(result.current.bars).toHaveLength(1);
    expect(result.current.bars[0].code).toBe('DEF34');
  });

  test('updates AsyncStorage when bar is removed', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[SAVED_BARS_KEY] = JSON.stringify([
      { code: 'ABC12', name: 'The Local', lastPlayed: 'Just now' },
    ]);

    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    jest.clearAllMocks();
    await act(async () => {
      await result.current.removeBar('ABC12');
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      SAVED_BARS_KEY,
      expect.not.stringContaining('ABC12')
    );
  });

  test('removing a non-existent code leaves list unchanged', async () => {
    const storage = (AsyncStorage as any)._mockStorage;
    storage[SAVED_BARS_KEY] = JSON.stringify([
      { code: 'ABC12', name: 'The Local', lastPlayed: 'Just now' },
    ]);

    const { result } = renderHook(() => useSavedBars());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.removeBar('XXXXX');
    });

    expect(result.current.bars).toHaveLength(1);
  });
});
