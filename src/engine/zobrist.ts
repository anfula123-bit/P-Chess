/**
 * Zobrist Hashing
 * Used for transposition table and repetition detection
 */

import { Board, CastlingRights, Color, PieceType, Square } from './types';

// ============================================================
// Random Number Generation (deterministic for reproducibility)
// ============================================================

class ZobristRNG {
  private state: number;

  constructor(seed: number = 1070372) {
    this.state = seed;
  }

  /** XorShift32 PRNG — produces a 32-bit integer */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return x >>> 0; // ensure unsigned
  }
}

// ============================================================
// Zobrist Table
// ============================================================

/** Map piece type + color to index 0-11 */
function pieceIndex(type: PieceType, color: Color): number {
  const typeMap: Record<PieceType, number> = {
    [PieceType.Pawn]: 0,
    [PieceType.Knight]: 1,
    [PieceType.Bishop]: 2,
    [PieceType.Rook]: 3,
    [PieceType.Queen]: 4,
    [PieceType.King]: 5,
  };
  return typeMap[type] + (color === Color.White ? 0 : 6);
}

// Pre-computed Zobrist keys
const rng = new ZobristRNG();

/** pieceKeys[square64][pieceIndex12] */
const pieceKeys: number[][] = Array.from({ length: 64 }, () =>
  Array.from({ length: 12 }, () => rng.next())
);

/** castlingKeys[4] — K, Q, k, q */
const castlingKeys: number[] = Array.from({ length: 4 }, () => rng.next());

/** enPassantKeys[8] — one per file */
const enPassantKeys: number[] = Array.from({ length: 8 }, () => rng.next());

/** sideKey — XOR when it's black's turn */
const sideKey: number = rng.next();

// ============================================================
// Hash Computation
// ============================================================

function squareTo64(rank: number, file: number): number {
  return rank * 8 + file;
}

/**
 * Compute full Zobrist hash from scratch
 */
export function computeZobristHash(
  board: Board,
  activeColor: Color,
  castlingRights: CastlingRights,
  enPassantTarget: Square | null,
): number {
  let hash = 0;

  // Pieces
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece) {
        const sq = squareTo64(rank, file);
        const idx = pieceIndex(piece.type, piece.color);
        hash ^= pieceKeys[sq][idx];
      }
    }
  }

  // Side to move
  if (activeColor === Color.Black) {
    hash ^= sideKey;
  }

  // Castling rights
  if (castlingRights.whiteKingside) hash ^= castlingKeys[0];
  if (castlingRights.whiteQueenside) hash ^= castlingKeys[1];
  if (castlingRights.blackKingside) hash ^= castlingKeys[2];
  if (castlingRights.blackQueenside) hash ^= castlingKeys[3];

  // En passant
  if (enPassantTarget) {
    hash ^= enPassantKeys[enPassantTarget.file];
  }

  return hash >>> 0;
}

// ============================================================
// Incremental Hash Updates
// ============================================================

/**
 * Toggle a piece on/off at a given square
 */
export function hashTogglePiece(hash: number, rank: number, file: number, type: PieceType, color: Color): number {
  const sq = squareTo64(rank, file);
  const idx = pieceIndex(type, color);
  return (hash ^ pieceKeys[sq][idx]) >>> 0;
}

/**
 * Toggle side to move
 */
export function hashToggleSide(hash: number): number {
  return (hash ^ sideKey) >>> 0;
}

/**
 * Toggle castling right
 * @param index 0=wK, 1=wQ, 2=bK, 3=bQ
 */
export function hashToggleCastling(hash: number, index: number): number {
  return (hash ^ castlingKeys[index]) >>> 0;
}

/**
 * Toggle en passant file
 */
export function hashToggleEnPassant(hash: number, file: number): number {
  return (hash ^ enPassantKeys[file]) >>> 0;
}
