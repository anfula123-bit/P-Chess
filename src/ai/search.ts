/**
 * AI Search Engine
 * Minimax with Alpha-Beta Pruning, Iterative Deepening,
 * Transposition Table, Move Ordering, Quiescence Search
 */

import {
  GameState, Move, TTFlag, AIConfig, AIDifficulty,
} from '../engine/types';
import { generateLegalMoves } from '../engine/moves';
import { makeMove } from '../engine/game';
import { isGameOver } from '../engine/rules';
import { evaluate } from './evaluate';
import { quiescenceSearch } from './quiescence';
import { TranspositionTable } from './transposition';
import {
  orderMoves, addKillerMove, addHistoryBonus,
  clearKillerMoves, clearHistory,
} from './ordering';

// ============================================================
// Constants
// ============================================================

const INFINITY = 999999;
const CHECKMATE_SCORE = 100000;

// ============================================================
// Search State
// ============================================================

interface SearchResult {
  bestMove: Move | null;
  score: number;
  depth: number;
  nodes: number;
  time: number;
  pv: Move[];
}

let searchAborted = false;
let nodesSearched = { count: 0 };
let searchStartTime = 0;
let maxSearchTime = 0;

// Global transposition table (persists across searches)
const tt = new TranspositionTable();

// ============================================================
// Alpha-Beta Search
// ============================================================

function alphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  config: AIConfig,
  pv: Move[],
): number {
  // Check time limit
  if (Date.now() - searchStartTime > maxSearchTime) {
    searchAborted = true;
    return 0;
  }

  nodesSearched.count++;

  // Terminal node
  if (isGameOver(state)) {
    return evaluate(state);
  }

  // Leaf node — use quiescence search or static eval
  if (depth <= 0) {
    if (config.useQuiescence) {
      return quiescenceSearch(state, alpha, beta, 0, nodesSearched);
    }
    return evaluate(state);
  }

  // Transposition table probe
  let ttBestMove: Move | undefined;
  if (config.useTranspositionTable) {
    const ttEntry = tt.probe(state.zobristHash);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === TTFlag.Exact) {
        // For PV nodes, we still want to use TT move for ordering
        if (ttEntry.bestMove) {
          pv.length = 0;
          pv.push(ttEntry.bestMove);
        }
        return ttEntry.score;
      }
      if (ttEntry.flag === TTFlag.LowerBound) {
        alpha = Math.max(alpha, ttEntry.score);
      }
      if (ttEntry.flag === TTFlag.UpperBound) {
        beta = Math.min(beta, ttEntry.score);
      }
      if (alpha >= beta) {
        return ttEntry.score;
      }
    }
    if (ttEntry?.bestMove) {
      ttBestMove = ttEntry.bestMove;
    }
  }

  // Generate legal moves
  const legalMoves = generateLegalMoves(state);

  if (legalMoves.length === 0) {
    return evaluate(state);
  }

  // Order moves
  const orderedMoves = orderMoves(legalMoves, ply, ttBestMove);

  let bestScore = -INFINITY;
  let bestMove: Move | null = null;
  let flag: TTFlag = TTFlag.UpperBound; // Assume fail-low
  const childPV: Move[] = [];

  for (const move of orderedMoves) {
    if (searchAborted) return 0;

    childPV.length = 0;
    const newState = makeMove(state, move);
    const score = -alphaBeta(
      newState, depth - 1, -beta, -alpha, ply + 1, config, childPV
    );

    if (searchAborted) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;

      if (score > alpha) {
        alpha = score;
        flag = TTFlag.Exact;

        // Update PV
        pv.length = 0;
        pv.push(move, ...childPV);

        if (score >= beta) {
          flag = TTFlag.LowerBound;

          // Update killer moves and history
          if (!move.captured) {
            addKillerMove(move, ply);
            addHistoryBonus(move, depth);
          }

          break; // Beta cutoff
        }
      }
    }
  }

  // Store in transposition table
  if (config.useTranspositionTable && bestMove && !searchAborted) {
    tt.store(state.zobristHash, depth, bestScore, flag, bestMove);
  }

  return bestScore;
}

// ============================================================
// Iterative Deepening
// ============================================================

function iterativeDeepening(state: GameState, config: AIConfig): SearchResult {
  searchAborted = false;
  nodesSearched = { count: 0 };
  searchStartTime = Date.now();
  maxSearchTime = config.timeLimit;

  clearKillerMoves();
  clearHistory();
  tt.newSearch();

  let bestResult: SearchResult = {
    bestMove: null,
    score: 0,
    depth: 0,
    nodes: 0,
    time: 0,
    pv: [],
  };

  const maxDepth = config.maxDepth;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (searchAborted) break;

    const pv: Move[] = [];
    const score = alphaBeta(state, depth, -INFINITY, INFINITY, 0, config, pv);

    if (searchAborted && depth > 1) {
      // Use result from previous completed depth
      break;
    }

    const time = Date.now() - searchStartTime;

    bestResult = {
      bestMove: pv[0] || bestResult.bestMove,
      score,
      depth,
      nodes: nodesSearched.count,
      time,
      pv: [...pv],
    };

    // If we found a checkmate, no need to search deeper
    if (Math.abs(score) >= CHECKMATE_SCORE - 100) {
      break;
    }

    // Check time for next iteration
    if (time > maxSearchTime * 0.6) {
      break; // Not enough time for next depth
    }
  }

  return bestResult;
}

// ============================================================
// Public API
// ============================================================

/**
 * Find the best move for the current position
 */
export function findBestMove(state: GameState, config: AIConfig): SearchResult {
  const legalMoves = generateLegalMoves(state);

  // Only one legal move — return immediately
  if (legalMoves.length === 1) {
    return {
      bestMove: legalMoves[0],
      score: 0,
      depth: 0,
      nodes: 1,
      time: 0,
      pv: [legalMoves[0]],
    };
  }

  if (legalMoves.length === 0) {
    return {
      bestMove: null,
      score: evaluate(state),
      depth: 0,
      nodes: 1,
      time: 0,
      pv: [],
    };
  }

  if (config.useIterativeDeepening) {
    return iterativeDeepening(state, config);
  }

  // Simple fixed-depth search
  const pv: Move[] = [];
  nodesSearched = { count: 0 };
  searchStartTime = Date.now();
  maxSearchTime = config.timeLimit;
  searchAborted = false;

  clearKillerMoves();
  clearHistory();
  tt.newSearch();

  const score = alphaBeta(state, config.maxDepth, -INFINITY, INFINITY, 0, config, pv);

  return {
    bestMove: pv[0] || null,
    score,
    depth: config.maxDepth,
    nodes: nodesSearched.count,
    time: Date.now() - searchStartTime,
    pv,
  };
}

/**
 * Stop the current search
 */
export function stopSearch(): void {
  searchAborted = true;
}

/**
 * Clear transposition table
 */
export function clearTT(): void {
  tt.clear();
}
