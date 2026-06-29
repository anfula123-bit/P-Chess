/**
 * Move generation for all piece types
 * Generates pseudo-legal and legal moves
 */

import {
  Board, Color, Move, MoveType, Piece, PieceType, Square,
  CastlingRights, PromotionPiece, GameState, FileIndex, RankIndex,
} from './types';
import {
  createSquare, getPiece, isValidSquare, cloneBoard, setPiece, findKing,
} from './board';
import { oppositeColor } from './pieces';

// ============================================================
// Direction Vectors
// ============================================================

const KNIGHT_OFFSETS: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const KING_OFFSETS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

const BISHOP_DIRS: [number, number][] = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

const ROOK_DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

const QUEEN_DIRS: [number, number][] = [...BISHOP_DIRS, ...ROOK_DIRS];

// ============================================================
// Pseudo-Legal Move Generation
// ============================================================

/**
 * Generate all pseudo-legal moves for a piece (does not check if king is left in check)
 */
function generatePawnMoves(board: Board, square: Square, piece: Piece, enPassantTarget: Square | null): Move[] {
  const moves: Move[] = [];
  const color = piece.color;
  const direction = color === Color.White ? -1 : 1;
  const startRank = color === Color.White ? 6 : 1;
  const promotionRank = color === Color.White ? 0 : 7;

  // Forward move
  const forwardRank = square.rank + direction;
  if (isValidSquare(forwardRank, square.file)) {
    const forwardSquare = createSquare(forwardRank, square.file);

    if (!getPiece(board, forwardSquare)) {
      if (forwardRank === promotionRank) {
        // Promotion
        const promotionPieces: PromotionPiece[] = [PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight];
        for (const promo of promotionPieces) {
          moves.push({
            from: square, to: forwardSquare, piece,
            moveType: MoveType.Promotion, promotion: promo,
          });
        }
      } else {
        moves.push({
          from: square, to: forwardSquare, piece, moveType: MoveType.Normal,
        });

        // Double move from start
        if (square.rank === startRank) {
          const doubleRank = square.rank + direction * 2;
          const doubleSquare = createSquare(doubleRank, square.file);
          if (!getPiece(board, doubleSquare)) {
            moves.push({
              from: square, to: doubleSquare, piece, moveType: MoveType.DoublePawn,
            });
          }
        }
      }
    }
  }

  // Diagonal captures
  for (const fileDelta of [-1, 1]) {
    const captureFile = square.file + fileDelta;
    const captureRank = square.rank + direction;

    if (!isValidSquare(captureRank, captureFile)) continue;

    const captureSquare = createSquare(captureRank, captureFile);
    const targetPiece = getPiece(board, captureSquare);

    if (targetPiece && targetPiece.color !== color) {
      if (captureRank === promotionRank) {
        const promotionPieces: PromotionPiece[] = [PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight];
        for (const promo of promotionPieces) {
          moves.push({
            from: square, to: captureSquare, piece,
            captured: targetPiece, moveType: MoveType.Promotion, promotion: promo,
          });
        }
      } else {
        moves.push({
          from: square, to: captureSquare, piece,
          captured: targetPiece, moveType: MoveType.Normal,
        });
      }
    }

    // En passant
    if (enPassantTarget && captureRank === enPassantTarget.rank && captureFile === enPassantTarget.file) {
      const capturedPawnRank = square.rank;
      const capturedPawn = getPiece(board, createSquare(capturedPawnRank, captureFile));
      if (capturedPawn && capturedPawn.type === PieceType.Pawn && capturedPawn.color !== color) {
        moves.push({
          from: square, to: captureSquare, piece,
          captured: capturedPawn, moveType: MoveType.EnPassant,
        });
      }
    }
  }

  return moves;
}

function generateKnightMoves(board: Board, square: Square, piece: Piece): Move[] {
  const moves: Move[] = [];

  for (const [dr, df] of KNIGHT_OFFSETS) {
    const newRank = square.rank + dr;
    const newFile = square.file + df;
    if (!isValidSquare(newRank, newFile)) continue;

    const target = createSquare(newRank, newFile);
    const targetPiece = getPiece(board, target);

    if (!targetPiece || targetPiece.color !== piece.color) {
      moves.push({
        from: square, to: target, piece,
        captured: targetPiece || undefined, moveType: MoveType.Normal,
      });
    }
  }

  return moves;
}

function generateSlidingMoves(
  board: Board, square: Square, piece: Piece, directions: [number, number][]
): Move[] {
  const moves: Move[] = [];

  for (const [dr, df] of directions) {
    let r = square.rank + dr;
    let f = square.file + df;

    while (isValidSquare(r, f)) {
      const target = createSquare(r, f);
      const targetPiece = getPiece(board, target);

      if (targetPiece) {
        if (targetPiece.color !== piece.color) {
          moves.push({
            from: square, to: target, piece,
            captured: targetPiece, moveType: MoveType.Normal,
          });
        }
        break; // Blocked
      }

      moves.push({
        from: square, to: target, piece, moveType: MoveType.Normal,
      });

      r += dr;
      f += df;
    }
  }

  return moves;
}

