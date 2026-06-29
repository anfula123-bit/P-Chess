/**
 * Board Component
 * Main chess board with interactive squares and piece rendering
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { Color, PieceType, PromotionPiece, Move } from '../../engine/types';
import { createSquare } from '../../engine/board';
import { getCheckSquare } from '../../engine/rules';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSound } from '../../hooks/useSound';
import SquareComponent from './Square';
import PieceSVG from './PieceSVG';
import styles from './board.module.css';

export default function Board() {
  const gameState = useGameStore(s => s.gameState);
  const selectedSquare = useGameStore(s => s.selectedSquare);
  const legalMovesForSelected = useGameStore(s => s.legalMovesForSelected);
  const lastMove = useGameStore(s => s.lastMove);
  const isFlipped = useGameStore(s => s.isFlipped);
  const isAIThinking = useGameStore(s => s.isAIThinking);
  const pendingPromotion = useGameStore(s => s.pendingPromotion);
  const selectSquare = useGameStore(s => s.selectSquare);
  const handlePromotion = useGameStore(s => s.handlePromotion);
  const cancelPromotion = useGameStore(s => s.cancelPromotion);

  const animationSpeed = useSettingsStore(s => s.animationSpeed);
  const { playMoveSound, playSound } = useSound();

  // Check detection
  const checkSquare = useMemo(() =>
    getCheckSquare(gameState.board, gameState.activeColor),
    [gameState.board, gameState.activeColor]
  );

  // Legal move targets for current selection
  const legalMoveTargets = useMemo(() => {
    const moves = new Set<string>();
    const captures = new Set<string>();
    for (const move of legalMovesForSelected) {
      const key = `${move.to.rank},${move.to.file}`;
      if (move.captured) {
        captures.add(key);
      } else {
        moves.add(key);
      }
    }
    return { moves, captures };
  }, [legalMovesForSelected]);

  // Handle square click
  const handleSquareClick = useCallback((rank: number, file: number) => {
    const prevState = useGameStore.getState();
    selectSquare(createSquare(rank, file));

    // After state update, check if a move was made
    const newState = useGameStore.getState();
    if (newState.gameState !== prevState.gameState && newState.lastMove) {
      playMoveSound(newState.lastMove, newState.gameState.status);
    }
  }, [selectSquare, playMoveSound]);

  // Handle promotion choice
  const onPromotion = useCallback((piece: PromotionPiece) => {
    handlePromotion(piece);
    const newState = useGameStore.getState();
    if (newState.lastMove) {
      playMoveSound(newState.lastMove, newState.gameState.status);
    }
  }, [handlePromotion, playMoveSound]);

  // Render squares
  const renderBoard = useMemo(() => {
    const squares = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const displayRank = isFlipped ? 7 - rank : rank;
        const displayFile = isFlipped ? 7 - file : file;
        const piece = gameState.board[displayRank][displayFile];
        const moveKey = `${displayRank},${displayFile}`;

        const isSelected = selectedSquare
          ? selectedSquare.rank === displayRank && selectedSquare.file === displayFile
          : false;

        const isLegalMove = legalMoveTargets.moves.has(moveKey) || legalMoveTargets.captures.has(moveKey);
        const isLegalCapture = legalMoveTargets.captures.has(moveKey);

        const isLastMoveFrom = lastMove
          ? lastMove.from.rank === displayRank && lastMove.from.file === displayFile
          : false;
        const isLastMoveTo = lastMove
          ? lastMove.to.rank === displayRank && lastMove.to.file === displayFile
          : false;

        const isCheck = checkSquare
          ? checkSquare.rank === displayRank && checkSquare.file === displayFile
          : false;

        const isShielded = gameState.divineShieldSquare
          ? gameState.divineShieldSquare.rank === displayRank && gameState.divineShieldSquare.file === displayFile
          : false;

        const isSlowed = gameState.slowedPieces
          ? gameState.slowedPieces.some(sq => sq.rank === displayRank && sq.file === displayFile)
          : false;

        const isDoubleStepActive = gameState.doubleStepPiece
          ? gameState.doubleStepPiece.rank === displayRank && gameState.doubleStepPiece.file === displayFile && gameState.doubleStepMovesLeft > 0
          : false;

        squares.push(
          <SquareComponent
            key={`${displayRank}-${displayFile}`}
            rank={displayRank}
            file={displayFile}
            piece={piece}
            isSelected={isSelected}
            isLegalMove={isLegalMove}
            isLegalCapture={isLegalCapture}
            isLastMoveFrom={isLastMoveFrom}
            isLastMoveTo={isLastMoveTo}
            isCheck={isCheck}
            isFlipped={isFlipped}
            onClick={handleSquareClick}
            animationSpeed={animationSpeed}
            isShielded={isShielded}
            isSlowed={isSlowed}
            isDoubleStepActive={isDoubleStepActive}
          />
        );
      }
    }
    return squares;
  }, [gameState.board, gameState.divineShieldSquare, gameState.slowedPieces, gameState.doubleStepPiece, gameState.doubleStepMovesLeft, selectedSquare, legalMoveTargets, lastMove, checkSquare, isFlipped, handleSquareClick, animationSpeed]);

  // Promotion pieces
  const promotionColor = pendingPromotion
    ? gameState.activeColor
    : Color.White;

  return (
    <div className={styles.boardContainer}>
      <div className={styles.board} id="chess-board">
        {renderBoard}
      </div>

      {/* AI Thinking Overlay */}
      {isAIThinking && (
        <div className={styles.thinkingOverlay}>
          <div className={styles.thinkingSpinner} />
        </div>
      )}

      {/* Promotion Dialog */}
      {pendingPromotion && (
        <div className={styles.promotionOverlay} onClick={cancelPromotion}>
          <div className={styles.promotionDialog} onClick={e => e.stopPropagation()}>
            {([PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight] as PromotionPiece[]).map(pieceType => (
              <button
                key={pieceType}
                className={styles.promotionPiece}
                onClick={() => onPromotion(pieceType)}
                aria-label={`Promote to ${pieceType}`}
              >
                <PieceSVG type={pieceType} color={promotionColor} size={44} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
