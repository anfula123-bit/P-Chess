/**
 * Captured Pieces Component
 * Displays captured pieces for both sides
 */

'use client';

import React, { useMemo } from 'react';
import { Color, Piece, PieceType } from '../../engine/types';
import { PIECE_VALUES } from '../../engine/pieces';
import { useGameStore } from '../../store/gameStore';
import PieceSVG from '../Board/PieceSVG';
import styles from './panel.module.css';

// Piece display order
const PIECE_ORDER: PieceType[] = [
  PieceType.Queen, PieceType.Rook, PieceType.Bishop, PieceType.Knight, PieceType.Pawn,
];

function sortCaptured(pieces: Piece[]): Piece[] {
  return [...pieces].sort((a, b) => {
    const orderA = PIECE_ORDER.indexOf(a.type);
    const orderB = PIECE_ORDER.indexOf(b.type);
    return orderA - orderB;
  });
}

function calculateMaterialDiff(captured: { white: Piece[]; black: Piece[] }): number {
  let whiteCapturedValue = 0; // Black pieces captured by White
  let blackCapturedValue = 0; // White pieces captured by Black

  for (const piece of captured.black) {
    whiteCapturedValue += PIECE_VALUES[piece.type];
  }
  for (const piece of captured.white) {
    blackCapturedValue += PIECE_VALUES[piece.type];
  }

  return whiteCapturedValue - blackCapturedValue; // Positive = White advantage
}

export default function CapturedPieces() {
  const capturedPieces = useGameStore(s => s.gameState.capturedPieces);

  const sortedWhiteCaptured = useMemo(
    () => sortCaptured(capturedPieces.white),
    [capturedPieces.white]
  );
  const sortedBlackCaptured = useMemo(
    () => sortCaptured(capturedPieces.black),
    [capturedPieces.black]
  );

  const materialDiff = useMemo(
    () => calculateMaterialDiff(capturedPieces),
    [capturedPieces]
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>Captured Pieces</div>
      <div className={styles.capturedPieces}>
        {/* Black pieces captured (by White) */}
        <div style={{ marginBottom: '6px' }}>
          <div className={styles.capturedLabel}>
            Black
            {materialDiff > 0 && (
              <span className={styles.materialAdvantage}>+{Math.floor(materialDiff / 100)}</span>
            )}
          </div>
          <div className={styles.capturedRow}>
            {sortedBlackCaptured.map((piece, idx) => (
              <div key={idx} className={styles.capturedPiece}>
                <PieceSVG type={piece.type} color={piece.color} size={20} />
              </div>
            ))}
          </div>
        </div>

        {/* White pieces captured (by Black) */}
        <div>
          <div className={styles.capturedLabel}>
            White
            {materialDiff < 0 && (
              <span className={styles.materialAdvantage}>+{Math.floor(Math.abs(materialDiff) / 100)}</span>
            )}
          </div>
          <div className={styles.capturedRow}>
            {sortedWhiteCaptured.map((piece, idx) => (
              <div key={idx} className={styles.capturedPiece}>
                <PieceSVG type={piece.type} color={piece.color} size={20} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
