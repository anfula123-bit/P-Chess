/**
 * Header Component
 * Navigation bar with game controls
 */

'use client';

import React from 'react';
import { Color } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { isGameOver, getStatusMessage } from '../../engine/rules';
import styles from './header.module.css';

interface HeaderProps {
  onNewGame: () => void;
  onSettings: () => void;
  onSaveLoad: () => void;
}

export default function Header({ onNewGame, onSettings, onSaveLoad }: HeaderProps) {
  const gameState = useGameStore(s => s.gameState);
  const isAIThinking = useGameStore(s => s.isAIThinking);
  const isOnline = useGameStore(s => s.isOnline);
  const roomCode = useGameStore(s => s.roomCode);
  const myColor = useGameStore(s => s.myColor);

  const gameOver = isGameOver(gameState);
  const activeColor = gameState.activeColor;

  const statusText = isAIThinking
    ? 'AI Thinking...'
    : gameOver
      ? getStatusMessage(gameState)
      : `${activeColor === Color.White ? 'White' : 'Black'} to move`;

  const setView = useGameStore(s => s.setView);

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>♛</span>
        <span className={styles.logoText}>ChessMaster</span>
      </div>

      {isOnline && (
        <div className={styles.onlineBadge}>
          <span className={styles.pulseDot} />
          <span>Room #{roomCode} ({myColor === Color.White ? 'White' : 'Black'})</span>
        </div>
      )}

      <div className={styles.statusChip}>
        <div className={`${styles.turnIndicator} ${activeColor === Color.White ? styles.turnWhite : styles.turnBlack}`} />
        <span>{statusText}</span>
      </div>

      <nav className={styles.nav}>
        <button className={styles.navBtn} onClick={() => setView('home')}>
          🏠 Home
        </button>
        <button className={styles.navBtnPrimary} onClick={onNewGame}>
          ✦ New Game
        </button>
        <button className={styles.navBtn} onClick={onSaveLoad}>
          💾 Save/Load
        </button>
        <button className={styles.navBtn} onClick={onSettings}>
          ⚙ Settings
        </button>
      </nav>
    </header>
  );
}
