import {NativeModules} from 'react-native';

interface SilentAudioPlayerInterface {
  startSilentAudio(): void;
  stopSilentAudio(): void;
}

const {SilentAudioPlayer} = NativeModules;

export default SilentAudioPlayer as SilentAudioPlayerInterface;
