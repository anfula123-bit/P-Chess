'use client';

import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Color, CommanderType } from '../../engine/types';
import styles from './panel.module.css';

export default function CommanderPanel() {
  const gameState = useGameStore(s => s.gameState);
  const isSelectingShield = useGameStore(s => s.isSelectingShield);
  const setSelectingShield = useGameStore(s => s.setSelectingShield);
  const activateActiveSkill = useGameStore(s => s.activateActiveSkill);
  const endDoubleStepEarly = useGameStore(s => s.endDoubleStepEarly);

  const activeColor = gameState.activeColor;
  
  const renderCommanderCard = (color: Color) => {
    const comm = gameState.commanders[color];
    const isPlayerTurn = activeColor === color;
    const colorName = color === Color.White ? 'White' : 'Black';

    if (!comm.type) {
      return (
        <div className={`${styles.commCard} ${styles.noComm}`}>
          <h4>Player {colorName}</h4>
          <p>No Commander Selected</p>
        </div>
      );
    }

    const energy = comm.energy;
    const maxEnergy = 10;
    const canUseSkill = isPlayerTurn && energy >= 4 && !comm.skillUsedThisTurn && gameState.doubleStepMovesLeft === 0;

    const getCommanderDetails = (type: CommanderType) => {
      switch (type) {
        case CommanderType.Vandoria:
          return {
            title: 'Vandoria',
            sub: 'The Aggressor',
            avatar: '⚔️',
            activeSkill: 'Double Step',
            activeDesc: 'Bidak yang dipilih bergerak 2x. Capture pada langkah ke-1 tetap bisa lanjut.',
            passiveSkill: 'Momentum',
            passiveDesc: 'Setiap kali melakukan capture, energi bertambah +1.',
            cost: 4
          };
        case CommanderType.Valeria:
          return {
            title: 'Valeria',
            sub: 'The Protector',
            avatar: '🛡️',
            activeSkill: 'Divine Shield',
            activeDesc: 'Bidak kebal capture selama 1 putaran lawan.',
            passiveSkill: 'Guardian Aura',
            passiveDesc: 'Musuh yang meng-capture di sebelah Raja terkena efek slow (freeze 1 giliran).',
            cost: 4
          };
      }
    };

    const details = getCommanderDetails(comm.type);

    const handleSkillClick = () => {
      if (!canUseSkill) return;
      if (comm.type === CommanderType.Valeria) {
        setSelectingShield(true);
      } else {
        activateActiveSkill();
      }
    };

    return (
      <div className={`${styles.commCard} ${isPlayerTurn ? styles.activeCommCard : ''}`}>
        <div className={styles.commHeader}>
          <span className={styles.commAvatar}>{details.avatar}</span>
          <div className={styles.commMeta}>
            <h4 className={styles.commName}>{details.title}</h4>
            <span className={styles.commSub}>{details.sub}</span>
          </div>
          <span className={`${styles.sideBadge} ${color === Color.White ? styles.sideWhite : styles.sideBlack}`}>
            {colorName}
          </span>
        </div>

        {/* Energy Bar */}
        <div className={styles.energyWrapper}>
          <div className={styles.energyHeader}>
            <span>Energy Bar</span>
            <span className={styles.energyText}>{energy} / {maxEnergy}</span>
          </div>
          <div className={styles.energyBarBg}>
            <div 
              className={styles.energyBarFill} 
              style={{ width: `${(energy / maxEnergy) * 100}%` }}
            ></div>
            {/* Energy ticks */}
            <div className={styles.energyTicks}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={styles.tick} />
              ))}
            </div>
          </div>
        </div>

        {/* Skills description */}
        <div className={styles.skillsSection}>
          <div className={styles.skillRow}>
            <strong>ACTIVE: {details.activeSkill} <span className={styles.costBadge}>Cost {details.cost}</span></strong>
            <p className={styles.skillDesc}>{details.activeDesc}</p>
          </div>
          <div className={styles.skillRow}>
            <strong>PASSIVE: {details.passiveSkill}</strong>
            <p className={styles.skillDesc}>{details.passiveDesc}</p>
          </div>
        </div>

        {/* Action Button */}
        {isPlayerTurn && (
          <div className={styles.actionsWrapper}>
            {comm.type === CommanderType.Valeria && isSelectingShield ? (
              <button 
                className={`${styles.skillBtn} ${styles.selectingTarget}`}
                onClick={() => setSelectingShield(false)}
              >
                Cancel Target Selection
              </button>
            ) : (
              <button 
                className={styles.skillBtn}
                disabled={!canUseSkill}
                onClick={handleSkillClick}
              >
                {comm.skillUsedThisTurn ? 'Skill Used This Turn' : `Activate ${details.activeSkill}`}
              </button>
            )}

            {/* End double step early button */}
            {comm.type === CommanderType.Vandoria && gameState.doubleStepMovesLeft > 0 && (
              <button 
                className={`${styles.skillBtn} ${styles.endTurnEarly}`}
                onClick={() => endDoubleStepEarly()}
              >
                End Turn Early (Double Step)
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.commanderPanel}>
      <h3 className={styles.panelTitle}>👑 Commanders</h3>
      {isSelectingShield && (
        <div className={styles.targetAlert}>
          🛡️ Select a friendly piece on the board to protect.
        </div>
      )}
      {gameState.doubleStepMovesLeft > 0 && (
        <div className={`${styles.targetAlert} ${styles.doubleStepAlert}`}>
          ⚡ Double Step Active! Move the selected piece again, or click "End Turn Early".
        </div>
      )}
      <div className={styles.commCardsContainer}>
        {renderCommanderCard(Color.White)}
        {renderCommanderCard(Color.Black)}
      </div>
    </div>
  );
}
