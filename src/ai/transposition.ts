/**
 * Transposition Table
 * Hash table for storing previously evaluated positions
 */

import { Move, TTEntry, TTFlag } from '../engine/types';

// ============================================================
// Transposition Table
// ============================================================

const DEFAULT_SIZE = 1 << 20; // ~1M entries

export class TranspositionTable {
  private table: Map<number, TTEntry>;
  private maxSize: number;
  private currentAge: number;

  constructor(size: number = DEFAULT_SIZE) {
    this.table = new Map();
    this.maxSize = size;
    this.currentAge = 0;
  }

  /**
   * Probe the transposition table
   */
  probe(hash: number): TTEntry | null {
    const entry = this.table.get(hash);
    if (!entry) return null;

    // Verify hash matches (collision check by storing hash in entry)
    if (entry.hash !== hash) return null;

    return entry;
  }

  /**
   * Store a position in the transposition table
   */
  store(
    hash: number,
    depth: number,
    score: number,
    flag: TTFlag,
    bestMove?: Move,
  ): void {
    const existing = this.table.get(hash);

    // Replacement strategy: always replace if deeper or older
    if (existing) {
      if (existing.depth > depth && existing.age === this.currentAge) {
        return; // Keep deeper entry from same search
      }
    }

    // Evict if table is full
    if (this.table.size >= this.maxSize && !existing) {
      this.evictOldest();
    }

    this.table.set(hash, {
      hash,
      depth,
      score,
      flag,
      bestMove: bestMove ? { ...bestMove } : undefined,
      age: this.currentAge,
    });
  }

  /**
   * Get the best move from a TT entry (if available)
   */
  getBestMove(hash: number): Move | undefined {
    const entry = this.probe(hash);
    return entry?.bestMove;
  }

  /**
   * Increment the age counter (call before each new search)
   */
  newSearch(): void {
    this.currentAge++;
  }

  /**
   * Clear the table
   */
  clear(): void {
    this.table.clear();
    this.currentAge = 0;
  }

  /**
   * Get table stats
   */
  get size(): number {
    return this.table.size;
  }

  /**
   * Evict oldest entries when table is full
   */
  private evictOldest(): void {
    // Remove entries from older searches first
    const entriesToRemove: number[] = [];
    for (const [key, entry] of this.table) {
      if (entry.age < this.currentAge - 1) {
        entriesToRemove.push(key);
        if (entriesToRemove.length >= this.maxSize / 4) break;
      }
    }

    for (const key of entriesToRemove) {
      this.table.delete(key);
    }

    // If still too full, force remove oldest
    if (this.table.size >= this.maxSize) {
      const iter = this.table.keys();
      const result = iter.next();
      if (!result.done) {
        this.table.delete(result.value);
      }
    }
  }
}
