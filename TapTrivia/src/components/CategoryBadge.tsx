import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { w } from '../theme/colors';
import { fonts } from '../theme/typography';

interface CategoryBadgeProps {
  emoji: string;
  category: string;
}

export const CategoryBadge = memo(function CategoryBadge({ emoji: _emoji, category }: CategoryBadgeProps) {
  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{category.toUpperCase()}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: w(0.08),
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    maxWidth: '75%',
    alignSelf: 'center',
  },
  label: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 10,
    color: w(0.7),
    letterSpacing: 0.5,
    lineHeight: 14,
    textAlign: 'center',
  },
});
