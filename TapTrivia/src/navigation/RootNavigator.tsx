import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GameProvider } from '../contexts/GameContext';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { JoinScreen } from '../screens/JoinScreen';
import { NicknameScreen } from '../screens/NicknameScreen';
import { LobbyScreen } from '../screens/LobbyScreen';
import { CountdownScreen } from '../screens/CountdownScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { PlayingScreen } from '../screens/PlayingScreen';
import { LockedInScreen } from '../screens/LockedInScreen';
import { CorrectScreen } from '../screens/CorrectScreen';
import { WrongScreen } from '../screens/WrongScreen';
import { BetweenScreen } from '../screens/BetweenScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TermsOfServiceScreen } from '../screens/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Join: undefined;
  Nickname: { barCode: string; barName: string };
  Lobby: { barCode: string; barName: string; playerId: string };
  Countdown: { barCode: string; playerId: string; barName: string };
  Category: { barCode: string; playerId: string; barName: string };
  Playing: { barCode: string; playerId: string; barName: string };
  LockedIn: { barCode: string; playerId: string; barName: string };
  Correct: { barCode: string; playerId: string; barName: string };
  Wrong: { barCode: string; playerId: string; barName: string };
  Between: { barCode: string; playerId: string; barName: string };
  Results: { barCode: string; playerId: string; barName: string };
  Subscription: undefined;
  Settings: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  Feedback: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const gameScreenOptions = {
  headerShown: false,
  gestureEnabled: false,
  animation: 'none' as const,
};

export function RootNavigator() {
  return (
    <GameProvider>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{ headerShown: false }}
      >
        {/* Pre-Game Screens */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Join" component={JoinScreen} />
        <Stack.Screen name="Nickname" component={NicknameScreen} />

        {/* Game Stack — no back gesture */}
        <Stack.Screen name="Lobby" component={LobbyScreen} options={gameScreenOptions} />
        <Stack.Screen name="Countdown" component={CountdownScreen} options={gameScreenOptions} />
        <Stack.Screen name="Category" component={CategoryScreen} options={gameScreenOptions} />
        <Stack.Screen name="Playing" component={PlayingScreen} options={gameScreenOptions} />
        <Stack.Screen name="LockedIn" component={LockedInScreen} options={gameScreenOptions} />
        <Stack.Screen name="Correct" component={CorrectScreen} options={gameScreenOptions} />
        <Stack.Screen name="Wrong" component={WrongScreen} options={gameScreenOptions} />
        <Stack.Screen name="Between" component={BetweenScreen} options={gameScreenOptions} />
        <Stack.Screen name="Results" component={ResultsScreen} options={gameScreenOptions} />

        {/* Modals */}
        <Stack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="TermsOfService"
          component={TermsOfServiceScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="Feedback"
          component={FeedbackScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack.Navigator>
    </GameProvider>
  );
}
