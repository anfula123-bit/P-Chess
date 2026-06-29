/**
 * Chess rules validation
 * Check, checkmate, stalemate, draw detection
 */

import {
  Board, Color, GameState, GameStatus, PieceType, Square,
} from './types';
import { findKing, getAllPieces, getPositionFEN } from './board';
import { isSquareAttacked, generateLegalMoves } from './moves';
import { oppositeColor } from './pieces';

// ============================================================
// Check Detection
// ============================================================

/**
 * Is the given color's king in check?
 */
export function isInCheck(board: Board, color: Color): boolean {
  const kingSquare = findKing(board, color);
  if (!kingSquare) return false;
  return isSquareAttacked(board, kingSquare, oppositeColor(color));
}

/**
 * Get the king square if it's in check, otherwise null
 */
export function getCheckSquare(board: Board, color: Color): Square | null {
  const kingSquare = findKing(board, color);
  if (!kingSquare) return null;
  if (isSquareAttacked(board, kingSquare, oppositeColor(color))) {
    return kingSquare;
  }
  return null;
}

// ============================================================
// Checkmate & Stalemate
// ============================================================

/**
 * Is the active color in checkmate?
 */
export function isCheckmate(state: GameState): boolean {
  if (!isInCheck(state.board, state.activeColor)) return false;
  return generateLegalMoves(state).length === 0;
}

/**
 * Is the active color in stalemate?
 */
export function isStalemate(state: GameState): boolean {
  if (isInCheck(state.board, state.activeColor)) return false;
  return generateLegalMoves(state).length === 0;
}

// ============================================================
// Draw Conditions
// ============================================================

/**
 * Fifty-move rule: 50 full moves (100 half-moves) without a pawn move or capture
 */
export function isFiftyMoveRule(state: GameState): boolean {
  return state.halfMoveClock >= 100;
}

/**
 * Threefold repetition: same position has occurred 3 times
 */
export function isThreefoldRepetition(state: GameState): boolean {
  const currentPosition = getPositionFEN(state);
  let count = 0;

  for (const position of state.positionHistory) {
    if (position === currentPosition) {
      count++;
      if (count >= 3) return true;
    }
  }

  return false;
}

/**
 * Insufficient material check
 * Draw if neither side can checkmate:
 * - K vs K
 * - K+B vs K
 * - K+N vs K
 * - K+B vs K+B (bishops on same color)
 */
export function isInsufficientMaterial(board: Board): boolean {
  const whitePieces = getAllPieces(board, Color.White);
  const blackPieces = getAllPieces(board, Color.Black);

  // Filter out kings
  const whiteNonKing = whitePieces.filter(p => p.piece.type !== PieceType.King);
  const blackNonKing = blackPieces.filter(p => p.piece.type !== PieceType.King);

  const whiteCount = whiteNonKing.length;
  const blackCount = blackNonKing.length;

  // K vs K
  if (whiteCount === 0 && blackCount === 0) return true;

  // K+B vs K or K+N vs K
  if (whiteCount === 0 && blackCount === 1) {
    const piece = blackNonKing[0].piece;
    if (piece.type === PieceType.Bishop || piece.type === PieceType.Knight) return true;
  }
  if (blackCount === 0 && whiteCount === 1) {
    const piece = whiteNonKing[0].piece;
    if (piece.type === PieceType.Bishop || piece.type === PieceType.Knight) return true;
  }

  // K+B vs K+B with bishops on same color squares
  if (whiteCount === 1 && blackCount === 1) {
    const whitePiece = whiteNonKing[0];
    const blackPiece = blackNonKing[0];
    if (whitePiece.piece.type === PieceType.Bishop && blackPiece.piece.type === PieceType.Bishop) {
      const whiteSquareColor = (whitePiece.square.rank + whitePiece.square.file) % 2;
      const blackSquareColor = (blackPiece.square.rank + blackPiece.square.file) % 2;
      if (whiteSquareColor === blackSquareColor) return true;
    }
  }

  return false;
}

