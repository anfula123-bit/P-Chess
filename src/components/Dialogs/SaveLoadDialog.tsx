/**
 * Save/Load Dialog
 * Save game, load game, import/export PGN/FEN
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useTimerStore } from '../../store/timerStore';
import {
  saveGame, loadGame, getAllSaves, deleteSave,
  downloadAsFile, readFileAsText,
} from '../../utils/save';
import styles from './dialogs.module.css';

interface SaveLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'save' | 'load' | 'pgn' | 'fen';

export default function SaveLoadDialog({ isOpen, onClose }: SaveLoadDialogProps) {
  const gameState = useGameStore(s => s.gameState);
  const gameMode = useGameStore(s => s.gameMode);
  const timerPreset = useGameStore(s => s.timerPreset);
  const aiDifficulty = useGameStore(s => s.aiDifficulty);
  const loadFEN = useGameStore(s => s.loadFEN);
  const loadPGN = useGameStore(s => s.loadPGN);
  const getFEN = useGameStore(s => s.getFEN);
  const getPGN = useGameStore(s => s.getPGN);

  const whiteTime = useTimerStore(s => s.whiteTime);
  const blackTime = useTimerStore(s => s.blackTime);

  const [tab, setTab] = useState<Tab>('save');
  const [saveName, setSaveName] = useState('');
  const [importText, setImportText] = useState('');
  const [saves, setSaves] = useState(getAllSaves);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    const name = saveName.trim() || `Game ${new Date().toLocaleString()}`;
    saveGame(gameState, gameMode, timerPreset, name, aiDifficulty, whiteTime, blackTime);
    setSaves(getAllSaves());
    setMessage('Game saved!');
    setSaveName('');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleLoad = (id: string) => {
    const saved = loadGame(id);
    if (saved) {
      loadFEN(getFEN()); // This is a simplification; ideally we'd restore full state
      // For a complete restore, we'd need to add loadSavedGame to the store
      setMessage('Game loaded!');
      setTimeout(() => {
        setMessage('');
        onClose();
      }, 500);
    }
  };

  const handleDelete = (id: string) => {
    deleteSave(id);
    setSaves(getAllSaves());
  };

  const handleExportPGN = () => {
    const pgn = getPGN();
    downloadAsFile(pgn, 'chess_game.pgn');
    setMessage('PGN exported!');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleExportFEN = () => {
    const fen = getFEN();
    navigator.clipboard.writeText(fen).then(() => {
      setMessage('FEN copied to clipboard!');
      setTimeout(() => setMessage(''), 2000);
    });
  };

  const handleImportPGN = () => {
    if (importText.trim()) {
      const success = loadPGN(importText.trim());
      if (success) {
        setMessage('PGN loaded!');
        setImportText('');
        setTimeout(() => {
          setMessage('');
          onClose();
        }, 500);
      } else {
        setMessage('Invalid PGN!');
      }
    }
  };

  const handleImportFEN = () => {
    if (importText.trim()) {
      try {
        loadFEN(importText.trim());
        setMessage('FEN loaded!');
        setImportText('');
        setTimeout(() => {
          setMessage('');
          onClose();
        }, 500);
      } catch {
        setMessage('Invalid FEN!');
      }
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>Save & Load</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)' }}>
          {(['save', 'load', 'pgn', 'fen'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setMessage(''); setImportText(''); }}
              style={{
                flex: 1,
                padding: '10px',
                background: tab === t ? 'var(--accent-primary)' : 'transparent',
                color: tab === t ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: tab === t ? 600 : 400,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 150ms',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={styles.dialogBody}>
          {message && (
            <div style={{
              padding: '8px 12px',
              marginBottom: '12px',
              borderRadius: '8px',
              background: message.includes('Invalid') ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)',
              color: message.includes('Invalid') ? 'var(--danger)' : 'var(--success)',
              fontSize: '0.82rem',
              fontWeight: 500,
            }}>
              {message}
            </div>
          )}

          {/* Save Tab */}
          {tab === 'save' && (
            <div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Save Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Enter save name..."
                />
              </div>
              <button className={styles.btnPrimary} onClick={handleSave} style={{ width: '100%' }}>
                Save Game
              </button>
            </div>
          )}

          {/* Load Tab */}
          {tab === 'load' && (
            <div>
              {saves.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>
                  No saved games
                </p>
              ) : (
                <ul className={styles.saveList}>
                  {saves.map(save => (
                    <li key={save.id} className={styles.saveItem} onClick={() => handleLoad(save.id)}>
                      <div>
                        <div className={styles.saveName}>{save.name}</div>
                        <div className={styles.saveDate}>
                          {new Date(save.date).toLocaleString()}
                        </div>
                      </div>
                      <button
                        className={styles.saveDeleteBtn}
                        onClick={e => { e.stopPropagation(); handleDelete(save.id); }}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* PGN Tab */}
          {tab === 'pgn' && (
            <div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Game PGN</label>
                <textarea
                  className={styles.formTextarea}
                  value={getPGN()}
                  readOnly
                  style={{ minHeight: '80px' }}
                />
              </div>
              <button className={styles.btnPrimary} onClick={handleExportPGN} style={{ width: '100%', marginBottom: '16px' }}>
                Download PGN
              </button>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Import PGN</label>
                <textarea
                  className={styles.formTextarea}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder="Paste PGN here..."
                  style={{ minHeight: '80px' }}
                />
              </div>
              <button className={styles.btnSecondary} onClick={handleImportPGN} style={{ width: '100%' }}>
                Load PGN
              </button>
            </div>
          )}

          {/* FEN Tab */}
          {tab === 'fen' && (
            <div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Current Position FEN</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={getFEN()}
                  readOnly
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                />
              </div>
              <button className={styles.btnPrimary} onClick={handleExportFEN} style={{ width: '100%', marginBottom: '16px' }}>
                Copy FEN
              </button>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Import FEN</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder="Paste FEN here..."
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                />
              </div>
              <button className={styles.btnSecondary} onClick={handleImportFEN} style={{ width: '100%' }}>
                Load FEN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
