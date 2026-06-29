/**
 * Game Controls Component
 * Undo, Redo, Restart, Flip, Resign, Draw buttons
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { isGameOver } from '../../engine/rules';
import styles from './panel.module.css';

export default function GameControls() {
  const undo = useGameStore(s => s.undo);
  const redo = useGameStore(s => s.redo);
  const flipBoard = useGameStore(s => s.flipBoard);
  const resignGame = useGameStore(s => s.resignGame);
  const offerDraw = useGameStore(s => s.offerDraw);
  const gameState = useGameStore(s => s.gameState);
  const undoStack = useGameStore(s => s.undoStack);
  const redoStack = useGameStore(s => s.redoStack);
  const isAIThinking = useGameStore(s => s.isAIThinking);

  const gameOver = isGameOver(gameState);
  const canUndo = undoStack.length > 0 && !isAIThinking;
  const canRedo = redoStack.length > 0 && !isAIThinking;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Controls</div>
      <div className={styles.controls}>
        <button
          className={styles.controlBtn}
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        <button
          className={styles.controlBtn}
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↪ Redo
        </button>
        <button
          className={styles.controlBtn}
          onClick={flipBoard}
          title="Flip Board"
        >
          🔄 Flip
        </button>
        <button
          className={styles.controlBtnDanger}
          onClick={() => resignGame()}
          disabled={gameOver || isAIThinking}
          title="Resign"
        >
          🏳 Resign
        </button>
        <button
          className={styles.controlBtn}
          onClick={offerDraw}
          disabled={gameOver || isAIThinking}
          title="Offer Draw"
        >
          🤝 Draw
        </button>
      </div>
    </div>
  );
}
