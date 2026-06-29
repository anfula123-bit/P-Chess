import { createInitialGameState, parseFEN, boardToFEN } from '../engine/board';
import { generateLegalMoves, getLegalMovesForSquare } from '../engine/moves';
import { Color, PieceType, MoveType, GameStatus } from '../engine/types';
import { createSquare, squaresEqual } from '../engine/board';
import { makeMove, unmakeMove, tryMakeMove } from '../engine/game';
import { isInCheck, isCheckmate, isStalemate, isInsufficientMaterial, isThreefoldRepetition } from '../engine/rules';

describe('Chess Engine Core Tests', () => {
  describe('Board Setup & FEN parsing', () => {
    test('Initial board setup has 32 pieces', () => {
      const state = createInitialGameState();
      let pieceCount = 0;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          if (state.board[r][f] !== null) pieceCount++;
        }
      }
      expect(pieceCount).toBe(32);
    });

    test('Initial FEN matches standard starting position', () => {
      const state = createInitialGameState();
      const fen = boardToFEN(state);
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    test('Parse custom FEN and serialise back', () => {
      const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
      const state = parseFEN(fen);
      expect(state.activeColor).toBe(Color.White);
      expect(state.castlingRights.whiteKingside).toBe(true);
      expect(state.enPassantTarget).toBeNull();
      expect(state.halfMoveClock).toBe(2);
      expect(state.fullMoveNumber).toBe(3);
      
      const serialized = boardToFEN(state);
      expect(serialized).toBe(fen);
    });
  });

  describe('Move Generation', () => {
    test('Pawn initial moves (double move and single move)', () => {
      const state = createInitialGameState();
      // e2 pawn is at rank 6, file 4
      const e2 = createSquare(6, 4);
      const moves = getLegalMovesForSquare(state, e2);
      expect(moves.length).toBe(2); // e3 and e4
      
      const targets = moves.map(m => `${m.to.rank},${m.to.file}`);
      expect(targets).toContain('5,4'); // e3
      expect(targets).toContain('4,4'); // e4
    });

    test('Knight can jump over pieces', () => {
      const state = createInitialGameState();
      const b1 = createSquare(7, 1);
      const moves = getLegalMovesForSquare(state, b1);
      expect(moves.length).toBe(2); // a3 and c3
    });

    test('Sliding pieces are blocked initially', () => {
      const state = createInitialGameState();
      const c1 = createSquare(7, 2); // White light-squared bishop
      const moves = getLegalMovesForSquare(state, c1);
      expect(moves.length).toBe(0); // Blocked by pawns
    });
  });

  describe('Special Moves & Rules', () => {
    test('En Passant capture', () => {
      // Setup En Passant scenario:
      // White pawn at e5 (rank 3, file 4)
      // Black pawn plays d7-d5 (rank 1 to rank 3, file 3)
      // En passant target is d6 (rank 2, file 3)
      const fen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
      const state = parseFEN(fen);
      const e5 = createSquare(3, 4);
      const moves = getLegalMovesForSquare(state, e5);
      
      const epMove = moves.find(m => m.moveType === MoveType.EnPassant);
      expect(epMove).toBeDefined();
      expect(epMove!.to).toEqual(createSquare(2, 3)); // d6
      
      // Perform en passant capture
      const newState = makeMove(state, epMove!);
      // Target square d6 should now contain White Pawn, d5 black pawn should be removed
      expect(newState.board[2][3]).toEqual({ type: PieceType.Pawn, color: Color.White });
      expect(newState.board[3][3]).toBeNull(); // Black pawn at d5 is captured
    });

    test('Castling Rights & Validation', () => {
      // Open kingside castling for White
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R w KQkq - 0 1';
      const state = parseFEN(fen);
      const e1 = createSquare(7, 4);
      const moves = getLegalMovesForSquare(state, e1);
      
      const castleKingside = moves.find(m => m.moveType === MoveType.CastleKingside);
      expect(castleKingside).toBeDefined();
      
      // Execute kingside castle
      const newState = makeMove(state, castleKingside!);
      expect(newState.board[7][6]).toEqual({ type: PieceType.King, color: Color.White }); // g1
      expect(newState.board[7][5]).toEqual({ type: PieceType.Rook, color: Color.White }); // f1
      expect(newState.castlingRights.whiteKingside).toBe(false);
      expect(newState.castlingRights.whiteQueenside).toBe(false);
    });

    test('Cannot castle out of check', () => {
      // Black rook attacks e1 (king is in check because e2 pawn is gone)
      const fen = 'rnbq1bnr/pppppppp/8/4k3/4r3/8/PPPP1PPP/RNBQK2R w KQkq - 0 1';
      const state = parseFEN(fen);
      const e1 = createSquare(7, 4);
      const moves = getLegalMovesForSquare(state, e1);
      
      const castleKingside = moves.find(m => m.moveType === MoveType.CastleKingside);
      expect(castleKingside).toBeUndefined(); // Should not be allowed
    });

    test('Pawn promotion', () => {
      // White pawn at a7 (rank 1, file 0) moves to a8 (rank 0, file 0)
      const fen = '8/P7/8/8/8/8/8/k6K w - - 0 1';
      const state = parseFEN(fen);
      const a7 = createSquare(1, 0);
      const moves = getLegalMovesForSquare(state, a7);
      
      // Since it's a promotion, we expect 4 promotional options (Queen, Rook, Bishop, Knight)
      expect(moves.length).toBe(4);
      expect(moves.every(m => m.moveType === MoveType.Promotion)).toBe(true);
      
      // Promote to Queen
      const promoToQueen = moves.find(m => m.promotion === PieceType.Queen)!;
      const newState = makeMove(state, promoToQueen);
      expect(newState.board[0][0]).toEqual({ type: PieceType.Queen, color: Color.White });
    });
  });

  describe('Game Over Conditions', () => {
    test('Fools Mate (Checkmate in 2)', () => {
      let state = createInitialGameState();
      // 1. f3 e5
      state = tryMakeMove(state, createSquare(6, 5), createSquare(5, 5))!; // f3
      state = tryMakeMove(state, createSquare(1, 4), createSquare(3, 4))!; // e5
      // 2. g4 Qh4#
      state = tryMakeMove(state, createSquare(6, 6), createSquare(4, 6))!; // g4
      state = tryMakeMove(state, createSquare(0, 3), createSquare(4, 7))!; // Qh4
      
      expect(isInCheck(state.board, state.activeColor)).toBe(true);
      expect(isCheckmate(state)).toBe(true);
      expect(state.status).toBe(GameStatus.Checkmate);
    });

    test('Scholar Mate', () => {
      let state = createInitialGameState();
      // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
      state = tryMakeMove(state, createSquare(6, 4), createSquare(4, 4))!; // e4
      state = tryMakeMove(state, createSquare(1, 4), createSquare(3, 4))!; // e5
      state = tryMakeMove(state, createSquare(7, 5), createSquare(4, 2))!; // Bc4
      state = tryMakeMove(state, createSquare(0, 1), createSquare(2, 2))!; // Nc6
      state = tryMakeMove(state, createSquare(7, 3), createSquare(3, 7))!; // Qh5
      state = tryMakeMove(state, createSquare(0, 6), createSquare(2, 5))!; // Nf6
      state = tryMakeMove(state, createSquare(3, 7), createSquare(1, 5))!; // Qxf7#
      
      expect(isCheckmate(state)).toBe(true);
    });

    test('Stalemate', () => {
      // Classic stalemate position with White to move
      const fen = 'k7/8/8/8/8/8/8/1Q5K b - - 0 1';
      let state = parseFEN(fen);
      // Black king is at a8 (rank 0, file 0), White queen at b1 (rank 7, file 1)
      // Let's place queen at b6 to stalemate black king at a8
      // Play Qb6
      state = tryMakeMove(parseFEN('k7/8/8/8/8/8/1Q6/7K w - - 0 1'), createSquare(6, 1), createSquare(2, 1))!;
      
      expect(isInCheck(state.board, state.activeColor)).toBe(false);
      expect(isStalemate(state)).toBe(true);
      expect(state.status).toBe(GameStatus.Stalemate);
    });

    test('Insufficient Material detection', () => {
      // King vs King
      expect(isInsufficientMaterial(parseFEN('k7/8/8/8/8/8/8/7K w - - 0 1').board)).toBe(true);
      
      // King + Bishop vs King
      expect(isInsufficientMaterial(parseFEN('k7/8/8/8/8/8/8/6BK w - - 0 1').board)).toBe(true);
      
      // King + Knight vs King
      expect(isInsufficientMaterial(parseFEN('k7/8/8/8/8/8/8/6NK w - - 0 1').board)).toBe(true);
      
      // King + Pawn vs King (not insufficient material)
      expect(isInsufficientMaterial(parseFEN('k7/8/8/8/8/8/8/6PK w - - 0 1').board)).toBe(false);
    });
  });

  describe('Undo & Redo state recovery', () => {
    test('Make move, undo move, state matches previous', () => {
      const state = createInitialGameState();
      const e2e4 = getLegalMovesForSquare(state, createSquare(6, 4)).find(m => m.to.rank === 4)!;
      
      const intermediateState = makeMove(state, e2e4);
      expect(boardToFEN(intermediateState)).not.toBe(boardToFEN(state));
      
      const undoneState = unmakeMove(intermediateState);
      expect(undoneState).not.toBeNull();
      expect(boardToFEN(undoneState!)).toBe(boardToFEN(state));
    });
  });
});
