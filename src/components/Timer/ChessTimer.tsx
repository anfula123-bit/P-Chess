/**
 * Chess Timer Component
 */

'use client';

import React from 'react';
import { Color, TimerPreset } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { useTimerStore } from '../../store/timerStore';
import styles from '../Panel/panel.module.css';

export default function ChessTimer() {
  const activeColor = useGameStore(s => s.gameState.activeColor);
  const timerPreset = useGameStore(s => s.timerPreset);

  const whiteTime = useTimerStore(s => s.whiteTime);
  const blackTime = useTimerStore(s => s.blackTime);
  const formatTime = useTimerStore(s => s.formatTime);
  const isRunning = useTimerStore(s => s.isRunning);

  if (timerPreset === TimerPreset.Unlimited) {
    return null; // Don't show timer for unlimited games
  }

  const isWhiteActive = isRunning && activeColor === Color.White;
  const isBlackActive = isRunning && activeColor === Color.Black;
  const isWhiteLow = whiteTime < 30;
  const isBlackLow = blackTime < 30;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Timer</div>
      <div className={styles.timerContainer}>
        {/* White Timer */}
        <div className={`${styles.timer} ${isWhiteActive ? styles.timerActive : ''} ${isWhiteLow && isWhiteActive ? styles.timerDanger : ''}`}>
          <span className={styles.timerLabel}>White</span>
          <span className={`${styles.timerTime} ${isWhiteLow ? styles.timerTimeLow : ''}`}>
            {formatTime(whiteTime)}
          </span>
        </div>

        {/* Black Timer */}
        <div className={`${styles.timer} ${isBlackActive ? styles.timerActive : ''} ${isBlackLow && isBlackActive ? styles.timerDanger : ''}`}>
          <span className={styles.timerLabel}>Black</span>
          <span className={`${styles.timerTime} ${isBlackLow ? styles.timerTimeLow : ''}`}>
            {formatTime(blackTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
