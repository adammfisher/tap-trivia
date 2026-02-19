import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gradients } from '../theme/colors';

interface GradientBackgroundProps {
  children: React.ReactNode;
}

export function GradientBackground({ children }: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={[...gradients.main]}
      locations={[0, 0.2, 0.45, 0.7, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradient}
    >
      <Orbs />
      {children}
    </LinearGradient>
  );
}

function Orbs() {
  return (
    <View style={styles.orbContainer} pointerEvents="none">
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(102,126,234,0.12)',
    top: '-5%',
    right: '5%',
  },
  orb2: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(168,51,74,0.1)',
    bottom: '10%',
    left: '3%',
  },
});
