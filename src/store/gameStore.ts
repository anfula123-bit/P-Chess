/**
 * Game Store — Zustand
 * Central game state management
 */

import { create } from 'zustand';
import {
  GameState, GameMode, GameStatus, Move, Square, Color,
  AIDifficulty, TimerPreset, PieceType, PromotionPiece, CommanderType,
} from '../engine/types';
import {
  newGame, makeMove, unmakeMove, resign, agreeToDraw,
  cloneGameState, tryMakeMove, initializeHash,
} from '../engine/game';
import { generateLegalMoves, getLegalMovesForSquare, isLegalMoveAvailable } from '../engine/moves';
import { isGameOver, getWinner } from '../engine/rules';
import { parseFEN, boardToFEN, getPositionFEN, getPiece } from '../engine/board';
import { parseSANMove, generatePGN, parsePGNMoves } from '../engine/notation';

// ============================================================
// Store Types
// ============================================================

interface PendingPromotion {
  from: Square;
  to: Square;
}

interface GameStore {
  // Game state
  gameState: GameState;
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  playerColor: Color; // For PvAI mode

  // UI state
  selectedSquare: Square | null;
  legalMovesForSelected: Move[];
  lastMove: Move | null;
  isFlipped: boolean;
  isAIThinking: boolean;
  pendingPromotion: PendingPromotion | null;

  // Undo/Redo
  undoStack: GameState[];
  redoStack: GameState[];

  // Timer
  timerPreset: TimerPreset;

  // View state
  view: 'home' | 'game';
  isSelectingShield: boolean;
  setSelectingShield: (val: boolean) => void;
  setView: (view: 'home' | 'game') => void;

  // Online Multiplayer State
  isOnline: boolean;
  myColor: Color | null;
  roomCode: string | null;
  opponentName: string;
  broadcastAction: ((actionType: string, payload: any) => void) | null;
  setBroadcastAction: (cb: ((actionType: string, payload: any) => void) | null) => void;
  setupOnlineMatch: (
    roomCode: string, 
    color: Color, 
    whiteCommander?: CommanderType | null,
    blackCommander?: CommanderType | null,
    timerPreset?: TimerPreset
  ) => void;
  receiveOpponentMove: (from: Square, to: Square, promotion?: PromotionPiece) => void;
  receiveOpponentSkill: (targetSquare?: Square) => void;
  receiveOpponentEndDoubleStep: () => void;
  receiveOpponentResign: () => void;

  // Actions
  startNewGame: (
    mode: GameMode, 
    difficulty?: AIDifficulty, 
    playerColor?: Color, 
    timerPreset?: TimerPreset,
    whiteCommander?: CommanderType | null,
    blackCommander?: CommanderType | null
  ) => void;
  activateActiveSkill: (targetSquare?: Square, isLocal?: boolean) => void;
  endDoubleStepEarly: (isLocal?: boolean) => void;
  selectSquare: (square: Square) => void;
  clearSelection: () => void;
  makePlayerMove: (from: Square, to: Square, promotion?: PromotionPiece, isLocal?: boolean) => boolean;
  handlePromotion: (promotionPiece: PromotionPiece) => void;
  cancelPromotion: () => void;
  makeAIMove: (move: Move) => void;
  setAIThinking: (thinking: boolean) => void;
  undo: () => void;
  redo: () => void;
  flipBoard: () => void;
  resignGame: (isLocal?: boolean) => void;
  offerDraw: () => void;
  loadFEN: (fen: string) => void;
  loadPGN: (pgn: string) => boolean;
  getFEN: () => string;
  getPGN: () => string;
  getGameState: () => GameState;
}

