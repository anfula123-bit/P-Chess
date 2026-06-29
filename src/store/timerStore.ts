/**
 * Timer Store — Zustand
 * Chess clock management
 */

import { create } from 'zustand';
import { Color, TimerPreset, TIMER_CONFIGS } from '../engine/types';

interface TimerStore {
  whiteTime: number; // remaining seconds
  blackTime: number;
  isRunning: boolean;
  activeTimer: Color | null;
  preset: TimerPreset;
  increment: number;
  intervalId: ReturnType<typeof setInterval> | null;

  // Actions
  initTimer: (preset: TimerPreset) => void;
  startTimer: (color: Color) => void;
  stopTimer: () => void;
  switchTimer: (toColor: Color) => void;
  addIncrement: (color: Color) => void;
  resetTimer: () => void;
  tick: () => void;
  isTimeUp: (color: Color) => boolean;
  formatTime: (seconds: number) => string;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  whiteTime: 600,
  blackTime: 600,
  isRunning: false,
  activeTimer: null,
  preset: TimerPreset.Rapid,
  increment: 5,
  intervalId: null,

  initTimer: (preset) => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);

    const config = TIMER_CONFIGS[preset];
    set({
      whiteTime: config.initialTime,
      blackTime: config.initialTime,
      isRunning: false,
      activeTimer: null,
      preset,
      increment: config.increment,
      intervalId: null,
    });
  },

  startTimer: (color) => {
    const { preset, intervalId: existingInterval } = get();
    if (preset === TimerPreset.Unlimited) return;
    if (existingInterval) clearInterval(existingInterval);

    const intervalId = setInterval(() => {
      get().tick();
    }, 100); // Tick every 100ms for smooth display

    set({ isRunning: true, activeTimer: color, intervalId });
  },

  stopTimer: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ isRunning: false, activeTimer: null, intervalId: null });
  },

  switchTimer: (toColor) => {
    const { isRunning, activeTimer, increment } = get();
    if (!isRunning) return;

    // Add increment to the color that just moved
    if (activeTimer && increment > 0) {
      get().addIncrement(activeTimer);
    }

    set({ activeTimer: toColor });
  },

  addIncrement: (color) => {
    const { increment } = get();
    if (color === Color.White) {
      set(state => ({ whiteTime: state.whiteTime + increment }));
    } else {
      set(state => ({ blackTime: state.blackTime + increment }));
    }
  },

  resetTimer: () => {
    const { intervalId, preset } = get();
    if (intervalId) clearInterval(intervalId);
    const config = TIMER_CONFIGS[preset];
    set({
      whiteTime: config.initialTime,
      blackTime: config.initialTime,
      isRunning: false,
      activeTimer: null,
      intervalId: null,
    });
  },

  tick: () => {
    const { activeTimer, isRunning } = get();
    if (!isRunning || !activeTimer) return;

    if (activeTimer === Color.White) {
      set(state => {
        const newTime = Math.max(0, state.whiteTime - 0.1);
        if (newTime <= 0) {
          if (state.intervalId) clearInterval(state.intervalId);
          return { whiteTime: 0, isRunning: false, intervalId: null };
        }
        return { whiteTime: newTime };
      });
    } else {
      set(state => {
        const newTime = Math.max(0, state.blackTime - 0.1);
        if (newTime <= 0) {
          if (state.intervalId) clearInterval(state.intervalId);
          return { blackTime: 0, isRunning: false, intervalId: null };
        }
        return { blackTime: newTime };
      });
    }
  },

  isTimeUp: (color) => {
    const { whiteTime, blackTime, preset } = get();
    if (preset === TimerPreset.Unlimited) return false;
    return color === Color.White ? whiteTime <= 0 : blackTime <= 0;
  },

  formatTime: (seconds) => {
    if (seconds === Infinity) return '∞';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds * 10) % 10);

    if (seconds < 10) {
      return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
}));
