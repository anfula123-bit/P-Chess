/**
 * Square Component
 * Individual board square with highlights and interactions
 */

'use client';

import React, { useCallback } from 'react';
import { Color, Move, Piece, Square } from '../../engine/types';
import { isLightSquare } from '../../engine/board';
import PieceSVG from './PieceSVG';
import styles from './board.module.css';

interface SquareProps {
  rank: number;
  file: number;
  piece: Piece | null;
  isSelected: boolean;
  isLegalMove: boolean;
  isLegalCapture: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isCheck: boolean;
  isFlipped: boolean;
  onClick: (rank: number, file: number) => void;
  animationSpeed: number;
  isShielded?: boolean;
  isSlowed?: boolean;
  isDoubleStepActive?: boolean;
}

const SquareComponent = React.memo(function SquareComponent({
  rank, file, piece, isSelected, isLegalMove, isLegalCapture,
  isLastMoveFrom, isLastMoveTo, isCheck, isFlipped, onClick, animationSpeed,
  isShielded = false, isSlowed = false, isDoubleStepActive = false,
}: SquareProps) {
  const light = isLightSquare(rank, file);

  const handleClick = useCallback(() => {
    onClick(rank, file);
  }, [rank, file, onClick]);

  // Build class names
  const classNames = [
    styles.square,
    light ? styles.light : styles.dark,
    isSelected && styles.selected,
    isLegalMove && styles.legalMove,
    isLegalCapture && styles.legalCapture,
    isLastMoveFrom && styles.lastMoveFrom,
    isLastMoveTo && styles.lastMoveTo,
    isCheck && styles.check,
  ].filter(Boolean).join(' ');

  // File and rank labels
  const showFileLabel = isFlipped ? rank === 0 : rank === 7;
  const showRankLabel = isFlipped ? file === 7 : file === 0;
  const fileLabel = String.fromCharCode(97 + file);
  const rankLabel = String.fromCharCode(56 - rank);

  return (
    <div
      className={classNames}
      onClick={handleClick}
      data-rank={rank}
      data-file={file}
      role="button"
      tabIndex={0}
      aria-label={`${fileLabel}${rankLabel}${piece ? ` ${piece.color === Color.White ? 'White' : 'Black'} ${piece.type}` : ''}`}
    >
      {/* Legal move dot */}
      {isLegalMove && !isLegalCapture && (
        <div className={styles.legalMoveDot} />
      )}

      {/* Legal capture ring */}
      {isLegalCapture && (
        <div className={styles.legalCaptureRing} />
      )}

      {/* Commander Effect Overlays */}
      {isShielded && (
        <div className={styles.shieldOverlay} />
      )}
      {isSlowed && (
        <div className={styles.slowedOverlay} />
      )}
      {isDoubleStepActive && (
        <div className={styles.doubleStepOverlay} />
      )}

      {/* Piece */}
      {piece && (
        <div
          className={styles.pieceWrapper}
          style={{ transitionDuration: `${animationSpeed}ms` }}
        >
          <PieceSVG type={piece.type} color={piece.color} size={0} />
        </div>
      )}

      {/* Labels */}
      {showFileLabel && (
        <span className={`${styles.label} ${styles.fileLabel} ${light ? styles.labelDark : styles.labelLight}`}>
          {fileLabel}
        </span>
      )}
      {showRankLabel && (
        <span className={`${styles.label} ${styles.rankLabel} ${light ? styles.labelDark : styles.labelLight}`}>
          {rankLabel}
        </span>
      )}
    </div>
  );
});

export default SquareComponent;
