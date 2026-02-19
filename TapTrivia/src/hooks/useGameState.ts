/**
 * useGameState — thin wrapper around GameContext for backward compatibility.
 * All screens call this hook; it delegates to the shared GameContext.
 */
import { useGame } from '../contexts/GameContext';

interface UseGameStateOptions {
  barCode: string;
  playerId: string;
  barName: string;
}

export function useGameState(_opts: UseGameStateOptions) {
  const { gameState, doSubmitAnswer } = useGame();
  return {
    gameState,
    submitAnswer: doSubmitAnswer,
  };
}
