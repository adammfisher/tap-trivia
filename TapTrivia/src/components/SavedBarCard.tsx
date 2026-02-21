import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';
import type { SavedBar } from '../types/game';

interface SavedBarCardProps {
  bar: SavedBar;
  onPress: () => void;
}

export function SavedBarCard({ bar, onPress }: SavedBarCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.icon}>
        <Text style={styles.iconText}>{bar.type === 'group' ? '\u{1F465}' : '\u{1F37A}'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{bar.name}</Text>
        <Text style={styles.lastPlayed}>{bar.lastPlayed}</Text>
      </View>
      <Text style={styles.code}>{bar.code}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: w(0.06),
    borderWidth: 1,
    borderColor: w(0.06),
    borderRadius: 14,
  },
  pressed: {
    transform: [{ translateY: -2 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(102,126,234,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  lastPlayed: {
    fontFamily: fonts.outfit.regular,
    fontSize: 11,
    color: w(0.35),
    marginTop: 1,
  },
  code: {
    fontFamily: fonts.dmMono.medium,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1,
  },
});
