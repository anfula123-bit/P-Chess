/**
 * AI Web Worker
 * Runs AI search in a separate thread to avoid blocking UI
 */

import { AIWorkerMessage, AIWorkerResponse, GameState } from '../engine/types';
import { findBestMove, stopSearch, clearTT } from './search';
import { getDifficultyConfig } from './difficulty';

// Web Worker message handler
self.onmessage = function (event: MessageEvent<AIWorkerMessage>) {
  const message = event.data;

  switch (message.type) {
    case 'init':
      clearTT();
      const initResponse: AIWorkerResponse = { type: 'ready' };
      self.postMessage(initResponse);
      break;

    case 'search':
      if (!message.gameState || !message.config) {
        console.error('AI Worker: Missing gameState or config');
        return;
      }

      const config = message.config;
      const result = findBestMove(message.gameState, config);

      const searchResponse: AIWorkerResponse = {
        type: 'bestmove',
        move: result.bestMove || undefined,
        evaluation: result.score,
        depth: result.depth,
        nodes: result.nodes,
        time: result.time,
        pv: result.pv,
      };

      self.postMessage(searchResponse);
      break;

    case 'stop':
      stopSearch();
      break;

    default:
      console.warn('AI Worker: Unknown message type', message);
  }
};
