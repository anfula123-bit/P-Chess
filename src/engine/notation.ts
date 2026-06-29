/**
 * Chess notation
 * Algebraic notation, PGN, and move string formatting
 */

import {
  Color, GameState, GameStatus, Move, MoveType, PieceType, Square,
} from './types';
import {
  squareToAlgebraic, getPiece, algebraicToSquare, createSquare,
} from './board';
import { generateLegalMoves } from './moves';
import { getGameResult } from './rules';

// ============================================================
// Algebraic Notation
// ============================================================

/**
 * Convert a move to Standard Algebraic Notation (SAN)
 * Must be called BEFORE the move is made (needs current state for disambiguation)
 */
export function moveToAlgebraic(state: GameState, move: Move): string {
  // Castling
  if (move.moveType === MoveType.CastleKingside) return 'O-O';
  if (move.moveType === MoveType.CastleQueenside) return 'O-O-O';

  let notation = '';

  // Piece letter (not for pawns)
  if (move.piece.type !== PieceType.Pawn) {
    notation += move.piece.type.toUpperCase();

    // Disambiguation: if another piece of the same type can move to the same square
    const allMoves = generateLegalMoves(state);
    const ambiguousMoves = allMoves.filter(m =>
      m.piece.type === move.piece.type &&
      m.to.rank === move.to.rank &&
      m.to.file === move.to.file &&
      (m.from.rank !== move.from.rank || m.from.file !== move.from.file)
    );

    if (ambiguousMoves.length > 0) {
      const sameFile = ambiguousMoves.some(m => m.from.file === move.from.file);
      const sameRank = ambiguousMoves.some(m => m.from.rank === move.from.rank);

      if (!sameFile) {
        notation += String.fromCharCode(97 + move.from.file);
      } else if (!sameRank) {
        notation += String.fromCharCode(56 - move.from.rank);
      } else {
        notation += squareToAlgebraic(move.from);
      }
    }
  } else if (move.captured) {
    // Pawn captures include file letter
    notation += String.fromCharCode(97 + move.from.file);
  }

  // Capture
  if (move.captured) {
    notation += 'x';
  }

  // Destination square
  notation += squareToAlgebraic(move.to);

  // Promotion
  if (move.promotion) {
    notation += '=' + move.promotion.toUpperCase();
  }

  return notation;
}

/**
 * Convert a move to long algebraic notation (e.g., e2e4, e1g1)
 */
export function moveToLongAlgebraic(move: Move): string {
  let notation = squareToAlgebraic(move.from) + squareToAlgebraic(move.to);
  if (move.promotion) {
    notation += move.promotion;
  }
  return notation;
}

// ============================================================
// PGN Generation
// ============================================================

export interface PGNHeaders {
  event?: string;
  site?: string;
  date?: string;
  round?: string;
  white?: string;
  black?: string;
  result?: string;
}

/**
 * Generate PGN string from game state
 */
export function generatePGN(state: GameState, headers?: PGNHeaders): string {
  const defaultHeaders: PGNHeaders = {
    event: 'Chess Game',
    site: 'Web',
    date: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
    round: '1',
    white: 'White',
    black: 'Black',
    result: getGameResult(state),
  };

  const mergedHeaders = { ...defaultHeaders, ...headers };

  // Header tags
  let pgn = '';
  pgn += `[Event "${mergedHeaders.event}"]\n`;
  pgn += `[Site "${mergedHeaders.site}"]\n`;
  pgn += `[Date "${mergedHeaders.date}"]\n`;
  pgn += `[Round "${mergedHeaders.round}"]\n`;
  pgn += `[White "${mergedHeaders.white}"]\n`;
  pgn += `[Black "${mergedHeaders.black}"]\n`;
  pgn += `[Result "${mergedHeaders.result}"]\n`;
  pgn += '\n';

  // Moves
  const moveStrings: string[] = [];
  for (let i = 0; i < state.moveHistory.length; i++) {
    const record = state.moveHistory[i];
    if (i % 2 === 0) {
      moveStrings.push(`${Math.floor(i / 2) + 1}. ${record.notation}`);
    } else {
      moveStrings.push(record.notation);
    }
  }

  // Wrap at 80 characters
  let line = '';
  for (const moveStr of moveStrings) {
    if (line.length + moveStr.length + 1 > 80) {
      pgn += line.trimEnd() + '\n';
      line = moveStr + ' ';
    } else {
      line += moveStr + ' ';
    }
  }
  pgn += line.trimEnd();

  // Result
  pgn += ' ' + mergedHeaders.result;

  return pgn;
}

