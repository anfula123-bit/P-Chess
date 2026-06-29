import { createInitialGameState, boardToFEN } from '../engine/board';
import { generateLegalMoves } from '../engine/moves';
import { makeMove } from '../engine/game';
import { isGameOver } from '../engine/rules';

describe('Chess Engine Stress & Integration Test', () => {
  test('Simulate 50 random games to completion without throwing errors', () => {
    const gameCount = 50;
    let completedGames = 0;
    let totalMovesPlayed = 0;

    for (let i = 0; i < gameCount; i++) {
      let state = createInitialGameState();
      let moveCount = 0;

      while (!isGameOver(state) && moveCount < 300) { // Limit moves to prevent infinite games in random play
        const legalMoves = generateLegalMoves(state);
        if (legalMoves.length === 0) break;

        // Pick a random move
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        
        // Execute the move
        state = makeMove(state, randomMove);
        moveCount++;
        totalMovesPlayed++;
      }

      completedGames++;
    }

    expect(completedGames).toBe(gameCount);
    // Ensure we actually played some moves
    expect(totalMovesPlayed).toBeGreaterThan(100);
    console.log(`Successfully simulated ${completedGames} games with a total of ${totalMovesPlayed} moves.`);
  });
});
