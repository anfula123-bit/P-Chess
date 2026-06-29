/**
 * Main Game Page
 * Orchestrates all components and handles AI turns
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameMode, Color, TimerPreset } from '../engine/types';
import { isGameOver, getWinner } from '../engine/rules';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTimerStore } from '../store/timerStore';
import { useAI } from '../hooks/useAI';
import { useSound } from '../hooks/useSound';
import { autoSave } from '../utils/save';

import Header from '../components/Header/Header';
import Board from '../components/Board/Board';
import MoveHistory from '../components/Panel/MoveHistory';
import CapturedPieces from '../components/Panel/CapturedPieces';
import GameControls from '../components/Panel/GameControls';
import ChessTimer from '../components/Timer/ChessTimer';
import NewGameDialog from '../components/Dialogs/NewGameDialog';
import GameOverDialog from '../components/Dialogs/GameOverDialog';
import SettingsDialog from '../components/Dialogs/SettingsDialog';
import SaveLoadDialog from '../components/Dialogs/SaveLoadDialog';
import Home from '../components/Home/Home';
import CommanderPanel from '../components/Panel/CommanderPanel';
import { useMultiplayerSync } from '../hooks/useMultiplayerSync';

export default function GamePage() {
  // Initialize multiplayer synchronization
  useMultiplayerSync();

  // Dialog states
  const [showNewGame, setShowNewGame] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);

  // Store selectors
  const view = useGameStore(s => s.view);
  const gameState = useGameStore(s => s.gameState);
  const gameMode = useGameStore(s => s.gameMode);
  const playerColor = useGameStore(s => s.playerColor);
  const aiDifficulty = useGameStore(s => s.aiDifficulty);
  const isAIThinking = useGameStore(s => s.isAIThinking);
  const timerPreset = useGameStore(s => s.timerPreset);
  const lastMove = useGameStore(s => s.lastMove);

  const settings = useSettingsStore();
  const timerStore = useTimerStore();

  const { requestAIMove, stopAI } = useAI();
  const { playMoveSound } = useSound();

  const [gameSaved, setGameSaved] = useState(false);

  // Reset gameSaved state when a new game starts
  useEffect(() => {
    if (gameState.moveHistory.length === 0) {
      setGameSaved(false);
    }
  }, [gameState.moveHistory.length]);

  // Update profile statistics when game is over
  useEffect(() => {
    if (isGameOver(gameState) && !gameSaved) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('chess_commander_profile');
        if (stored) {
          try {
            const profile = JSON.parse(stored);
            const winner = getWinner(gameState);
            
            let result: 'win' | 'loss' | 'draw' = 'draw';
            if (winner === Color.White) result = 'win';
            else if (winner === Color.Black) result = 'loss';

            // Update stats
            if (result === 'win') profile.wins += 1;
            else if (result === 'loss') profile.losses += 1;
            else profile.draws += 1;

            // XP calculations
            const xpGain = result === 'win' ? 30 : result === 'draw' ? 15 : 10;
            profile.xp += xpGain;
            
            const nextLevelXp = profile.level * 100;
            if (profile.xp >= nextLevelXp) {
              profile.xp -= nextLevelXp;
              profile.level += 1;
            }

            // Add match record
            const newMatch = {
              id: `match_${Date.now()}`,
              opponentName: 'Player 2',
              playerColor: 'White' as const,
              result,
              date: new Date().toLocaleDateString(),
              movesCount: Math.ceil(gameState.moveHistory.length / 2)
            };

            profile.matchHistory = [newMatch, ...profile.matchHistory];
            localStorage.setItem('chess_commander_profile', JSON.stringify(profile));
          } catch (e) {
            console.error('Error updating profile statistics:', e);
          }
        }
      }
      setGameSaved(true);
    }
  }, [gameState.status, gameSaved]);

  // Track previous move count for AI trigger
  const prevMoveCount = useRef(gameState.moveHistory.length);

  // ============================================================
  // Theme Application
  // ============================================================

  useEffect(() => {
    settings.loadSettings();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.themeMode);
    document.documentElement.setAttribute('data-board-theme', settings.boardTheme);
    document.documentElement.style.setProperty('--animation-speed', `${settings.animationSpeed}ms`);
  }, [settings.themeMode, settings.boardTheme, settings.animationSpeed]);

  // ============================================================
  // AI Turn Management
  // ============================================================

  useEffect(() => {
    const currentMoveCount = gameState.moveHistory.length;

    // Only trigger AI when a new move was made
    if (currentMoveCount === prevMoveCount.current) return;
    prevMoveCount.current = currentMoveCount;

    if (isGameOver(gameState)) return;
    if (isAIThinking) return;

    // PvAI: AI's turn
    if (gameMode === GameMode.PvAI && gameState.activeColor !== playerColor) {
      requestAIMove(gameState, aiDifficulty);
    }

    // AIvAI: always AI's turn
    if (gameMode === GameMode.AIvAI) {
      const timer = setTimeout(() => {
        requestAIMove(gameState, aiDifficulty);
      }, 500); // Small delay for visualization
      return () => clearTimeout(timer);
    }
  }, [gameState.moveHistory.length, gameMode, playerColor, aiDifficulty, isAIThinking, gameState, requestAIMove]);

  // PvAI: Trigger AI if it plays first (Black player chose White)
  useEffect(() => {
    if (gameMode === GameMode.PvAI && gameState.activeColor !== playerColor && gameState.moveHistory.length === 0) {
      requestAIMove(gameState, aiDifficulty);
    }

    // AIvAI: Start first move
    if (gameMode === GameMode.AIvAI && gameState.moveHistory.length === 0) {
      setTimeout(() => {
        requestAIMove(gameState, aiDifficulty);
      }, 500);
    }
  }, [gameMode, playerColor]);

  // ============================================================
  // Timer Management
  // ============================================================

  useEffect(() => {
    if (timerPreset === TimerPreset.Unlimited) return;

    if (gameState.moveHistory.length >= 2 && !isGameOver(gameState)) {
      if (!timerStore.isRunning) {
        timerStore.startTimer(gameState.activeColor);
      } else {
        timerStore.switchTimer(gameState.activeColor);
      }
    }

    if (isGameOver(gameState)) {
      timerStore.stopTimer();
    }
  }, [gameState.moveHistory.length, gameState.status]);

  // ============================================================
  // Auto Save
  // ============================================================

  useEffect(() => {
    if (gameState.moveHistory.length > 0 && gameState.moveHistory.length % 5 === 0) {
      autoSave(gameState, gameMode, timerPreset, aiDifficulty, timerStore.whiteTime, timerStore.blackTime);
    }
  }, [gameState.moveHistory.length]);

  // ============================================================
  // Keyboard Shortcuts
  // ============================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          useGameStore.getState().undo();
        }
        if (e.key === 'y') {
          e.preventDefault();
          useGameStore.getState().redo();
        }
        if (e.key === 'n') {
          e.preventDefault();
          setShowNewGame(true);
        }
        if (e.key === 's') {
          e.preventDefault();
          setShowSaveLoad(true);
        }
      }
      if (e.key === 'f') {
        useGameStore.getState().flipBoard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================================
  // Render
  // ============================================================

  if (view === 'home') {
    return (
      <div className="app-container">
        <Home onSettings={() => setShowSettings(true)} />
        
        <SettingsDialog
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Header
        onNewGame={() => setShowNewGame(true)}
        onSettings={() => setShowSettings(true)}
        onSaveLoad={() => setShowSaveLoad(true)}
      />

      <main className="game-layout">
        <section className="board-section">
          <Board />
        </section>

        <aside className="panel-section">
          <CommanderPanel />
          <ChessTimer />
          <CapturedPieces />
          <MoveHistory />
          <GameControls />
        </aside>
      </main>

      {/* Dialogs */}
      <NewGameDialog
        isOpen={showNewGame}
        onClose={() => setShowNewGame(false)}
      />
      <GameOverDialog
        isOpen={isGameOver(gameState) && !showNewGame}
        onNewGame={() => setShowNewGame(true)}
      />
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <SaveLoadDialog
        isOpen={showSaveLoad}
        onClose={() => setShowSaveLoad(false)}
      />
    </div>
  );
}
