import { View, Text, StyleSheet } from 'react-native';
import { w } from '../theme/colors';
import { fonts } from '../theme/typography';

interface StatBoxProps {
  value: string | number;
  label: string;
  color: string;
}

export function StatBox({ value, label, color }: StatBoxProps) {
  return (
    <View style={styles.box}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: w(0.06),
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  value: {
    fontFamily: fonts.fredoka.bold,
    fontSize: 18,
  },
  label: {
    fontFamily: fonts.outfit.regular,
    fontSize: 10,
    color: w(0.3),
  },
});
