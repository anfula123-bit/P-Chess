/**
 * Position Evaluation Function
 * Evaluates a position from the perspective of the active player
 */

import {
  Board, Color, GameState, GameStatus, Piece, PieceType,
} from '../engine/types';
import { PIECE_VALUES, oppositeColor } from '../engine/pieces';
import { getAllPieces, findKing, countPieces } from '../engine/board';
import { isSquareAttacked, generateLegalMoves } from '../engine/moves';
import { isInCheck } from '../engine/rules';
import { getPSTValue } from './tables';

// ============================================================
// Constants
// ============================================================

const BISHOP_PAIR_BONUS = 50;
const ROOK_OPEN_FILE_BONUS = 25;
const ROOK_SEMI_OPEN_FILE_BONUS = 15;
const PASSED_PAWN_BONUS = [0, 10, 20, 40, 60, 100, 150, 0]; // by rank advancement
const DOUBLED_PAWN_PENALTY = -20;
const ISOLATED_PAWN_PENALTY = -15;
const KING_SHIELD_BONUS = 10;
const CENTER_CONTROL_BONUS = 10;
const MOBILITY_WEIGHT = 3;
const CHECKMATE_SCORE = 100000;
const DRAW_SCORE = 0;

// Center squares
const CENTER_SQUARES = [
  { rank: 3, file: 3 }, { rank: 3, file: 4 },
  { rank: 4, file: 3 }, { rank: 4, file: 4 },
];

const EXTENDED_CENTER = [
  { rank: 2, file: 2 }, { rank: 2, file: 3 }, { rank: 2, file: 4 }, { rank: 2, file: 5 },
  { rank: 3, file: 2 }, { rank: 3, file: 5 },
  { rank: 4, file: 2 }, { rank: 4, file: 5 },
  { rank: 5, file: 2 }, { rank: 5, file: 3 }, { rank: 5, file: 4 }, { rank: 5, file: 5 },
];

// ============================================================
// Main Evaluation
// ============================================================

/**
 * Evaluate position from the active player's perspective
 * Positive = advantage for active player, negative = disadvantage
 */
export function evaluate(state: GameState): number {
  // Terminal states
  if (state.status === GameStatus.Checkmate) {
    return -CHECKMATE_SCORE; // Current player is checkmated
  }
  if (state.status === GameStatus.Stalemate ||
    state.status === GameStatus.DrawFiftyMove ||
    state.status === GameStatus.DrawThreefold ||
    state.status === GameStatus.DrawInsufficientMaterial ||
    state.status === GameStatus.DrawAgreement) {
    return DRAW_SCORE;
  }

  const board = state.board;
  const isEndgame = detectEndgame(board);

  // Evaluate from White's perspective, then negate for Black
  let whiteScore = 0;
  let blackScore = 0;

  // Material + PST
  whiteScore += evaluateMaterial(board, Color.White);
  blackScore += evaluateMaterial(board, Color.Black);
  whiteScore += evaluatePST(board, Color.White, isEndgame);
  blackScore += evaluatePST(board, Color.Black, isEndgame);

  // Pawn structure
  whiteScore += evaluatePawnStructure(board, Color.White);
  blackScore += evaluatePawnStructure(board, Color.Black);

  // King safety
  if (!isEndgame) {
    whiteScore += evaluateKingSafety(board, Color.White);
    blackScore += evaluateKingSafety(board, Color.Black);
  }

  // Bishop pair
  whiteScore += evaluateBishopPair(board, Color.White);
  blackScore += evaluateBishopPair(board, Color.Black);

  // Rook on open files
  whiteScore += evaluateRookFiles(board, Color.White);
  blackScore += evaluateRookFiles(board, Color.Black);

  // Center control
  whiteScore += evaluateCenterControl(board, Color.White);
  blackScore += evaluateCenterControl(board, Color.Black);

  // Mobility (simplified — use legal move count)
  whiteScore += evaluateMobility(state, Color.White);
  blackScore += evaluateMobility(state, Color.Black);

  const totalWhite = whiteScore;
  const totalBlack = blackScore;

  // Return score relative to the active player
  if (state.activeColor === Color.White) {
    return totalWhite - totalBlack;
  } else {
    return totalBlack - totalWhite;
  }
}

/**
 * Static evaluation for quiescence search (faster, no mobility)
 */
export function evaluateStatic(state: GameState): number {
  const board = state.board;
  const isEndgame = detectEndgame(board);

  let whiteScore = evaluateMaterial(board, Color.White) + evaluatePST(board, Color.White, isEndgame);
  let blackScore = evaluateMaterial(board, Color.Black) + evaluatePST(board, Color.Black, isEndgame);

  whiteScore += evaluatePawnStructure(board, Color.White);
  blackScore += evaluatePawnStructure(board, Color.Black);

  if (state.activeColor === Color.White) {
    return whiteScore - blackScore;
  } else {
    return blackScore - whiteScore;
  }
}

