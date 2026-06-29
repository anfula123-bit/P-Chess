/**
 * Game state machine
 * Handles making/unmaking moves and maintaining game state
 */

import {
  Color, GameState, GameStatus, Move, MoveRecord, MoveType,
  PieceType, Square, CastlingRights,
} from './types';
import {
  cloneBoard, createInitialGameState, createSquare, getPiece,
  getPositionFEN, setPiece, findKing,
} from './board';
import { oppositeColor } from './pieces';
import { updateGameStatus, isInCheck } from './rules';
import { isSquareAttacked, generateLegalMoves, isLegalMoveAvailable } from './moves';
import {
  computeZobristHash, hashTogglePiece, hashToggleSide,
  hashToggleCastling, hashToggleEnPassant,
} from './zobrist';
import { moveToAlgebraic } from './notation';

// ============================================================
// Game State Operations
// ============================================================

/**
 * Create a deep clone of game state
 */
export function cloneGameState(state: GameState): GameState {
  return {
    board: cloneBoard(state.board),
    activeColor: state.activeColor,
    castlingRights: { ...state.castlingRights },
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    halfMoveClock: state.halfMoveClock,
    fullMoveNumber: state.fullMoveNumber,
    moveHistory: [...state.moveHistory],
    status: state.status,
    positionHistory: [...state.positionHistory],
    capturedPieces: {
      white: [...state.capturedPieces.white],
      black: [...state.capturedPieces.black],
    },
    zobristHash: state.zobristHash,
    commanders: {
      w: { ...state.commanders.w },
      b: { ...state.commanders.b },
    },
    divineShieldSquare: state.divineShieldSquare ? { ...state.divineShieldSquare } : null,
    slowedPieces: state.slowedPieces.map(s => ({ ...s })),
    doubleStepPiece: state.doubleStepPiece ? { ...state.doubleStepPiece } : null,
    doubleStepMovesLeft: state.doubleStepMovesLeft,
  };
}

/**
 * Initialize Zobrist hash for a game state
 */
export function initializeHash(state: GameState): GameState {
  state.zobristHash = computeZobristHash(
    state.board,
    state.activeColor,
    state.castlingRights,
    state.enPassantTarget,
  );
  return state;
}

// ============================================================
// Make Move
// ============================================================

/**
 * Apply a move to the game state. Returns a new game state.
 * The move MUST be a legal move.
 */