/**
 * Parse PGN and extract moves as strings
 */
export function parsePGNMoves(pgn: string): { headers: PGNHeaders; moves: string[] } {
  const headers: PGNHeaders = {};
  const lines = pgn.split('\n');
  let moveText = '';
  let inHeaders = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      const match = trimmed.match(/\[(\w+)\s+"(.*)"\]/);
      if (match) {
        const key = match[1].toLowerCase() as keyof PGNHeaders;
        headers[key] = match[2];
      }
    } else if (trimmed.length > 0) {
      inHeaders = false;
      moveText += ' ' + trimmed;
    }
  }

  // Remove comments, variations, and annotations
  moveText = moveText.replace(/\{[^}]*\}/g, ''); // Remove comments
  moveText = moveText.replace(/\([^)]*\)/g, ''); // Remove variations
  moveText = moveText.replace(/\$\d+/g, ''); // Remove NAGs

  // Extract move tokens
  const tokens = moveText.trim().split(/\s+/);
  const moves: string[] = [];

  for (const token of tokens) {
    // Skip move numbers, results
    if (token.match(/^\d+\.+$/)) continue;
    if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') continue;
    // Remove move number prefix like "1."
    const cleaned = token.replace(/^\d+\./, '').trim();
    if (cleaned.length > 0) {
      moves.push(cleaned);
    }
  }

  return { headers, moves };
}

/**
 * Parse a SAN move string and find the matching legal move
 */
export function parseSANMove(state: GameState, san: string): Move | null {
  const legalMoves = generateLegalMoves(state);

  // Clean the SAN string
  let cleanSan = san.replace(/[+#!?]/g, '').trim();

  // Castling
  if (cleanSan === 'O-O' || cleanSan === '0-0') {
    return legalMoves.find(m => m.moveType === MoveType.CastleKingside) || null;
  }
  if (cleanSan === 'O-O-O' || cleanSan === '0-0-0') {
    return legalMoves.find(m => m.moveType === MoveType.CastleQueenside) || null;
  }

  // Parse promotion
  let promotion: PieceType | undefined;
  const promoMatch = cleanSan.match(/=([QRBN])/i);
  if (promoMatch) {
    const promoChar = promoMatch[1].toLowerCase();
    const promoMap: Record<string, PieceType> = {
      'q': PieceType.Queen, 'r': PieceType.Rook,
      'b': PieceType.Bishop, 'n': PieceType.Knight,
    };
    promotion = promoMap[promoChar];
    cleanSan = cleanSan.replace(/=[QRBN]/i, '');
  }

  // Remove capture marker
  const isCapture = cleanSan.includes('x');
  cleanSan = cleanSan.replace('x', '');

  // Parse piece type
  let pieceType: PieceType = PieceType.Pawn;
  if (cleanSan[0] >= 'A' && cleanSan[0] <= 'Z') {
    const pieceMap: Record<string, PieceType> = {
      'K': PieceType.King, 'Q': PieceType.Queen,
      'R': PieceType.Rook, 'B': PieceType.Bishop, 'N': PieceType.Knight,
    };
    pieceType = pieceMap[cleanSan[0]] || PieceType.Pawn;
    cleanSan = cleanSan.slice(1);
  }

  // Destination square (always the last 2 characters)
  if (cleanSan.length < 2) return null;
  const destStr = cleanSan.slice(-2);
  const destSquare = algebraicToSquare(destStr);
  if (!destSquare) return null;

  // Disambiguation (remaining characters before destination)
  const disambig = cleanSan.slice(0, -2);
  let fromFile: number | undefined;
  let fromRank: number | undefined;

  for (const char of disambig) {
    if (char >= 'a' && char <= 'h') {
      fromFile = char.charCodeAt(0) - 97;
    } else if (char >= '1' && char <= '8') {
      fromRank = 56 - char.charCodeAt(0);
    }
  }

  // Find matching move
  return legalMoves.find(m => {
    if (m.piece.type !== pieceType) return false;
    if (m.to.rank !== destSquare.rank || m.to.file !== destSquare.file) return false;
    if (promotion && m.promotion !== promotion) return false;
    if (!promotion && m.promotion) return false;
    if (fromFile !== undefined && m.from.file !== fromFile) return false;
    if (fromRank !== undefined && m.from.rank !== fromRank) return false;
    return true;
  }) || null;
}
