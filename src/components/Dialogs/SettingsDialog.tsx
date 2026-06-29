/**
 * Settings Dialog
 * Theme, board theme, piece theme, volume, animation speed, language
 */

'use client';

import React from 'react';
import { ThemeMode, BoardTheme, PieceTheme, Language } from '../../engine/types';
import { useSettingsStore } from '../../store/settingsStore';
import styles from './dialogs.module.css';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const settings = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>Settings</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.dialogBody}>
          {/* Theme Mode */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Theme</label>
            <div className={styles.toggleGroup}>
              <button
                className={settings.themeMode === ThemeMode.Dark ? styles.toggleOptionActive : styles.toggleOption}
                onClick={() => settings.setThemeMode(ThemeMode.Dark)}
              >
                🌙 Dark
              </button>
              <button
                className={settings.themeMode === ThemeMode.Light ? styles.toggleOptionActive : styles.toggleOption}
                onClick={() => settings.setThemeMode(ThemeMode.Light)}
              >
                ☀️ Light
              </button>
            </div>
          </div>

          {/* Board Theme */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Board Theme</label>
            <div className={styles.toggleGroup}>
              {[
                { value: BoardTheme.Classic, label: 'Classic' },
                { value: BoardTheme.Wood, label: 'Wood' },
                { value: BoardTheme.Blue, label: 'Blue' },
                { value: BoardTheme.Green, label: 'Green' },
                { value: BoardTheme.Purple, label: 'Purple' },
              ].map(opt => (
                <button
                  key={opt.value}
                  className={settings.boardTheme === opt.value ? styles.toggleOptionActive : styles.toggleOption}
                  onClick={() => settings.setBoardTheme(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Volume: {Math.round(settings.volume * 100)}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(settings.volume * 100)}
              onChange={e => settings.setVolume(parseInt(e.target.value) / 100)}
              className={styles.slider}
            />
          </div>

          {/* Animation Speed */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Animation Speed: {settings.animationSpeed}ms</label>
            <input
              type="range"
              min="0"
              max="500"
              step="50"
              value={settings.animationSpeed}
              onChange={e => settings.setAnimationSpeed(parseInt(e.target.value))}
              className={styles.slider}
            />
          </div>

          {/* Language */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Language</label>
            <div className={styles.toggleGroup}>
              <button
                className={settings.language === Language.English ? styles.toggleOptionActive : styles.toggleOption}
                onClick={() => settings.setLanguage(Language.English)}
              >
                English
              </button>
              <button
                className={settings.language === Language.Indonesian ? styles.toggleOptionActive : styles.toggleOption}
                onClick={() => settings.setLanguage(Language.Indonesian)}
              >
                Indonesian
              </button>
            </div>
          </div>
        </div>

        <div className={styles.dialogFooter}>
          <button className={styles.btnPrimary} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
