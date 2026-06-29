/**
 * useAI Hook
 * Manages AI Web Worker communication
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GameState, AIConfig, Move, AIWorkerMessage, AIWorkerResponse, AIDifficulty } from '../engine/types';
import { getDifficultyConfig } from '../ai/difficulty';
import { findBestMove } from '../ai/search';
import { useGameStore } from '../store/gameStore';

export function useAI() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSearching = useRef(false);

  const makeAIMove = useGameStore(s => s.makeAIMove);
  const setAIThinking = useGameStore(s => s.setAIThinking);

  /**
   * Request AI to find best move
   * Using synchronous search with setTimeout to yield to UI
   */
  const requestAIMove = useCallback((gameState: GameState, difficulty: AIDifficulty) => {
    if (isSearching.current) return;

    isSearching.current = true;
    setAIThinking(true);

    // Run search after a small delay to let UI update
    timeoutRef.current = setTimeout(() => {
      try {
        const config = getDifficultyConfig(difficulty);
        const result = findBestMove(gameState, config);

        if (result.bestMove) {
          makeAIMove(result.bestMove);
        }
      } catch (e) {
        console.error('AI search error:', e);
      } finally {
        isSearching.current = false;
        setAIThinking(false);
      }
    }, 100);
  }, [makeAIMove, setAIThinking]);

  const stopAI = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isSearching.current = false;
    setAIThinking(false);
  }, [setAIThinking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAI();
    };
  }, [stopAI]);

  return { requestAIMove, stopAI };
}