// ============================================================
// Store Implementation
// ============================================================

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  gameState: newGame(),
  gameMode: GameMode.PvP,
  aiDifficulty: AIDifficulty.Medium,
  playerColor: Color.White,
  selectedSquare: null,
  legalMovesForSelected: [],
  lastMove: null,
  isFlipped: false,
  isAIThinking: false,
  pendingPromotion: null,
  undoStack: [],
  redoStack: [],
  timerPreset: TimerPreset.Rapid,
  view: 'home',
  isSelectingShield: false,
  isOnline: false,
  myColor: null,
  roomCode: null,
  opponentName: 'Opponent',
  broadcastAction: null,

  setView: (view) => set({ view }),
  setSelectingShield: (val) => set({ isSelectingShield: val }),
  setBroadcastAction: (cb) => set({ broadcastAction: cb }),

  // ============================================================
  // Game Lifecycle
  // ============================================================

  startNewGame: (
    mode, 
    difficulty = AIDifficulty.Medium, 
    playerColor = Color.White, 
    timerPreset = TimerPreset.Rapid,
    whiteCommander = null,
    blackCommander = null
  ) => {
    const freshGame = newGame();
    freshGame.commanders = {
      w: { type: whiteCommander, energy: 3, skillUsedThisTurn: false },
      b: { type: blackCommander, energy: 3, skillUsedThisTurn: false },
    };
    
    set({
      gameState: freshGame,
      gameMode: mode,
      aiDifficulty: difficulty,
      playerColor,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: null,
      isAIThinking: false,
      pendingPromotion: null,
      undoStack: [],
      redoStack: [],
      timerPreset,
      view: 'game',
      isOnline: false,
      myColor: null,
      roomCode: null,
    });
  },

  setupOnlineMatch: (roomCode, color, whiteCommander = null, blackCommander = null, timerPreset = TimerPreset.Rapid) => {
    const freshGame = newGame();
    freshGame.commanders = {
      w: { type: whiteCommander, energy: 3, skillUsedThisTurn: false },
      b: { type: blackCommander, energy: 3, skillUsedThisTurn: false },
    };

    set({
      gameState: freshGame,
      gameMode: GameMode.PvP,
      playerColor: color,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: null,
      isAIThinking: false,
      pendingPromotion: null,
      undoStack: [],
      redoStack: [],
      timerPreset,
      view: 'game',
      isOnline: true,
      myColor: color,
      roomCode: roomCode,
      opponentName: 'Player 2',
      isFlipped: color === Color.Black,
    });
  },

  receiveOpponentMove: (from, to, promotion) => {
    get().makePlayerMove(from, to, promotion, false);
  },

  receiveOpponentSkill: (targetSquare) => {
    get().activateActiveSkill(targetSquare, false);
  },

  receiveOpponentEndDoubleStep: () => {
    get().endDoubleStepEarly(false);
  },

  receiveOpponentResign: () => {
    get().resignGame(false);
  },

  activateActiveSkill: (targetSquare, isLocal = true) => {
    const { gameState, isOnline, myColor, broadcastAction } = get();
    const color = gameState.activeColor;
    
    if (isOnline && isLocal && color !== myColor) return;

    const comm = gameState.commanders[color];
    if (!comm.type || comm.energy < 4 || comm.skillUsedThisTurn) return;

    const newState = cloneGameState(gameState);
    newState.commanders[color].skillUsedThisTurn = true;
    newState.commanders[color].energy -= 4;

    if (comm.type === CommanderType.Vandoria) {
      newState.doubleStepMovesLeft = 2;
      newState.doubleStepPiece = null;
    } else if (comm.type === CommanderType.Valeria && targetSquare) {
      newState.divineShieldSquare = targetSquare;
    }

    set({
      gameState: newState,
      selectedSquare: null,
      legalMovesForSelected: [],
    });

    if (isOnline && isLocal && broadcastAction) {
      broadcastAction('SKILL', { targetSquare });
    }
  },

  endDoubleStepEarly: (isLocal = true) => {
    const { gameState, undoStack, isOnline, myColor, broadcastAction } = get();
    if (gameState.doubleStepMovesLeft === 0) return;
    if (isOnline && isLocal && gameState.activeColor !== myColor) return;

    const newState = cloneGameState(gameState);
    newState.doubleStepPiece = null;
    newState.doubleStepMovesLeft = 0;

    // Toggle active player color
    newState.activeColor = newState.activeColor === Color.White ? Color.Black : Color.White;
    
    // Start of new turn triggers:
    const nextColor = newState.activeColor;
    newState.commanders[nextColor].energy = Math.min(10, newState.commanders[nextColor].energy + 1);
    newState.commanders[nextColor].skillUsedThisTurn = false;

    if (newState.commanders[nextColor].type === CommanderType.Valeria) {
      newState.divineShieldSquare = null;
    }

    newState.slowedPieces = newState.slowedPieces.filter(sq => {
      const piece = getPiece(newState.board, sq);
      return piece && piece.color !== nextColor;
    });

    set({
      gameState: newState,
      selectedSquare: null,
      legalMovesForSelected: [],
      undoStack: [...undoStack, gameState],
    });

    if (isOnline && isLocal && broadcastAction) {
      broadcastAction('END_DOUBLE_STEP', {});
    }
  },

  // ============================================================
  // Square Selection
  // ============================================================

  selectSquare: (square: Square) => {
    const { gameState, selectedSquare, gameMode, playerColor, isAIThinking, pendingPromotion, isSelectingShield, activateActiveSkill, isOnline, myColor } = get();

    if (isSelectingShield) {
      const piece = getPiece(gameState.board, square);
      if (piece && piece.color === gameState.activeColor) {
        activateActiveSkill(square);
      }
      set({ isSelectingShield: false });
      return;
    }

    // Don't allow selection during promotion dialog or AI thinking
    if (pendingPromotion || isAIThinking) return;

    // Don't allow selection if game is over
    if (isGameOver(gameState)) return;

    // In Online mode, only allow selection when it's our turn
    if (isOnline && gameState.activeColor !== myColor) return;

    // In PvAI mode, only allow selection when it's the player's turn
    if (gameMode === GameMode.PvAI && gameState.activeColor !== playerColor) return;

    // In AIvAI mode, don't allow any selection
    if (gameMode === GameMode.AIvAI) return;

    const piece = gameState.board[square.rank][square.file];

    // If a piece is already selected, try to move
    if (selectedSquare) {
      const from = selectedSquare;
      const to = square;

      // Clicking on the same square — deselect
      if (from.rank === to.rank && from.file === to.file) {
        set({ selectedSquare: null, legalMovesForSelected: [] });
        return;
      }

      // Clicking on own piece — reselect
      if (piece && piece.color === gameState.activeColor) {
        const moves = getLegalMovesForSquare(gameState, square);
        set({ selectedSquare: square, legalMovesForSelected: moves });
        return;
      }

      // Try to move
      const legalMove = isLegalMoveAvailable(gameState, from, to);
      if (legalMove) {
        // Check if this is a promotion move
        if (legalMove.piece.type === PieceType.Pawn) {
          const promotionRank = legalMove.piece.color === Color.White ? 0 : 7;
          if (to.rank === promotionRank) {
            // Show promotion dialog
            set({ pendingPromotion: { from, to } });
            return;
          }
        }

        // Make the move
        get().makePlayerMove(from, to);
      } else {
        // Invalid move — deselect
        set({ selectedSquare: null, legalMovesForSelected: [] });
      }
      return;
    }

    // No piece selected yet — select if it's our piece
    if (piece && piece.color === gameState.activeColor) {
      const moves = getLegalMovesForSquare(gameState, square);
      set({ selectedSquare: square, legalMovesForSelected: moves });
    }
  },

  clearSelection: () => {
    set({ selectedSquare: null, legalMovesForSelected: [] });
  },

  // ============================================================
  // Move Execution
  // ============================================================

  makePlayerMove: (from, to, promotion?, isLocal = true) => {
    const { gameState, undoStack, isOnline, myColor, broadcastAction } = get();

    if (isOnline && isLocal && gameState.activeColor !== myColor) {
      return false;
    }

    const newState = tryMakeMove(gameState, from, to, promotion);
    if (!newState) return false;

    const lastMoveRecord = newState.moveHistory[newState.moveHistory.length - 1];

    set({
      gameState: newState,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: lastMoveRecord?.move || null,
      undoStack: [...undoStack, gameState],
      redoStack: [],
      pendingPromotion: null,
    });

    if (isOnline && isLocal && broadcastAction) {
      broadcastAction('MOVE', { from, to, promotion });
    }

    return true;
  },

  handlePromotion: (promotionPiece) => {
    const { pendingPromotion } = get();
    if (!pendingPromotion) return;

    get().makePlayerMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
  },

  cancelPromotion: () => {
    set({ pendingPromotion: null, selectedSquare: null, legalMovesForSelected: [] });
  },

  makeAIMove: (move) => {
    const { gameState, undoStack } = get();

    const newState = makeMove(gameState, move);
    const lastMoveRecord = newState.moveHistory[newState.moveHistory.length - 1];

    set({
      gameState: newState,
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove: lastMoveRecord?.move || null,
      undoStack: [...undoStack, gameState],
      redoStack: [],
      isAIThinking: false,
    });
  },

  setAIThinking: (thinking) => {
    set({ isAIThinking: thinking });
  },

  // ============================================================
  // Undo / Redo
  // ============================================================

  undo: () => {
    const { undoStack, gameState, redoStack } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const lastMove = previousState.moveHistory.length > 0
      ? previousState.moveHistory[previousState.moveHistory.length - 1].move
      : null;

    set({
      gameState: previousState,
      undoStack: newUndoStack,
      redoStack: [...redoStack, gameState],
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove,
      isAIThinking: false,
    });
  },

  redo: () => {
    const { redoStack, gameState, undoStack } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const lastMove = nextState.moveHistory.length > 0
      ? nextState.moveHistory[nextState.moveHistory.length - 1].move
      : null;

    set({
      gameState: nextState,
      redoStack: newRedoStack,
      undoStack: [...undoStack, gameState],
      selectedSquare: null,
      legalMovesForSelected: [],
      lastMove,
    });
  },

  // ============================================================
  // Board / Game Controls
  // ============================================================

  flipBoard: () => {
    set(state => ({ isFlipped: !state.isFlipped }));
  },

  resignGame: (isLocal = true) => {
    const { gameState, isOnline, broadcastAction } = get();
    set({ gameState: resign(gameState) });

    if (isOnline && isLocal && broadcastAction) {
      broadcastAction('RESIGN', {});
    }
  },

  offerDraw: () => {
    const { gameState } = get();
    set({ gameState: agreeToDraw(gameState) });
  },

  // ============================================================
  // Import / Export
  // ============================================================

  loadFEN: (fen) => {
    try {
      const parsed = parseFEN(fen);
      const state = initializeHash(parsed);
      state.positionHistory.push(getPositionFEN(state));
      set({
        gameState: state,
        selectedSquare: null,
        legalMovesForSelected: [],
        lastMove: null,
        undoStack: [],
        redoStack: [],
      });
    } catch (e) {
      console.error('Invalid FEN:', e);
    }
  },

  loadPGN: (pgn) => {
    try {
      const { moves } = parsePGNMoves(pgn);
      let state = newGame();

      for (const moveStr of moves) {
        const move = parseSANMove(state, moveStr);
        if (!move) {
          console.error(`Invalid PGN move: ${moveStr}`);
          return false;
        }
        state = makeMove(state, move);
      }

      set({
        gameState: state,
        selectedSquare: null,
        legalMovesForSelected: [],
        lastMove: state.moveHistory.length > 0
          ? state.moveHistory[state.moveHistory.length - 1].move
          : null,
        undoStack: [],
        redoStack: [],
      });
      return true;
    } catch (e) {
      console.error('Invalid PGN:', e);
      return false;
    }
  },

  getFEN: () => {
    return boardToFEN(get().gameState);
  },

  getPGN: () => {
    return generatePGN(get().gameState);
  },

  getGameState: () => {
    return get().gameState;
  },
}));
