import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarColors, getRankMedal } from '../utils/avatar';
import { colors, w } from '../theme/colors';
import { fonts } from '../theme/typography';

interface AvatarProps {
  name: string;
  size?: number;
  rank?: number;
  isYou?: boolean;
}

export function Avatar({ name, size = 36, rank, isYou }: AvatarProps) {
  const { start, end } = getAvatarColors(name);
  const medal = rank ? getRankMedal(rank) : null;

  const borderColor = rank === 1 ? colors.gold : isYou ? colors.blue : w(0.2);
  const shadowColor =
    rank === 1 ? 'rgba(255,210,0,0.4)' : isYou ? 'rgba(102,126,234,0.3)' : 'transparent';

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          shadowColor,
          shadowOpacity: shadowColor !== 'transparent' ? 1 : 0,
          shadowRadius: shadowColor !== 'transparent' ? 7 : 0,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <LinearGradient
        colors={[start, end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { borderRadius: size / 2 },
        ]}
      >
        <Text
          style={[
            styles.letter,
            { fontSize: size * 0.4 },
          ]}
        >
          {name.charAt(0).toUpperCase()}
        </Text>
      </LinearGradient>
      {medal && (
        <Text style={[styles.medal, { fontSize: size * 0.35 }]}>{medal}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    overflow: 'visible',
    elevation: 4,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#fff',
    fontFamily: fonts.outfit.bold,
  },
  medal: {
    position: 'absolute',
    bottom: -3,
    right: -3,
  },
});
