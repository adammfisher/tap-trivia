import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { w } from '../theme/colors';
import { fonts } from '../theme/typography';

interface CategoryBadgeProps {
  emoji: string;
  category: string;
}

export const CategoryBadge = memo(function CategoryBadge({ emoji, category }: CategoryBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label}>{category.toUpperCase()}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: w(0.08),
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  emoji: {
    fontSize: 13,
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 11,
    color: w(0.7),
    letterSpacing: 0.5,
  },
});
