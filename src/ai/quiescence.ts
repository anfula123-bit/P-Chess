/**
 * Quiescence Search
 * Extends search at leaf nodes to avoid horizon effect on tactical positions
 */

import { GameState, Move } from '../engine/types';
import { generateLegalMoves } from '../engine/moves';
import { makeMove } from '../engine/game';
import { evaluateStatic } from './evaluate';
import { orderMoves } from './ordering';
import { isGameOver } from '../engine/rules';

const MAX_QUIESCENCE_DEPTH = 10;

/**
 * Quiescence search — only searches captures and promotions
 * to reach a "quiet" position for static evaluation
 */
export function quiescenceSearch(
  state: GameState,
  alpha: number,
  beta: number,
  depth: number = 0,
  nodesSearched: { count: number },
): number {
  nodesSearched.count++;

  // Terminal check
  if (isGameOver(state)) {
    return evaluateStatic(state);
  }

  // Stand-pat score: the static evaluation
  const standPat = evaluateStatic(state);

  // Beta cutoff: position is already too good
  if (standPat >= beta) {
    return beta;
  }

  // Update alpha if stand-pat is better
  let currentAlpha = alpha;
  if (standPat > currentAlpha) {
    currentAlpha = standPat;
  }

  // Depth limit to prevent explosion
  if (depth >= MAX_QUIESCENCE_DEPTH) {
    return standPat;
  }

  // Delta pruning: if even capturing the best possible piece can't raise alpha, skip
  const DELTA = 1000; // Queen value approximately
  if (standPat + DELTA < currentAlpha) {
    return currentAlpha;
  }

  // Generate only captures and promotions
  const allMoves = generateLegalMoves(state);
  const tacticalMoves = allMoves.filter(
    move => move.captured || move.promotion
  );

  if (tacticalMoves.length === 0) {
    return standPat;
  }

  // Order captures for better pruning
  const orderedMoves = orderMoves(tacticalMoves, 0);

  for (const move of orderedMoves) {
    const newState = makeMove(state, move);
    const score = -quiescenceSearch(
      newState, -beta, -currentAlpha, depth + 1, nodesSearched
    );

    if (score >= beta) {
      return beta; // Beta cutoff
    }

    if (score > currentAlpha) {
      currentAlpha = score;
    }
  }

  return currentAlpha;
}
