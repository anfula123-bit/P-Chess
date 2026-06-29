/**
 * Settings Store — Zustand
 * Persisted settings with localStorage
 */

import { create } from 'zustand';
import {
  Settings, ThemeMode, BoardTheme, PieceTheme, Language,
} from '../engine/types';

interface SettingsStore extends Settings {
  setThemeMode: (mode: ThemeMode) => void;
  setBoardTheme: (theme: BoardTheme) => void;
  setPieceTheme: (theme: PieceTheme) => void;
  setVolume: (volume: number) => void;
  setAnimationSpeed: (speed: number) => void;
  setLanguage: (lang: Language) => void;
  loadSettings: () => void;
}

const STORAGE_KEY = 'chess-settings';

const DEFAULT_SETTINGS: Settings = {
  themeMode: ThemeMode.Dark,
  boardTheme: BoardTheme.Classic,
  pieceTheme: PieceTheme.Standard,
  volume: 0.7,
  animationSpeed: 200,
  language: Language.English,
};

function saveToStorage(settings: Partial<Settings>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadFromStorage();
    const merged = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage errors
  }
}

function loadFromStorage(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    saveToStorage({ themeMode: mode });
  },

  setBoardTheme: (theme) => {
    set({ boardTheme: theme });
    saveToStorage({ boardTheme: theme });
  },

  setPieceTheme: (theme) => {
    set({ pieceTheme: theme });
    saveToStorage({ pieceTheme: theme });
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
    saveToStorage({ volume: clamped });
  },

  setAnimationSpeed: (speed) => {
    set({ animationSpeed: speed });
    saveToStorage({ animationSpeed: speed });
  },

  setLanguage: (lang) => {
    set({ language: lang });
    saveToStorage({ language: lang });
  },

  loadSettings: () => {
    const settings = loadFromStorage();
    set(settings);
  },
}));
