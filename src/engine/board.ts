/**
 * Board representation and FEN parsing/serialization
 */

import { Board, CastlingRights, Color, GameState, GameStatus, Piece, PieceType, Square, FileIndex, RankIndex } from './types';
import { charToPiece, createPiece, pieceToChar } from './pieces';

// ============================================================
// Square Utilities
// ============================================================

export function createSquare(rank: number, file: number): Square {
  return { rank: rank as RankIndex, file: file as FileIndex };
}

export function isValidSquare(rank: number, file: number): boolean {
  return rank >= 0 && rank <= 7 && file >= 0 && file <= 7;
}

export function squaresEqual(a: Square, b: Square): boolean {
  return a.rank === b.rank && a.file === b.file;
}

export function squareToAlgebraic(square: Square): string {
  const fileChar = String.fromCharCode(97 + square.file); // a-h
  const rankChar = String.fromCharCode(56 - square.rank);  // 8-1
  return `${fileChar}${rankChar}`;
}

export function algebraicToSquare(algebraic: string): Square | null {
  if (algebraic.length !== 2) return null;
  const file = algebraic.charCodeAt(0) - 97;
  const rank = 56 - algebraic.charCodeAt(1);
  if (!isValidSquare(rank, file)) return null;
  return createSquare(rank, file);
}

/**
 * Get the color of a square (for rendering)
 * Returns true for light squares, false for dark squares
 */
export function isLightSquare(rank: number, file: number): boolean {
  return (rank + file) % 2 === 0;
}

// ============================================================
// Board Creation
// ============================================================

export function createEmptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

export function createInitialBoard(): Board {
  const board = createEmptyBoard();

  // Black pieces (rank 0 = board top = rank 8 in chess)
  board[0][0] = createPiece(PieceType.Rook, Color.Black);
  board[0][1] = createPiece(PieceType.Knight, Color.Black);
  board[0][2] = createPiece(PieceType.Bishop, Color.Black);
  board[0][3] = createPiece(PieceType.Queen, Color.Black);
  board[0][4] = createPiece(PieceType.King, Color.Black);
  board[0][5] = createPiece(PieceType.Bishop, Color.Black);
  board[0][6] = createPiece(PieceType.Knight, Color.Black);
  board[0][7] = createPiece(PieceType.Rook, Color.Black);

  // Black pawns
  for (let f = 0; f < 8; f++) {
    board[1][f] = createPiece(PieceType.Pawn, Color.Black);
  }

  // White pawns
  for (let f = 0; f < 8; f++) {
    board[6][f] = createPiece(PieceType.Pawn, Color.White);
  }

  // White pieces (rank 7 = board bottom = rank 1 in chess)
  board[7][0] = createPiece(PieceType.Rook, Color.White);
  board[7][1] = createPiece(PieceType.Knight, Color.White);
  board[7][2] = createPiece(PieceType.Bishop, Color.White);
  board[7][3] = createPiece(PieceType.Queen, Color.White);
  board[7][4] = createPiece(PieceType.King, Color.White);
  board[7][5] = createPiece(PieceType.Bishop, Color.White);
  board[7][6] = createPiece(PieceType.Knight, Color.White);
  board[7][7] = createPiece(PieceType.Rook, Color.White);

  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(piece => piece ? { ...piece } : null));
}

// ============================================================
// Board Access
// ============================================================

export function getPiece(board: Board, square: Square): Piece | null {
  return board[square.rank][square.file];
}

export function setPiece(board: Board, square: Square, piece: Piece | null): void {
  board[square.rank][square.file] = piece;
}

export function findKing(board: Board, color: Color): Square | null {
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === PieceType.King && piece.color === color) {
        return createSquare(rank, file);
      }
    }
  }
  return null;
}

export function getAllPieces(board: Board, color: Color): { piece: Piece; square: Square }[] {
  const pieces: { piece: Piece; square: Square }[] = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.color === color) {
        pieces.push({ piece, square: createSquare(rank, file) });
      }
    }
  }
  return pieces;
}

export function countPieces(board: Board, color: Color, type?: PieceType): number {
  let count = 0;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.color === color && (!type || piece.type === type)) {
        count++;
      }
    }
  }
  return count;
}

// ============================================================
// FEN
// ============================================================

