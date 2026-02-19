import { View, Text, StyleSheet } from 'react-native';
import { colors, w } from '../theme/colors';
import { getDifficultyLabel } from '../utils/avatar';
import { fonts } from '../theme/typography';

interface DifficultyDotsProps {
  difficulty: 1 | 2 | 3;
}

export function DifficultyDots({ difficulty }: DifficultyDotsProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3].map((d) => (
        <View
          key={d}
          style={[
            styles.dot,
            d <= difficulty ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      ))}
      <Text style={styles.label}>{getDifficultyLabel(difficulty)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotFilled: {
    backgroundColor: colors.green,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  dotEmpty: {
    backgroundColor: w(0.1),
  },
  label: {
    fontSize: 12,
    color: w(0.4),
    fontFamily: fonts.outfit.medium,
    marginLeft: 6,
  },
});
