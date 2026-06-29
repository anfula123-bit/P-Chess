/**
 * useSound Hook
 * Plays appropriate sounds for chess moves and events
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { soundManager, SoundType } from '../utils/sound';
import { Move, MoveType, GameStatus } from '../engine/types';
import { useSettingsStore } from '../store/settingsStore';

export function useSound() {
  const volume = useSettingsStore(s => s.volume);
  const initialized = useRef(false);

  // Initialize sound on first user interaction
  useEffect(() => {
    const initSound = () => {
      if (!initialized.current) {
        soundManager.init();
        initialized.current = true;
      }
    };

    window.addEventListener('click', initSound, { once: true });
    window.addEventListener('keydown', initSound, { once: true });

    return () => {
      window.removeEventListener('click', initSound);
      window.removeEventListener('keydown', initSound);
    };
  }, []);

  // Update volume
  useEffect(() => {
    soundManager.setVolume(volume);
  }, [volume]);

  const playMoveSound = useCallback((move: Move, status?: GameStatus) => {
    // Priority: checkmate > check > special moves > capture > normal move
    if (status === GameStatus.Checkmate) {
      soundManager.play('checkmate');
    } else if (move.isCheck || status === GameStatus.Check) {
      soundManager.play('check');
    } else if (move.moveType === MoveType.CastleKingside || move.moveType === MoveType.CastleQueenside) {
      soundManager.play('castle');
    } else if (move.moveType === MoveType.Promotion) {
      soundManager.play('promote');
    } else if (move.captured) {
      soundManager.play('capture');
    } else {
      soundManager.play('move');
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    soundManager.play(type);
  }, []);

  return { playMoveSound, playSound };
}
