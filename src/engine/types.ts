/**
 * Chess Engine Core Types
 * All type definitions for the chess engine
 */

// ============================================================
// Piece & Color
// ============================================================

export enum Color {
  White = 'w',
  Black = 'b',
}

export enum PieceType {
  Pawn = 'p',
  Knight = 'n',
  Bishop = 'b',
  Rook = 'r',
  Queen = 'q',
  King = 'k',
}

export interface Piece {
  type: PieceType;
  color: Color;
}

// ============================================================
// Board
// ============================================================

/** 0-7 for both rank and file */
export type FileIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type RankIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** A square on the board represented as [rank, file] (row, col) */
export interface Square {
  rank: RankIndex;
  file: FileIndex;
}

/** Board is an 8x8 array. board[rank][file], rank 0 = rank 8 (black back row) */
export type Board = (Piece | null)[][];

// ============================================================
// Castling Rights
// ============================================================

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

// ============================================================
// Move
// ============================================================

export enum MoveType {
  Normal = 'normal',
  DoublePawn = 'double_pawn',
  EnPassant = 'en_passant',
  CastleKingside = 'castle_kingside',
  CastleQueenside = 'castle_queenside',
  Promotion = 'promotion',
}

export type PromotionPiece = PieceType.Queen | PieceType.Rook | PieceType.Bishop | PieceType.Knight;

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  captured?: Piece;
  moveType: MoveType;
  promotion?: PromotionPiece;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

// ============================================================
// Game State
// ============================================================

export enum GameStatus {
  Active = 'active',
  Check = 'check',
  Checkmate = 'checkmate',
  Stalemate = 'stalemate',
  DrawFiftyMove = 'draw_fifty_move',
  DrawThreefold = 'draw_threefold',
  DrawInsufficientMaterial = 'draw_insufficient_material',
  DrawAgreement = 'draw_agreement',
  Resigned = 'resigned',
}

export interface GameState {
  board: Board;
  activeColor: Color;
  castlingRights: CastlingRights;
  enPassantTarget: Square | null;
  halfMoveClock: number; // For fifty-move rule
  fullMoveNumber: number;
  moveHistory: MoveRecord[];
  status: GameStatus;
  positionHistory: string[]; // FEN position strings for threefold repetition
  capturedPieces: { white: Piece[]; black: Piece[] };
  zobristHash: number;
}

export interface MoveRecord {
  move: Move;
  notation: string;
  previousState: {
    castlingRights: CastlingRights;
    enPassantTarget: Square | null;
    halfMoveClock: number;
    zobristHash: number;
  };
}

// ============================================================
// Game Mode & Timer
// ============================================================

export enum GameMode {
  PvP = 'pvp',
  PvAI = 'pvai',
  AIvAI = 'aivai',
}

export enum TimerPreset {
  Blitz = 'blitz',       // 3+2
  Rapid = 'rapid',       // 10+5
  Classical = 'classical', // 30+0
  Unlimited = 'unlimited',
}

export interface TimerConfig {
  preset: TimerPreset;
  initialTime: number;   // seconds
  increment: number;     // seconds per move
}

export const TIMER_CONFIGS: Record<TimerPreset, TimerConfig> = {
  [TimerPreset.Blitz]: { preset: TimerPreset.Blitz, initialTime: 180, increment: 2 },
  [TimerPreset.Rapid]: { preset: TimerPreset.Rapid, initialTime: 600, increment: 5 },
  [TimerPreset.Classical]: { preset: TimerPreset.Classical, initialTime: 1800, increment: 0 },
  [TimerPreset.Unlimited]: { preset: TimerPreset.Unlimited, initialTime: Infinity, increment: 0 },
};

// ============================================================
// AI
// ============================================================

export enum AIDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
  Expert = 'expert',
}

export interface AIConfig {
  difficulty: AIDifficulty;
  maxDepth: number;
  timeLimit: number; // ms
  useQuiescence: boolean;
  useTranspositionTable: boolean;
  useIterativeDeepening: boolean;
}

export interface AIWorkerMessage {
  type: 'search' | 'stop' | 'init';
  gameState?: GameState;
  config?: AIConfig;
}

export interface AIWorkerResponse {
  type: 'bestmove' | 'info' | 'ready';
  move?: Move;
  evaluation?: number;
  depth?: number;
  nodes?: number;
  time?: number;
  pv?: Move[];
}

// ============================================================
// Settings
// ============================================================

export enum ThemeMode {
  Dark = 'dark',
  Light = 'light',
}

export enum BoardTheme {
  Classic = 'classic',
  Wood = 'wood',
  Blue = 'blue',
  Green = 'green',
  Purple = 'purple',
}

export enum PieceTheme {
  Standard = 'standard',
  Neo = 'neo',
}

export enum Language {
  English = 'en',
  Indonesian = 'id',
}

export interface Settings {
  themeMode: ThemeMode;
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  volume: number; // 0-1
  animationSpeed: number; // ms
  language: Language;
}

// ============================================================
// Save / Load
// ============================================================

export interface SavedGame {
  id: string;
  name: string;
  date: string;
  gameState: GameState;
  gameMode: GameMode;
  timerPreset: TimerPreset;
  aiDifficulty?: AIDifficulty;
  whiteTime?: number;
  blackTime?: number;
}

// ============================================================
// Transposition Table
// ============================================================

export enum TTFlag {
  Exact = 0,
  LowerBound = 1,
  UpperBound = 2,
}

export interface TTEntry {
  hash: number;
  depth: number;
  score: number;
  flag: TTFlag;
  bestMove?: Move;
  age: number;
}
