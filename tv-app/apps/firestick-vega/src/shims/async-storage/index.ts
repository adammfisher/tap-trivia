/**
 * AsyncStorage shim for Vega OS (KeplerScript).
 * @react-native-async-storage/async-storage is not available.
 * Kepler's RN 0.72 still ships the deprecated AsyncStorage.
 */
// @ts-ignore — deprecated but available on Kepler RN 0.72
import { AsyncStorage } from 'react-native';
export default AsyncStorage;