export function boardToFEN(state: GameState): string {
  const parts: string[] = [];

  // 1. Piece placement
  const rows: string[] = [];
  for (let rank = 0; rank < 8; rank++) {
    let row = '';
    let emptyCount = 0;

    for (let file = 0; file < 8; file++) {
      const piece = state.board[rank][file];
      if (piece) {
        if (emptyCount > 0) {
          row += emptyCount;
          emptyCount = 0;
        }
        row += pieceToChar(piece);
      } else {
        emptyCount++;
      }
    }
    if (emptyCount > 0) row += emptyCount;
    rows.push(row);
  }
  parts.push(rows.join('/'));

  // 2. Active color
  parts.push(state.activeColor === Color.White ? 'w' : 'b');

  // 3. Castling availability
  let castling = '';
  if (state.castlingRights.whiteKingside) castling += 'K';
  if (state.castlingRights.whiteQueenside) castling += 'Q';
  if (state.castlingRights.blackKingside) castling += 'k';
  if (state.castlingRights.blackQueenside) castling += 'q';
  parts.push(castling || '-');

  // 4. En passant target
  parts.push(state.enPassantTarget ? squareToAlgebraic(state.enPassantTarget) : '-');

  // 5. Halfmove clock
  parts.push(state.halfMoveClock.toString());

  // 6. Fullmove number
  parts.push(state.fullMoveNumber.toString());

  return parts.join(' ');
}

/**
 * Get position-only FEN (first 4 fields) for threefold repetition detection
 */
export function getPositionFEN(state: GameState): string {
  const fullFen = boardToFEN(state);
  return fullFen.split(' ').slice(0, 4).join(' ');
}

export function parseFEN(fen: string): GameState {
  const parts = fen.split(' ');
  if (parts.length !== 6) {
    throw new Error(`Invalid FEN: expected 6 fields, got ${parts.length}`);
  }

  const [placement, activeColor, castling, enPassant, halfMove, fullMove] = parts;

  // 1. Parse board
  const board = createEmptyBoard();
  const ranks = placement.split('/');
  if (ranks.length !== 8) {
    throw new Error(`Invalid FEN: expected 8 ranks, got ${ranks.length}`);
  }

  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const char of ranks[rank]) {
      if (char >= '1' && char <= '8') {
        file += parseInt(char);
      } else {
        const piece = charToPiece(char);
        if (!piece) throw new Error(`Invalid FEN: unknown piece '${char}'`);
        board[rank][file] = piece;
        file++;
      }
    }
    if (file !== 8) {
      throw new Error(`Invalid FEN: rank ${8 - rank} has ${file} squares`);
    }
  }

  // 2. Active color
  const color = activeColor === 'w' ? Color.White : Color.Black;

  // 3. Castling rights
  const castlingRights: CastlingRights = {
    whiteKingside: castling.includes('K'),
    whiteQueenside: castling.includes('Q'),
    blackKingside: castling.includes('k'),
    blackQueenside: castling.includes('q'),
  };

  // 4. En passant
  const enPassantTarget = enPassant === '-' ? null : algebraicToSquare(enPassant);

  // 5-6. Move clocks
  const halfMoveClock = parseInt(halfMove) || 0;
  const fullMoveNumber = parseInt(fullMove) || 1;

  return {
    board,
    activeColor: color,
    castlingRights,
    enPassantTarget,
    halfMoveClock,
    fullMoveNumber,
    moveHistory: [],
    status: GameStatus.Active,
    positionHistory: [],
    capturedPieces: { white: [], black: [] },
    zobristHash: 0,
    commanders: {
      w: { type: null, energy: 3, skillUsedThisTurn: false },
      b: { type: null, energy: 3, skillUsedThisTurn: false },
    },
    divineShieldSquare: null,
    slowedPieces: [],
    doubleStepPiece: null,
    doubleStepMovesLeft: 0,
  };
}

export function createInitialGameState(): GameState {
  const state: GameState = {
    board: createInitialBoard(),
    activeColor: Color.White,
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantTarget: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
    moveHistory: [],
    status: GameStatus.Active,
    positionHistory: [],
    capturedPieces: { white: [], black: [] },
    zobristHash: 0,
    commanders: {
      w: { type: null, energy: 3, skillUsedThisTurn: false },
      b: { type: null, energy: 3, skillUsedThisTurn: false },
    },
    divineShieldSquare: null,
    slowedPieces: [],
    doubleStepPiece: null,
    doubleStepMovesLeft: 0,
  };

  state.positionHistory.push(getPositionFEN(state));
  return state;
}
