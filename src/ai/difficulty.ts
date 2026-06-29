/**
 * AI Difficulty Presets
 */

import { AIConfig, AIDifficulty } from '../engine/types';

export const DIFFICULTY_CONFIGS: Record<AIDifficulty, AIConfig> = {
  [AIDifficulty.Easy]: {
    difficulty: AIDifficulty.Easy,
    maxDepth: 2,
    timeLimit: 1000,
    useQuiescence: false,
    useTranspositionTable: false,
    useIterativeDeepening: false,
  },
  [AIDifficulty.Medium]: {
    difficulty: AIDifficulty.Medium,
    maxDepth: 4,
    timeLimit: 3000,
    useQuiescence: true,
    useTranspositionTable: true,
    useIterativeDeepening: true,
  },
  [AIDifficulty.Hard]: {
    difficulty: AIDifficulty.Hard,
    maxDepth: 6,
    timeLimit: 5000,
    useQuiescence: true,
    useTranspositionTable: true,
    useIterativeDeepening: true,
  },
  [AIDifficulty.Expert]: {
    difficulty: AIDifficulty.Expert,
    maxDepth: 8,
    timeLimit: 10000,
    useQuiescence: true,
    useTranspositionTable: true,
    useIterativeDeepening: true,
  },
};

export function getDifficultyConfig(difficulty: AIDifficulty): AIConfig {
  return { ...DIFFICULTY_CONFIGS[difficulty] };
}
