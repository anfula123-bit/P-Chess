/**
 * Save/Load Manager
 * localStorage-based game persistence
 */

import { SavedGame, GameState, GameMode, TimerPreset, AIDifficulty } from '../engine/types';

const SAVES_KEY = 'chess-saves';
const AUTOSAVE_KEY = 'chess-autosave';

// ============================================================
// Save
// ============================================================

export function saveGame(
  gameState: GameState,
  gameMode: GameMode,
  timerPreset: TimerPreset,
  name?: string,
  aiDifficulty?: AIDifficulty,
  whiteTime?: number,
  blackTime?: number,
): string {
  const id = `save_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const saved: SavedGame = {
    id,
    name: name || `Game ${new Date().toLocaleString()}`,
    date: new Date().toISOString(),
    gameState,
    gameMode,
    timerPreset,
    aiDifficulty,
    whiteTime,
    blackTime,
  };

  const saves = getAllSaves();
  saves.push(saved);
  writeSaves(saves);

  return id;
}

// ============================================================
// Load
// ============================================================

export function loadGame(id: string): SavedGame | null {
  const saves = getAllSaves();
  return saves.find(s => s.id === id) || null;
}

export function getAllSaves(): SavedGame[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SAVES_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function deleteSave(id: string): void {
  const saves = getAllSaves().filter(s => s.id !== id);
  writeSaves(saves);
}

function writeSaves(saves: SavedGame[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
  } catch {
    // Storage full — remove oldest saves
    if (saves.length > 10) {
      saves.splice(0, saves.length - 10);
      localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
    }
  }
}

// ============================================================
// Auto Save
// ============================================================

export function autoSave(
  gameState: GameState,
  gameMode: GameMode,
  timerPreset: TimerPreset,
  aiDifficulty?: AIDifficulty,
  whiteTime?: number,
  blackTime?: number,
): void {
  if (typeof window === 'undefined') return;
  try {
    const saved: SavedGame = {
      id: 'autosave',
      name: 'Auto Save',
      date: new Date().toISOString(),
      gameState,
      gameMode,
      timerPreset,
      aiDifficulty,
      whiteTime,
      blackTime,
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(saved));
  } catch {
    // Ignore
  }
}

export function loadAutoSave(): SavedGame | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(AUTOSAVE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Ignore
  }
  return null;
}

export function clearAutoSave(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTOSAVE_KEY);
}

// ============================================================
// Export utilities
// ============================================================

export function downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
