/**
 * Move History Component
 * Displays all moves in standard notation
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import styles from './panel.module.css';

export default function MoveHistory() {
  const moveHistory = useGameStore(s => s.gameState.moveHistory);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moveHistory.length]);

  // Group moves into pairs (white + black)
  const movePairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory[i].notation,
      black: moveHistory[i + 1]?.notation,
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span>Move History</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>
          {moveHistory.length} moves
        </span>
      </div>
      <div className={styles.moveHistory} ref={scrollRef}>
        {movePairs.length === 0 ? (
          <div className={styles.emptyHistory}>No moves yet</div>
        ) : (
          movePairs.map((pair, idx) => (
            <div key={idx} className={styles.moveRow}>
              <span className={styles.moveNumber}>{pair.number}.</span>
              <span
                className={`${styles.moveNotation} ${
                  moveHistory.length - 1 === idx * 2 && !pair.black
                    ? styles.moveNotationActive
                    : ''
                }`}
              >
                {pair.white}
              </span>
              {pair.black && (
                <span
                  className={`${styles.moveNotation} ${
                    moveHistory.length - 1 === idx * 2 + 1
                      ? styles.moveNotationActive
                      : ''
                  }`}
                >
                  {pair.black}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