export function makeMove(state: GameState, move: Move): GameState {
  const newState = cloneGameState(state);

  // Save previous state for undo
  const previousState = {
    castlingRights: { ...state.castlingRights },
    enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null,
    halfMoveClock: state.halfMoveClock,
    zobristHash: state.zobristHash,
  };

  let hash = state.zobristHash;

  // Remove piece from source
  hash = hashTogglePiece(hash, move.from.rank, move.from.file, move.piece.type, move.piece.color);
  setPiece(newState.board, move.from, null);

  // Handle capture
  if (move.captured) {
    if (move.moveType === MoveType.EnPassant) {
      // En passant: captured pawn is on the same rank as the moving pawn
      const capturedRank = move.from.rank;
      hash = hashTogglePiece(hash, capturedRank, move.to.file, PieceType.Pawn, move.captured.color);
      setPiece(newState.board, createSquare(capturedRank, move.to.file), null);
    } else {
      hash = hashTogglePiece(hash, move.to.rank, move.to.file, move.captured.type, move.captured.color);
    }

    // Track captured pieces
    if (move.captured.color === Color.White) {
      newState.capturedPieces.white.push(move.captured);
    } else {
      newState.capturedPieces.black.push(move.captured);
    }
  }

  // Place piece at destination
  if (move.moveType === MoveType.Promotion && move.promotion) {
    const promotedPiece = { type: move.promotion, color: move.piece.color };
    setPiece(newState.board, move.to, promotedPiece);
    hash = hashTogglePiece(hash, move.to.rank, move.to.file, move.promotion, move.piece.color);
  } else {
    setPiece(newState.board, move.to, move.piece);
    hash = hashTogglePiece(hash, move.to.rank, move.to.file, move.piece.type, move.piece.color);
  }

  // Handle castling — move the rook
  if (move.moveType === MoveType.CastleKingside) {
    const rank = move.from.rank;
    hash = hashTogglePiece(hash, rank, 7, PieceType.Rook, move.piece.color);
    hash = hashTogglePiece(hash, rank, 5, PieceType.Rook, move.piece.color);
    setPiece(newState.board, createSquare(rank, 7), null);
    setPiece(newState.board, createSquare(rank, 5), { type: PieceType.Rook, color: move.piece.color });
  }
  if (move.moveType === MoveType.CastleQueenside) {
    const rank = move.from.rank;
    hash = hashTogglePiece(hash, rank, 0, PieceType.Rook, move.piece.color);
    hash = hashTogglePiece(hash, rank, 3, PieceType.Rook, move.piece.color);
    setPiece(newState.board, createSquare(rank, 0), null);
    setPiece(newState.board, createSquare(rank, 3), { type: PieceType.Rook, color: move.piece.color });
  }

  // Update en passant target
  if (state.enPassantTarget) {
    hash = hashToggleEnPassant(hash, state.enPassantTarget.file);
  }

  if (move.moveType === MoveType.DoublePawn) {
    const epRank = move.piece.color === Color.White ? move.to.rank + 1 : move.to.rank - 1;
    newState.enPassantTarget = createSquare(epRank, move.to.file);
    hash = hashToggleEnPassant(hash, move.to.file);
  } else {
    newState.enPassantTarget = null;
  }

  // Update castling rights
  const oldRights = newState.castlingRights;
  updateCastlingRights(newState.castlingRights, move);
  // XOR changes in castling rights
  if (oldRights.whiteKingside !== newState.castlingRights.whiteKingside) hash = hashToggleCastling(hash, 0);
  if (oldRights.whiteQueenside !== newState.castlingRights.whiteQueenside) hash = hashToggleCastling(hash, 1);
  if (oldRights.blackKingside !== newState.castlingRights.blackKingside) hash = hashToggleCastling(hash, 2);
  if (oldRights.blackQueenside !== newState.castlingRights.blackQueenside) hash = hashToggleCastling(hash, 3);

  // Update half-move clock
  if (move.piece.type === PieceType.Pawn || move.captured) {
    newState.halfMoveClock = 0;
  } else {
    newState.halfMoveClock++;
  }

  // Update full-move number
  if (state.activeColor === Color.Black) {
    newState.fullMoveNumber++;
  }

  // ============================================================
  // Chess Commander Mechanics (Passives & Turn Logic)
  // ============================================================
  
  // Vandoria Passive: Momentum (+1 energy on capture)
  if (move.captured && newState.commanders[state.activeColor].type === 'Vandoria') {
    newState.commanders[state.activeColor].energy = Math.min(10, newState.commanders[state.activeColor].energy + 1);
  }

  // Valeria Passive: Guardian Aura (slow capturer of piece adjacent to King)
  if (move.captured) {
    const defenderColor = oppositeColor(state.activeColor);
    if (newState.commanders[defenderColor].type === 'Valeria') {
      const kingSquare = findKing(newState.board, defenderColor);
      if (kingSquare) {
        const isAdjacentToKing = Math.abs(move.to.rank - kingSquare.rank) <= 1 && 
                                 Math.abs(move.to.file - kingSquare.file) <= 1;
        if (isAdjacentToKing) {
          newState.slowedPieces.push({ ...move.to });
        }
      }
    }
  }

  // Track Divine Shield movement if the shielded piece moves
  if (state.divineShieldSquare && 
      state.divineShieldSquare.rank === move.from.rank && 
      state.divineShieldSquare.file === move.from.file) {
    newState.divineShieldSquare = { ...move.to };
  }

  // Handle Double Step states
  let shouldToggleSide = true;

  if (state.doubleStepMovesLeft === 2) {
    // This is the first step of a double step
    shouldToggleSide = false;
    newState.doubleStepPiece = { ...move.to };
    newState.doubleStepMovesLeft = 1;
  } else if (state.doubleStepMovesLeft === 1) {
    // This is the second step of a double step
    newState.doubleStepPiece = null;
    newState.doubleStepMovesLeft = 0;
  }

  if (shouldToggleSide) {
    // Toggle side
    hash = hashToggleSide(hash);
    newState.activeColor = oppositeColor(state.activeColor);
    newState.zobristHash = hash;

    // Start of new turn triggers:
    const nextColor = newState.activeColor;
    
    // 1. Recover energy (+1 per turn)
    newState.commanders[nextColor].energy = Math.min(10, newState.commanders[nextColor].energy + 1);
    
    // Reset skill usage for the turn
    newState.commanders[nextColor].skillUsedThisTurn = false;

    // 2. Clear Divine Shield for Valeria owner at start of their turn
    if (newState.commanders[nextColor].type === 'Valeria') {
      newState.divineShieldSquare = null;
    }

    // 3. Remove Slow effects from pieces belonging to the player whose turn it now is
    newState.slowedPieces = newState.slowedPieces.filter(sq => {
      const piece = getPiece(newState.board, sq);
      return piece && piece.color !== nextColor;
    });
  } else {
    newState.zobristHash = hash;
  }

  // Generate notation
  const notation = moveToAlgebraic(state, move);

  // Add check/checkmate markers to notation
  const isCheck = isInCheck(newState.board, newState.activeColor);
  const legalMoves = generateLegalMoves(newState);
  const isCheckmateNow = isCheck && legalMoves.length === 0;

  let notationWithCheck = notation;
  if (isCheckmateNow) {
    notationWithCheck += '#';
    move.isCheckmate = true;
  } else if (isCheck) {
    notationWithCheck += '+';
    move.isCheck = true;
  }

  // Record move
  const record: MoveRecord = {
    move: { ...move },
    notation: notationWithCheck,
    previousState,
  };
  newState.moveHistory.push(record);

  // Track position for repetition
  const positionFEN = getPositionFEN(newState);
  newState.positionHistory.push(positionFEN);

  // Update game status
  newState.status = updateGameStatus(newState);

  return newState;
}