// ============================================================
// Sub-evaluations
// ============================================================

function evaluateMaterial(board: Board, color: Color): number {
  let score = 0;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.color === color) {
        score += PIECE_VALUES[piece.type];
      }
    }
  }
  return score;
}

function evaluatePST(board: Board, color: Color, isEndgame: boolean): number {
  let score = 0;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.color === color) {
        score += getPSTValue(piece.type, color, rank, file, isEndgame);
      }
    }
  }
  return score;
}

function evaluatePawnStructure(board: Board, color: Color): number {
  let score = 0;
  const pawns: { rank: number; file: number }[] = [];

  // Collect pawn positions
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === PieceType.Pawn && piece.color === color) {
        pawns.push({ rank, file });
      }
    }
  }

  // File tracking for doubled/isolated detection
  const filePawnCount = new Array(8).fill(0);
  for (const pawn of pawns) {
    filePawnCount[pawn.file]++;
  }

  for (const pawn of pawns) {
    // Doubled pawns
    if (filePawnCount[pawn.file] > 1) {
      score += DOUBLED_PAWN_PENALTY;
    }

    // Isolated pawns
    const hasNeighbor =
      (pawn.file > 0 && filePawnCount[pawn.file - 1] > 0) ||
      (pawn.file < 7 && filePawnCount[pawn.file + 1] > 0);
    if (!hasNeighbor) {
      score += ISOLATED_PAWN_PENALTY;
    }

    // Passed pawns
    if (isPassedPawn(board, pawn.rank, pawn.file, color)) {
      const advancement = color === Color.White
        ? 7 - pawn.rank
        : pawn.rank;
      score += PASSED_PAWN_BONUS[advancement];
    }
  }

  return score;
}

function isPassedPawn(board: Board, rank: number, file: number, color: Color): boolean {
  const direction = color === Color.White ? -1 : 1;
  const enemyColor = oppositeColor(color);

  // Check all files (same + adjacent) in front of the pawn
  for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
    let r = rank + direction;
    while (r >= 0 && r <= 7) {
      const piece = board[r][f];
      if (piece && piece.type === PieceType.Pawn && piece.color === enemyColor) {
        return false;
      }
      r += direction;
    }
  }

  return true;
}

function evaluateKingSafety(board: Board, color: Color): number {
  let score = 0;
  const kingSquare = findKing(board, color);
  if (!kingSquare) return 0;

  // Pawn shield bonus
  const direction = color === Color.White ? -1 : 1;
  for (let df = -1; df <= 1; df++) {
    const shieldRank = kingSquare.rank + direction;
    const shieldFile = kingSquare.file + df;
    if (shieldRank >= 0 && shieldRank <= 7 && shieldFile >= 0 && shieldFile <= 7) {
      const piece = board[shieldRank][shieldFile];
      if (piece && piece.type === PieceType.Pawn && piece.color === color) {
        score += KING_SHIELD_BONUS;
      }
    }
  }

  return score;
}

function evaluateBishopPair(board: Board, color: Color): number {
  let bishopCount = 0;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === PieceType.Bishop && piece.color === color) {
        bishopCount++;
      }
    }
  }
  return bishopCount >= 2 ? BISHOP_PAIR_BONUS : 0;
}

function evaluateRookFiles(board: Board, color: Color): number {
  let score = 0;

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === PieceType.Rook && piece.color === color) {
        let hasFriendlyPawn = false;
        let hasEnemyPawn = false;

        for (let r = 0; r < 8; r++) {
          const filePiece = board[r][file];
          if (filePiece && filePiece.type === PieceType.Pawn) {
            if (filePiece.color === color) hasFriendlyPawn = true;
            else hasEnemyPawn = true;
          }
        }

        if (!hasFriendlyPawn && !hasEnemyPawn) {
          score += ROOK_OPEN_FILE_BONUS;
        } else if (!hasFriendlyPawn) {
          score += ROOK_SEMI_OPEN_FILE_BONUS;
        }
      }
    }
  }

  return score;
}

function evaluateCenterControl(board: Board, color: Color): number {
  let score = 0;

  for (const sq of CENTER_SQUARES) {
    const piece = board[sq.rank][sq.file];
    if (piece && piece.color === color && piece.type === PieceType.Pawn) {
      score += CENTER_CONTROL_BONUS;
    }
  }

  return score;
}

function evaluateMobility(state: GameState, color: Color): number {
  // Approximate mobility by counting legal moves
  const moves = generateLegalMoves(state, color);
  return moves.length * MOBILITY_WEIGHT;
}

// ============================================================
// Phase Detection
// ============================================================

function detectEndgame(board: Board): boolean {
  let totalMaterial = 0;

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type !== PieceType.King && piece.type !== PieceType.Pawn) {
        totalMaterial += PIECE_VALUES[piece.type];
      }
    }
  }

  // Endgame threshold: less than ~1 queen + 1 rook total non-pawn material
  return totalMaterial < 1500;
}
