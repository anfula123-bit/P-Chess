/**
 * Piece utilities and constants
 */

import { Color, Piece, PieceType } from './types';

// ============================================================
// Piece Creation
// ============================================================

export function createPiece(type: PieceType, color: Color): Piece {
  return { type, color };
}

// ============================================================
// Piece Values (centipawns)
// ============================================================

export const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.Pawn]: 100,
  [PieceType.Knight]: 320,
  [PieceType.Bishop]: 330,
  [PieceType.Rook]: 500,
  [PieceType.Queen]: 900,
  [PieceType.King]: 20000,
};

// ============================================================
// Piece Characters for FEN/Display
// ============================================================

const PIECE_CHARS: Record<string, string> = {
  'wp': 'P', 'wn': 'N', 'wb': 'B', 'wr': 'R', 'wq': 'Q', 'wk': 'K',
  'bp': 'p', 'bn': 'n', 'bb': 'b', 'br': 'r', 'bq': 'q', 'bk': 'k',
};

export function pieceToChar(piece: Piece): string {
  return PIECE_CHARS[`${piece.color}${piece.type}`] || '?';
}

export function charToPiece(char: string): Piece | null {
  const isWhite = char === char.toUpperCase();
  const color = isWhite ? Color.White : Color.Black;
  const typeChar = char.toLowerCase();

  const typeMap: Record<string, PieceType> = {
    'p': PieceType.Pawn,
    'n': PieceType.Knight,
    'b': PieceType.Bishop,
    'r': PieceType.Rook,
    'q': PieceType.Queen,
    'k': PieceType.King,
  };

  const type = typeMap[typeChar];
  if (!type) return null;

  return createPiece(type, color);
}

// ============================================================
// Piece Unicode Symbols
// ============================================================

const PIECE_UNICODE: Record<string, string> = {
  'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
  'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟',
};

export function pieceToUnicode(piece: Piece): string {
  return PIECE_UNICODE[`${piece.color}${piece.type}`] || '?';
}

// ============================================================
// Color Utilities
// ============================================================

export function oppositeColor(color: Color): Color {
  return color === Color.White ? Color.Black : Color.White;
}

export function isPawn(piece: Piece): boolean {
  return piece.type === PieceType.Pawn;
}

export function isKing(piece: Piece): boolean {
  return piece.type === PieceType.King;
}

export function isRook(piece: Piece): boolean {
  return piece.type === PieceType.Rook;
}

export function isSlidingPiece(piece: Piece): boolean {
  return piece.type === PieceType.Bishop ||
    piece.type === PieceType.Rook ||
    piece.type === PieceType.Queen;
}

// ============================================================
// Piece Name for Display
// ============================================================

const PIECE_NAMES_EN: Record<PieceType, string> = {
  [PieceType.Pawn]: 'Pawn',
  [PieceType.Knight]: 'Knight',
  [PieceType.Bishop]: 'Bishop',
  [PieceType.Rook]: 'Rook',
  [PieceType.Queen]: 'Queen',
  [PieceType.King]: 'King',
};

const PIECE_NAMES_ID: Record<PieceType, string> = {
  [PieceType.Pawn]: 'Pion',
  [PieceType.Knight]: 'Kuda',
  [PieceType.Bishop]: 'Gajah',
  [PieceType.Rook]: 'Benteng',
  [PieceType.Queen]: 'Menteri',
  [PieceType.King]: 'Raja',
};

export function getPieceName(type: PieceType, lang: string = 'en'): string {
  if (lang === 'id') return PIECE_NAMES_ID[type] || type;
  return PIECE_NAMES_EN[type] || type;
}
