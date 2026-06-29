/**
 * Move Ordering
 * Orders moves for better alpha-beta pruning
 */

import { Move, MoveType, PieceType } from '../engine/types';
import { PIECE_VALUES } from '../engine/pieces';

// ============================================================
// MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
// ============================================================

const PIECE_ORDER: Record<PieceType, number> = {
  [PieceType.King]: 6,
  [PieceType.Queen]: 5,
  [PieceType.Rook]: 4,
  [PieceType.Bishop]: 3,
  [PieceType.Knight]: 2,
  [PieceType.Pawn]: 1,
};

function mvvLvaScore(move: Move): number {
  if (!move.captured) return 0;
  // Victim value - attacker value (higher = better capture)
  return PIECE_VALUES[move.captured.type] * 10 - PIECE_VALUES[move.piece.type];
}

// ============================================================
// Killer Moves (quiet moves that caused beta cutoffs)
// ============================================================

const MAX_PLY = 64;
const killerMoves: (Move | null)[][] = Array.from({ length: MAX_PLY }, () => [null, null]);

export function addKillerMove(move: Move, ply: number): void {
  if (ply >= MAX_PLY) return;
  if (move.captured) return; // Only quiet moves

  // Don't add duplicate
  if (killerMoves[ply][0] && movesEqual(killerMoves[ply][0]!, move)) return;

  killerMoves[ply][1] = killerMoves[ply][0];
  killerMoves[ply][0] = move;
}

function isKillerMove(move: Move, ply: number): boolean {
  if (ply >= MAX_PLY) return false;
  return (
    (killerMoves[ply][0] !== null && movesEqual(killerMoves[ply][0]!, move)) ||
    (killerMoves[ply][1] !== null && movesEqual(killerMoves[ply][1]!, move))
  );
}

export function clearKillerMoves(): void {
  for (let i = 0; i < MAX_PLY; i++) {
    killerMoves[i][0] = null;
    killerMoves[i][1] = null;
  }
}

// ============================================================
// History Heuristic
// ============================================================

const historyTable: number[][][][] = createHistoryTable();

function createHistoryTable(): number[][][][] {
  // [color: 0/1][fromSquare: 64][toSquare: 64]
  return Array.from({ length: 2 }, () =>
    Array.from({ length: 64 }, () =>
      Array.from({ length: 64 }, () => [0])
    )
  );
}

export function addHistoryBonus(move: Move, depth: number): void {
  if (move.captured) return; // Only quiet moves
  const colorIndex = move.piece.color === 'w' ? 0 : 1;
  const fromIndex = move.from.rank * 8 + move.from.file;
  const toIndex = move.to.rank * 8 + move.to.file;
  historyTable[colorIndex][fromIndex][toIndex][0] += depth * depth;
}

function getHistoryScore(move: Move): number {
  const colorIndex = move.piece.color === 'w' ? 0 : 1;
  const fromIndex = move.from.rank * 8 + move.from.file;
  const toIndex = move.to.rank * 8 + move.to.file;
  return historyTable[colorIndex][fromIndex][toIndex][0];
}

export function clearHistory(): void {
  for (let c = 0; c < 2; c++) {
    for (let f = 0; f < 64; f++) {
      for (let t = 0; t < 64; t++) {
        historyTable[c][f][t][0] = 0;
      }
    }
  }
}

// ============================================================
// Move Comparison
// ============================================================

function movesEqual(a: Move, b: Move): boolean {
  return (
    a.from.rank === b.from.rank &&
    a.from.file === b.from.file &&
    a.to.rank === b.to.rank &&
    a.to.file === b.to.file &&
    a.promotion === b.promotion
  );
}

// ============================================================
// Move Scoring
// ============================================================

/**
 * Score a move for ordering purposes
 * Higher score = searched first
 */
function scoreMove(move: Move, ply: number, ttBestMove?: Move): number {
  let score = 0;

  // Transposition table best move gets highest priority
  if (ttBestMove && movesEqual(move, ttBestMove)) {
    return 100000;
  }

  // Captures scored by MVV-LVA
  if (move.captured) {
    score += 50000 + mvvLvaScore(move);
  }

  // Promotions
  if (move.promotion) {
    score += 40000;
    if (move.promotion === PieceType.Queen) score += 900;
    else if (move.promotion === PieceType.Rook) score += 500;
    else if (move.promotion === PieceType.Bishop) score += 330;
    else score += 320;
  }

  // Killer moves
  if (!move.captured && isKillerMove(move, ply)) {
    score += 30000;
  }

  // Castling is generally good
  if (move.moveType === MoveType.CastleKingside || move.moveType === MoveType.CastleQueenside) {
    score += 20000;
  }

  // History heuristic for quiet moves
  if (!move.captured && !move.promotion) {
    score += getHistoryScore(move);
  }

  return score;
}

// ============================================================
// Sort Moves
// ============================================================

/**
 * Sort moves for optimal alpha-beta pruning
 */
export function orderMoves(moves: Move[], ply: number, ttBestMove?: Move): Move[] {
  return moves
    .map(move => ({ move, score: scoreMove(move, ply, ttBestMove) }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.move);
}
