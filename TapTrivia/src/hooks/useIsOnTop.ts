import { useNavigationState } from '@react-navigation/native';

/**
 * Returns true only when this screen is the top route in the stack.
 * More reliable than useIsFocused() on Android where modals don't
 * properly unfocus the underlying screen.
 */
export function useIsOnTop(routeKey: string): boolean {
  return useNavigationState(state => state.routes[state.index].key === routeKey);
}
