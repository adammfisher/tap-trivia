import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getCategoryIcon } from '../utils/format';
import { fonts } from '../theme/typography';


interface Props {
  category: string;
}

export function CategoryPill({ category }: Props) {
  const icon = getCategoryIcon(category);

  return (
    <View style={styles.pill}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.category} numberOfLines={1}>{category.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 40,
    alignSelf: 'flex-start',
    flexShrink: 1,
    gap: 12,
  },
  icon: {
    fontSize: 36,
    flexShrink: 0,
  },
  category: {
    fontFamily: fonts.outfit.semiBold,
    fontSize: 28,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
});