// ============================================================
// Game Status Update
// ============================================================

/**
 * Update game status after a move
 */
export function updateGameStatus(state: GameState): GameStatus {
  // Check for checkmate
  if (isCheckmate(state)) {
    return GameStatus.Checkmate;
  }

  // Check for stalemate
  if (isStalemate(state)) {
    return GameStatus.Stalemate;
  }

  // Check for draw by fifty-move rule
  if (isFiftyMoveRule(state)) {
    return GameStatus.DrawFiftyMove;
  }

  // Check for threefold repetition
  if (isThreefoldRepetition(state)) {
    return GameStatus.DrawThreefold;
  }

  // Check for insufficient material
  if (isInsufficientMaterial(state.board)) {
    return GameStatus.DrawInsufficientMaterial;
  }

  // Check if in check
  if (isInCheck(state.board, state.activeColor)) {
    return GameStatus.Check;
  }

  return GameStatus.Active;
}

/**
 * Determine the winner from game status
 */
export function getWinner(state: GameState): Color | null {
  if (state.status === GameStatus.Checkmate) {
    return oppositeColor(state.activeColor);
  }
  if (state.status === GameStatus.Resigned) {
    return oppositeColor(state.activeColor);
  }
  return null;
}

/**
 * Is the game over?
 */
export function isGameOver(state: GameState): boolean {
  return [
    GameStatus.Checkmate,
    GameStatus.Stalemate,
    GameStatus.DrawFiftyMove,
    GameStatus.DrawThreefold,
    GameStatus.DrawInsufficientMaterial,
    GameStatus.DrawAgreement,
    GameStatus.Resigned,
  ].includes(state.status);
}

/**
 * Get human-readable game result
 */
export function getGameResult(state: GameState): string {
  switch (state.status) {
    case GameStatus.Checkmate:
      return oppositeColor(state.activeColor) === Color.White
        ? '1-0' : '0-1';
    case GameStatus.Resigned:
      return oppositeColor(state.activeColor) === Color.White
        ? '1-0' : '0-1';
    case GameStatus.Stalemate:
    case GameStatus.DrawFiftyMove:
    case GameStatus.DrawThreefold:
    case GameStatus.DrawInsufficientMaterial:
    case GameStatus.DrawAgreement:
      return '1/2-1/2';
    default:
      return '*';
  }
}

/**
 * Get human-readable status message
 */
export function getStatusMessage(state: GameState, lang: string = 'en'): string {
  const messages: Record<string, Record<GameStatus, string>> = {
    en: {
      [GameStatus.Active]: 'Game in progress',
      [GameStatus.Check]: 'Check!',
      [GameStatus.Checkmate]: 'Checkmate!',
      [GameStatus.Stalemate]: 'Stalemate — Draw',
      [GameStatus.DrawFiftyMove]: 'Draw — Fifty Move Rule',
      [GameStatus.DrawThreefold]: 'Draw — Threefold Repetition',
      [GameStatus.DrawInsufficientMaterial]: 'Draw — Insufficient Material',
      [GameStatus.DrawAgreement]: 'Draw by Agreement',
      [GameStatus.Resigned]: 'Resigned',
    },
    id: {
      [GameStatus.Active]: 'Permainan berlangsung',
      [GameStatus.Check]: 'Skak!',
      [GameStatus.Checkmate]: 'Skakmat!',
      [GameStatus.Stalemate]: 'Stalemate — Remis',
      [GameStatus.DrawFiftyMove]: 'Remis — Aturan 50 Langkah',
      [GameStatus.DrawThreefold]: 'Remis — Pengulangan Tiga Kali',
      [GameStatus.DrawInsufficientMaterial]: 'Remis — Material Tidak Cukup',
      [GameStatus.DrawAgreement]: 'Remis dengan Persetujuan',
      [GameStatus.Resigned]: 'Menyerah',
    },
  };

  return messages[lang]?.[state.status] || messages.en[state.status] || '';
}
