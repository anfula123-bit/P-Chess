/**
 * New Game Dialog
 * Configure game mode, difficulty, timer, and player color
 */

'use client';

import React, { useState } from 'react';
import { GameMode, AIDifficulty, TimerPreset, Color, CommanderType } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { useTimerStore } from '../../store/timerStore';
import styles from './dialogs.module.css';

interface NewGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewGameDialog({ isOpen, onClose }: NewGameDialogProps) {
  const startNewGame = useGameStore(s => s.startNewGame);
  const initTimer = useTimerStore(s => s.initTimer);

  const [timer, setTimer] = useState<TimerPreset>(TimerPreset.Rapid);
  const [whiteComm, setWhiteComm] = useState<CommanderType>(CommanderType.Vandoria);
  const [blackComm, setBlackComm] = useState<CommanderType>(CommanderType.Valeria);

  if (!isOpen) return null;

  const handleStart = () => {
    startNewGame(GameMode.PvP, undefined, Color.White, timer, whiteComm, blackComm);
    initTimer(timer);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>New Game</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.dialogBody}>
          <p style={{ margin: '0 0 var(--space-4) 0', color: 'var(--text-secondary)' }}>
            Configure the game settings for a Local PvP duel.
          </p>

          {/* Timer */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Time Control</label>
            <div className={styles.toggleGroup}>
              {[
                { value: TimerPreset.Blitz, label: '3+2' },
                { value: TimerPreset.Rapid, label: '10+5' },
                { value: TimerPreset.Classical, label: '30+0' },
                { value: TimerPreset.Unlimited, label: '∞' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={timer === opt.value ? styles.toggleOptionActive : styles.toggleOption}
                  onClick={() => setTimer(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* White Commander */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>White Commander</label>
            <div className={styles.toggleGroup}>
              {[
                { value: CommanderType.Vandoria, label: '⚔️ Vandoria' },
                { value: CommanderType.Valeria, label: '🛡️ Valeria' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={whiteComm === opt.value ? styles.toggleOptionActive : styles.toggleOption}
                  onClick={() => setWhiteComm(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Black Commander */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Black Commander</label>
            <div className={styles.toggleGroup}>
              {[
                { value: CommanderType.Vandoria, label: '⚔️ Vandoria' },
                { value: CommanderType.Valeria, label: '🛡️ Valeria' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={blackComm === opt.value ? styles.toggleOptionActive : styles.toggleOption}
                  onClick={() => setBlackComm(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.dialogFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleStart}>Start Game</button>
        </div>
      </div>
    </div>
  );
}
