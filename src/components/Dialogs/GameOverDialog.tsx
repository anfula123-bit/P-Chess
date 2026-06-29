/**
 * Game Over Dialog
 * Displayed when the game ends (checkmate, stalemate, draw)
 */

'use client';

import React from 'react';
import { Color, GameStatus } from '../../engine/types';
import { getWinner, getGameResult, getStatusMessage } from '../../engine/rules';
import { useGameStore } from '../../store/gameStore';
import { isGameOver } from '../../engine/rules';
import styles from './dialogs.module.css';

interface GameOverDialogProps {
  isOpen: boolean;
  onNewGame: () => void;
}

export default function GameOverDialog({ isOpen, onNewGame }: GameOverDialogProps) {
  const gameState = useGameStore(s => s.gameState);

  if (!isOpen) return null;

  const winner = getWinner(gameState);
  const result = getGameResult(gameState);
  const message = getStatusMessage(gameState);

  const getIcon = () => {
    if (gameState.status === GameStatus.Checkmate) return '👑';
    if (gameState.status === GameStatus.Resigned) return '🏳️';
    return '🤝';
  };

  const getTitle = () => {
    if (winner === Color.White) return 'White Wins!';
    if (winner === Color.Black) return 'Black Wins!';
    return 'Draw!';
  };

  return (
    <div className={styles.overlay} onClick={onNewGame}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogBody}>
          <div className={styles.gameOverContent}>
            <div className={styles.gameOverIcon}>{getIcon()}</div>
            <div className={styles.gameOverTitle}>{getTitle()}</div>
            <div className={styles.gameOverSubtitle}>{message}</div>
            <div className={styles.gameOverResult}>{result}</div>
          </div>
        </div>
        <div className={styles.dialogFooter}>
          <button className={styles.btnPrimary} onClick={onNewGame} style={{ flex: 1 }}>
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}