// ============================================================
// Unmake Move (Undo)
// ============================================================

/**
 * Undo the last move. Returns the previous game state.
 */
export function unmakeMove(state: GameState): GameState | null {
  if (state.moveHistory.length === 0) return null;

  const newState = cloneGameState(state);
  const record = newState.moveHistory.pop()!;
  const move = record.move;

  // Restore position history
  newState.positionHistory.pop();

  // Remove piece from destination
  setPiece(newState.board, move.to, null);

  // Place piece back at source
  setPiece(newState.board, move.from, move.piece);

  // Restore captured piece
  if (move.captured) {
    if (move.moveType === MoveType.EnPassant) {
      // Restore the captured pawn
      const capturedRank = move.from.rank;
      setPiece(newState.board, createSquare(capturedRank, move.to.file), move.captured);
    } else {
      setPiece(newState.board, move.to, move.captured);
    }

    // Remove from captured pieces list
    if (move.captured.color === Color.White) {
      newState.capturedPieces.white.pop();
    } else {
      newState.capturedPieces.black.pop();
    }
  }

  // Undo castling — move the rook back
  if (move.moveType === MoveType.CastleKingside) {
    const rank = move.from.rank;
    setPiece(newState.board, createSquare(rank, 5), null);
    setPiece(newState.board, createSquare(rank, 7), { type: PieceType.Rook, color: move.piece.color });
  }
  if (move.moveType === MoveType.CastleQueenside) {
    const rank = move.from.rank;
    setPiece(newState.board, createSquare(rank, 3), null);
    setPiece(newState.board, createSquare(rank, 0), { type: PieceType.Rook, color: move.piece.color });
  }

  // Restore previous state
  newState.castlingRights = { ...record.previousState.castlingRights };
  newState.enPassantTarget = record.previousState.enPassantTarget
    ? { ...record.previousState.enPassantTarget }
    : null;
  newState.halfMoveClock = record.previousState.halfMoveClock;
  newState.zobristHash = record.previousState.zobristHash;

  // Restore active color
  newState.activeColor = move.piece.color;

  // Restore full move number
  if (move.piece.color === Color.Black) {
    newState.fullMoveNumber--;
  }

  // Update status
  newState.status = updateGameStatus(newState);

  return newState;
}

// ============================================================
// Castling Rights Update
// ============================================================

function updateCastlingRights(rights: CastlingRights, move: Move): void {
  const { piece, from, to } = move;

  // King moved → lose both castling rights
  if (piece.type === PieceType.King) {
    if (piece.color === Color.White) {
      rights.whiteKingside = false;
      rights.whiteQueenside = false;
    } else {
      rights.blackKingside = false;
      rights.blackQueenside = false;
    }
  }

  // Rook moved → lose that side's castling right
  if (piece.type === PieceType.Rook) {
    if (piece.color === Color.White) {
      if (from.rank === 7 && from.file === 7) rights.whiteKingside = false;
      if (from.rank === 7 && from.file === 0) rights.whiteQueenside = false;
    } else {
      if (from.rank === 0 && from.file === 7) rights.blackKingside = false;
      if (from.rank === 0 && from.file === 0) rights.blackQueenside = false;
    }
  }

  // Rook captured → opponent loses that side's castling right
  if (move.captured && move.captured.type === PieceType.Rook) {
    if (to.rank === 0 && to.file === 7) rights.blackKingside = false;
    if (to.rank === 0 && to.file === 0) rights.blackQueenside = false;
    if (to.rank === 7 && to.file === 7) rights.whiteKingside = false;
    if (to.rank === 7 && to.file === 0) rights.whiteQueenside = false;
  }
}

// ============================================================
// Game Operations
// ============================================================

/**
 * Start a new game
 */
export function newGame(): GameState {
  const state = createInitialGameState();
  return initializeHash(state);
}

/**
 * Try to make a move. Returns the new state if legal, or null if illegal.
 */
export function tryMakeMove(
  state: GameState, fromSquare: Square, toSquare: Square, promotion?: PieceType
): GameState | null {
  const legalMove = isLegalMoveAvailable(state, fromSquare, toSquare, promotion as any);
  if (!legalMove) return null;
  return makeMove(state, legalMove);
}

/**
 * Resign the game
 */
export function resign(state: GameState): GameState {
  const newState = cloneGameState(state);
  newState.status = GameStatus.Resigned;
  return newState;
}

/**
 * Agree to a draw
 */
export function agreeToDraw(state: GameState): GameState {
  const newState = cloneGameState(state);
  newState.status = GameStatus.DrawAgreement;
  return newState;
}