function generateKingMoves(board: Board, square: Square, piece: Piece): Move[] {
  const moves: Move[] = [];

  for (const [dr, df] of KING_OFFSETS) {
    const newRank = square.rank + dr;
    const newFile = square.file + df;
    if (!isValidSquare(newRank, newFile)) continue;

    const target = createSquare(newRank, newFile);
    const targetPiece = getPiece(board, target);

    if (!targetPiece || targetPiece.color !== piece.color) {
      moves.push({
        from: square, to: target, piece,
        captured: targetPiece || undefined, moveType: MoveType.Normal,
      });
    }
  }

  return moves;
}

// ============================================================
// Castling
// ============================================================

function generateCastlingMoves(
  board: Board, square: Square, piece: Piece, castlingRights: CastlingRights
): Move[] {
  const moves: Move[] = [];
  const color = piece.color;
  const rank = color === Color.White ? 7 : 0;

  // King must be on its starting square
  if (square.rank !== rank || square.file !== 4) return moves;

  // Check if king is in check (can't castle out of check)
  if (isSquareAttacked(board, square, oppositeColor(color))) return moves;

  // Kingside
  const canKingside = color === Color.White
    ? castlingRights.whiteKingside
    : castlingRights.blackKingside;

  if (canKingside) {
    const f5 = createSquare(rank, 5 as FileIndex);
    const g5 = createSquare(rank, 6 as FileIndex);
    const rookSquare = createSquare(rank, 7 as FileIndex);
    const rook = getPiece(board, rookSquare);

    if (
      rook && rook.type === PieceType.Rook && rook.color === color &&
      !getPiece(board, f5) && !getPiece(board, g5) &&
      !isSquareAttacked(board, f5, oppositeColor(color)) &&
      !isSquareAttacked(board, g5, oppositeColor(color))
    ) {
      moves.push({
        from: square, to: g5, piece, moveType: MoveType.CastleKingside,
      });
    }
  }

  // Queenside
  const canQueenside = color === Color.White
    ? castlingRights.whiteQueenside
    : castlingRights.blackQueenside;

  if (canQueenside) {
    const d5 = createSquare(rank, 3 as FileIndex);
    const c5 = createSquare(rank, 2 as FileIndex);
    const b5 = createSquare(rank, 1 as FileIndex);
    const rookSquare = createSquare(rank, 0 as FileIndex);
    const rook = getPiece(board, rookSquare);

    if (
      rook && rook.type === PieceType.Rook && rook.color === color &&
      !getPiece(board, d5) && !getPiece(board, c5) && !getPiece(board, b5) &&
      !isSquareAttacked(board, d5, oppositeColor(color)) &&
      !isSquareAttacked(board, c5, oppositeColor(color))
    ) {
      moves.push({
        from: square, to: c5, piece, moveType: MoveType.CastleQueenside,
      });
    }
  }

  return moves;
}

// ============================================================
// Attack Detection
// ============================================================

/**
 * Check if a square is attacked by the given color
 */
export function isSquareAttacked(board: Board, square: Square, byColor: Color): boolean {
  // Pawn attacks
  const pawnDir = byColor === Color.White ? 1 : -1; // Direction from which pawn attacks come
  for (const fileDelta of [-1, 1]) {
    const r = square.rank + pawnDir;
    const f = square.file + fileDelta;
    if (isValidSquare(r, f)) {
      const piece = getPiece(board, createSquare(r, f));
      if (piece && piece.type === PieceType.Pawn && piece.color === byColor) {
        return true;
      }
    }
  }

  // Knight attacks
  for (const [dr, df] of KNIGHT_OFFSETS) {
    const r = square.rank + dr;
    const f = square.file + df;
    if (isValidSquare(r, f)) {
      const piece = getPiece(board, createSquare(r, f));
      if (piece && piece.type === PieceType.Knight && piece.color === byColor) {
        return true;
      }
    }
  }

  // King attacks
  for (const [dr, df] of KING_OFFSETS) {
    const r = square.rank + dr;
    const f = square.file + df;
    if (isValidSquare(r, f)) {
      const piece = getPiece(board, createSquare(r, f));
      if (piece && piece.type === PieceType.King && piece.color === byColor) {
        return true;
      }
    }
  }

  // Sliding piece attacks (bishop/queen on diagonals, rook/queen on straights)
  for (const [dr, df] of BISHOP_DIRS) {
    let r = square.rank + dr;
    let f = square.file + df;
    while (isValidSquare(r, f)) {
      const piece = getPiece(board, createSquare(r, f));
      if (piece) {
        if (piece.color === byColor &&
          (piece.type === PieceType.Bishop || piece.type === PieceType.Queen)) {
          return true;
        }
        break;
      }
      r += dr;
      f += df;
    }
  }

  for (const [dr, df] of ROOK_DIRS) {
    let r = square.rank + dr;
    let f = square.file + df;
    while (isValidSquare(r, f)) {
      const piece = getPiece(board, createSquare(r, f));
      if (piece) {
        if (piece.color === byColor &&
          (piece.type === PieceType.Rook || piece.type === PieceType.Queen)) {
          return true;
        }
        break;
      }
      r += dr;
      f += df;
    }
  }

  return false;
}

// ============================================================
// Legal Move Generation
// ============================================================

/**
 * Generate all pseudo-legal moves for a color (doesn't check king safety)
 */
export function generatePseudoLegalMoves(state: GameState, color?: Color): Move[] {
  const activeColor = color ?? state.activeColor;
  const moves: Move[] = [];

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = state.board[rank][file];
      if (!piece || piece.color !== activeColor) continue;

      const square = createSquare(rank, file);

      switch (piece.type) {
        case PieceType.Pawn:
          moves.push(...generatePawnMoves(state.board, square, piece, state.enPassantTarget));
          break;
        case PieceType.Knight:
          moves.push(...generateKnightMoves(state.board, square, piece));
          break;
        case PieceType.Bishop:
          moves.push(...generateSlidingMoves(state.board, square, piece, BISHOP_DIRS));
          break;
        case PieceType.Rook:
          moves.push(...generateSlidingMoves(state.board, square, piece, ROOK_DIRS));
          break;
        case PieceType.Queen:
          moves.push(...generateSlidingMoves(state.board, square, piece, QUEEN_DIRS));
          break;
        case PieceType.King:
          moves.push(...generateKingMoves(state.board, square, piece));
          moves.push(...generateCastlingMoves(state.board, square, piece, state.castlingRights));
          break;
      }
    }
  }

  return moves;
}

/**
 * Check if a move leaves the king in check (pseudo-legal → legal filter)
 */
export function isMoveLegal(state: GameState, move: Move): boolean {
  const board = cloneBoard(state.board);
  const color = move.piece.color;

  // Apply the move on the cloned board
  setPiece(board, move.from, null);
  setPiece(board, move.to, move.promotion
    ? { type: move.promotion, color }
    : move.piece
  );

  // Handle en passant capture
  if (move.moveType === MoveType.EnPassant) {
    const capturedPawnRank = move.from.rank;
    setPiece(board, createSquare(capturedPawnRank, move.to.file), null);
  }

  // Handle castling - move the rook
  if (move.moveType === MoveType.CastleKingside) {
    const rank = move.from.rank;
    setPiece(board, createSquare(rank, 7), null);
    setPiece(board, createSquare(rank, 5), { type: PieceType.Rook, color });
  }
  if (move.moveType === MoveType.CastleQueenside) {
    const rank = move.from.rank;
    setPiece(board, createSquare(rank, 0), null);
    setPiece(board, createSquare(rank, 3), { type: PieceType.Rook, color });
  }

  // Find king position after move
  const kingSquare = findKing(board, color);
  if (!kingSquare) return false;

  // King must not be in check after the move
  return !isSquareAttacked(board, kingSquare, oppositeColor(color));
}

/**
 * Generate all legal moves for the active color
 */
export function generateLegalMoves(state: GameState, color?: Color): Move[] {
  const pseudoMoves = generatePseudoLegalMoves(state, color);
  let legal = pseudoMoves.filter(move => isMoveLegal(state, move));

  // 1. Filter out moves from slowed pieces
  if (state.slowedPieces && state.slowedPieces.length > 0) {
    legal = legal.filter(move =>
      !state.slowedPieces.some(s => s.rank === move.from.rank && s.file === move.from.file)
    );
  }

  // 2. Filter out captures targeting the Divine Shield square
  if (state.divineShieldSquare) {
    const shield = state.divineShieldSquare;
    legal = legal.filter(move => {
      const isCaptureAtShield = move.to.rank === shield.rank && move.to.file === shield.file;
      // We check if it is a capture targeting the shielded square. Note that we check move.captured,
      // or if it captures any piece there (which is standard capture).
      return !(isCaptureAtShield && move.captured);
    });
  }

  // 3. If Double Step is active, only allow moves from the double step piece
  if (state.doubleStepPiece && state.doubleStepMovesLeft > 0) {
    const ds = state.doubleStepPiece;
    legal = legal.filter(move =>
      move.from.rank === ds.rank && move.from.file === ds.file
    );
  }

  return legal;
}

/**
 * Generate legal moves for a specific square
 */
export function getLegalMovesForSquare(state: GameState, square: Square): Move[] {
  // If piece is slowed, it has no legal moves
  if (state.slowedPieces && state.slowedPieces.some(s => s.rank === square.rank && s.file === square.file)) {
    return [];
  }

  const piece = getPiece(state.board, square);
  if (!piece || piece.color !== state.activeColor) return [];

  return generateLegalMoves(state).filter(
    move => move.from.rank === square.rank && move.from.file === square.file
  );
}

/**
 * Check if a specific move is in the legal moves list
 */
export function isLegalMoveAvailable(state: GameState, from: Square, to: Square, promotion?: PromotionPiece): Move | null {
  const legalMoves = generateLegalMoves(state);
  return legalMoves.find(move =>
    move.from.rank === from.rank &&
    move.from.file === from.file &&
    move.to.rank === to.rank &&
    move.to.file === to.file &&
    (!promotion || move.promotion === promotion)
  ) || null;
}
