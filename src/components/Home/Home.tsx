'use client';

import React, { useState, useEffect } from 'react';
import { GameMode, TimerPreset, Color, CommanderType } from '../../engine/types';
import { useGameStore } from '../../store/gameStore';
import { useTimerStore } from '../../store/timerStore';
import { newGame } from '../../engine/game';
import { supabase } from '../../utils/supabase';
// Supabase production integration trigger
import styles from './home.module.css';

interface MatchRecord {
  id: string;
  opponentName: string;
  playerColor: 'White' | 'Black';
  result: 'win' | 'loss' | 'draw';
  date: string;
  movesCount: number;
}

interface UserProfile {
  username: string;
  avatar: string; // Emoji avatar
  level: number;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  matchHistory: MatchRecord[];
}

const DEFAULT_AVATARS = ['👑', '⚔️', '🛡️', '🦄', '🐉', '🦊', '🦉', '🦁', '🧙', '🥷'];

interface HomeProps {
  onSettings: () => void;
}

export default function Home({ onSettings }: HomeProps) {
  const startNewGame = useGameStore(s => s.startNewGame);
  const initTimer = useTimerStore(s => s.initTimer);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  
  // Matchmaking / Custom PvP options
  const [timerPreset, setTimerPreset] = useState<TimerPreset>(TimerPreset.Rapid);
  const [whiteComm, setWhiteComm] = useState<CommanderType>(CommanderType.Vandoria);
  const [blackComm, setBlackComm] = useState<CommanderType>(CommanderType.Valeria);

  // Online Multiplayer States
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');
  const [roomInput, setRoomInput] = useState('');
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState('');

  // Load profile from localStorage or create a default one
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = localStorage.getItem('chess_commander_profile');
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch (e) {
        initializeDefaultProfile();
      }
    } else {
      initializeDefaultProfile();
    }
  }, []);

  const initializeDefaultProfile = () => {
    const defaultProfile: UserProfile = {
      username: 'Grandmaster',
      avatar: '👑',
      level: 1,
      xp: 45,
      wins: 8,
      losses: 4,
      draws: 2,
      matchHistory: [
        {
          id: '1',
          opponentName: 'Player 2',
          playerColor: 'White',
          result: 'win',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString(),
          movesCount: 34
        },
        {
          id: '2',
          opponentName: 'Player 2',
          playerColor: 'Black',
          result: 'loss',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          movesCount: 42
        },
        {
          id: '3',
          opponentName: 'Guest 104',
          playerColor: 'White',
          result: 'draw',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          movesCount: 28
        }
      ]
    };
    saveProfile(defaultProfile);
  };

  const saveProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('chess_commander_profile', JSON.stringify(updatedProfile));
  };

  const handleUpdateUsername = () => {
    if (newUsername.trim() && profile) {
      const updated = { ...profile, username: newUsername.trim() };
      saveProfile(updated);
      setIsEditingUsername(false);
    }
  };

  const handleSelectAvatar = (avatar: string) => {
    if (profile) {
      const updated = { ...profile, avatar };
      saveProfile(updated);
      setShowAvatarSelector(false);
    }
  };

  const handleStartGame = () => {
    // Start PvP match (local)
    startNewGame(GameMode.PvP, undefined, Color.White, timerPreset, whiteComm, blackComm);
    initTimer(timerPreset);
  };

  const handleCreateRoom = async () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCreatedRoomCode(code);
    setIsWaitingForOpponent(true);
    
    // Set store state for White creator
    useGameStore.setState({
      roomCode: code,
      myColor: Color.White,
      isOnline: true,
      timerPreset: timerPreset,
      view: 'home'
    });
    
    // Initialize the game parameters in the store
    const freshGame = newGame();
    freshGame.commanders = {
      w: { type: whiteComm, energy: 3, skillUsedThisTurn: false },
      b: { type: null, energy: 3, skillUsedThisTurn: false },
    };
    useGameStore.setState({ gameState: freshGame });

    // Attempt database insert
    const { error: insertError } = await supabase.from('matches').insert({
      room_code: code,
      white_commander: whiteComm,
      timer_preset: timerPreset,
      status: 'waiting'
    });
    if (insertError) {
      console.error('Supabase DB Insert Error:', insertError);
    }
  };

  const handleJoinRoom = async () => {
    const code = roomInput.trim();
    if (!code) return;

    // Set store state for Black
    useGameStore.setState({
      roomCode: code,
      myColor: Color.Black,
      isOnline: false
    });

    // Attempt database update
    const { error: updateError } = await supabase.from('matches').update({
      status: 'active',
      black_commander: blackComm
    }).eq('room_code', code);
    if (updateError) {
      console.error('Supabase DB Update Error:', updateError);
    }

    // Send JOIN request directly via Supabase Realtime Channel
    const channel = supabase.channel(`room:${code}`);
    
    const sendJoin = () => {
      channel.send({
        type: 'broadcast',
        event: 'JOIN',
        payload: {
          roomCode: code,
          senderColor: Color.Black,
          actionType: 'JOIN',
          payload: {
            blackCommander: blackComm
          }
        }
      });
    };

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        sendJoin();
        
        // Poll JOIN requests every 1.5 seconds
        const interval = setInterval(() => {
          const isOnlineNow = useGameStore.getState().isOnline;
          if (isOnlineNow) {
            clearInterval(interval);
            channel.unsubscribe();
          } else {
            sendJoin();
          }
        }, 1500);

        // Safety timeout to stop polling after 20 seconds if host doesn't respond
        setTimeout(() => {
          clearInterval(interval);
          channel.unsubscribe();
        }, 20000);
      }
    });
  };

  if (!profile) return <div className={styles.loading}>Loading Profile...</div>;

  const totalGames = profile.wins + profile.losses + profile.draws;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;
  const nextLevelXp = profile.level * 100;
  const xpPercentage = Math.min(100, Math.round((profile.xp / nextLevelXp) * 100));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <span className={styles.logoIcon}>👑</span>
          <h1 className={styles.logoText}>CHESS<span>COMMANDER</span></h1>
        </div>
        <button className={styles.settingsBtn} onClick={onSettings} title="Settings">
          ⚙️ Settings
        </button>
      </header>

      <main className={styles.grid}>
        {/* Left column: Profile & Stats */}
        <section className={styles.leftCol}>
          {/* Profile Card */}
          <div className={styles.card}>
            <div className={styles.profileHeader}>
              <div className={styles.avatarWrapper}>
                <span className={styles.avatar} onClick={() => setShowAvatarSelector(!showAvatarSelector)}>
                  {profile.avatar}
                </span>
                <button className={styles.editAvatarBtn} onClick={() => setShowAvatarSelector(!showAvatarSelector)}>
                  ✏️
                </button>
                {showAvatarSelector && (
                  <div className={styles.avatarSelector}>
                    {DEFAULT_AVATARS.map(av => (
                      <button key={av} className={styles.avatarOpt} onClick={() => handleSelectAvatar(av)}>
                        {av}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.nameDetails}>
                {isEditingUsername ? (
                  <div className={styles.editInputWrapper}>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      placeholder="Username"
                      className={styles.usernameInput}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdateUsername();
                        if (e.key === 'Escape') setIsEditingUsername(false);
                      }}
                    />
                    <button className={styles.saveNameBtn} onClick={handleUpdateUsername}>✓</button>
                  </div>
                ) : (
                  <div className={styles.nameDisplayWrapper}>
                    <h2 className={styles.username}>{profile.username}</h2>
                    <button
                      className={styles.editNameBtn}
                      onClick={() => {
                        setNewUsername(profile.username);
                        setIsEditingUsername(true);
                      }}
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <div className={styles.badge}>RANKED PLAYER</div>
              </div>
            </div>

            {/* Level & XP bar */}
            <div className={styles.levelSection}>
              <div className={styles.levelInfo}>
                <span className={styles.levelBadge}>LVL {profile.level}</span>
                <span className={styles.xpText}>{profile.xp} / {nextLevelXp} XP</span>
              </div>
              <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: `${xpPercentage}%` }}></div>
              </div>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📊 Combat Statistics</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Matches</span>
                <span className={styles.statVal}>{totalGames}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Win Rate</span>
                <span className={styles.statVal}>{winRate}%</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Wins</span>
                <span className={`${styles.statVal} ${styles.winText}`}>{profile.wins}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Losses</span>
                <span className={`${styles.statVal} ${styles.lossText}`}>{profile.losses}</span>
              </div>
            </div>

            {/* Circular Win Rate visual decoration */}
            <div className={styles.progressCircleContainer}>
              <svg className={styles.svgCircle} viewBox="0 0 36 36">
                <path
                  className={styles.circleBg}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={styles.circleFill}
                  strokeDasharray={`${winRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className={styles.circleText}>
                  {winRate}%
                </text>
              </svg>
              <div className={styles.circleLegend}>Win Ratio Status</div>
            </div>
          </div>
        </section>

        {/* Right column: Play Setup & Recent Matches */}
        <section className={styles.rightCol}>
          {/* Play Panel */}
          <div className={`${styles.card} ${styles.playCard}`}>
            <div className={styles.tabHeader}>
              <button 
                className={activeTab === 'local' ? styles.tabBtnActive : styles.tabBtn}
                onClick={() => setActiveTab('local')}
              >
                Local PvP
              </button>
              <button 
                className={activeTab === 'online' ? styles.tabBtnActive : styles.tabBtn}
                onClick={() => setActiveTab('online')}
              >
                Online PvP (Demo)
              </button>
            </div>

            {activeTab === 'local' ? (
              <>
                <p className={styles.playDesc}>Start a local dual match and practice your tactical skills.</p>
                
                {/* Time Control Options */}
                <div className={styles.timeGroup}>
                  <label className={styles.sectionLabel}>Select Time Control:</label>
                  <div className={styles.timerOptions}>
                    {[
                      { value: TimerPreset.Blitz, label: '⚡ Blitz (3+2)' },
                      { value: TimerPreset.Rapid, label: '⏳ Rapid (10+5)' },
                      { value: TimerPreset.Classical, label: '🏆 Classic (30+0)' },
                      { value: TimerPreset.Unlimited, label: '∞ Unlimited' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        className={timerPreset === opt.value ? styles.timeOptionActive : styles.timeOption}
                        onClick={() => setTimerPreset(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commander Selection */}
                <div className={styles.timeGroup}>
                  <label className={styles.sectionLabel}>Select White Commander:</label>
                  <div className={styles.timerOptions}>
                    <button
                      className={whiteComm === CommanderType.Vandoria ? styles.timeOptionActive : styles.timeOption}
                      onClick={() => setWhiteComm(CommanderType.Vandoria)}
                    >
                      ⚔️ Vandoria
                    </button>
                    <button
                      className={whiteComm === CommanderType.Valeria ? styles.timeOptionActive : styles.timeOption}
                      onClick={() => setWhiteComm(CommanderType.Valeria)}
                    >
                      🛡️ Valeria
                    </button>
                  </div>
                </div>

                <div className={styles.timeGroup}>
                  <label className={styles.sectionLabel}>Select Black Commander:</label>
                  <div className={styles.timerOptions}>
                    <button
                      className={blackComm === CommanderType.Vandoria ? styles.timeOptionActive : styles.timeOption}
                      onClick={() => setBlackComm(CommanderType.Vandoria)}
                    >
                      ⚔️ Vandoria
                    </button>
                    <button
                      className={blackComm === CommanderType.Valeria ? styles.timeOptionActive : styles.timeOption}
                      onClick={() => setBlackComm(CommanderType.Valeria)}
                    >
                      🛡️ Valeria
                    </button>
                  </div>
                </div>

                <button className={styles.playBtn} onClick={handleStartGame}>
                  Play Local PvP
                </button>
              </>
            ) : (
              <>
                {isWaitingForOpponent ? (
                  <div className={styles.waitingLobby}>
                    <div className={styles.lobbySpinner}></div>
                    <div className={styles.lobbyCodeWrapper}>
                      <span className={styles.lobbyCodeLabel}>SHARE ROOM CODE</span>
                      <span className={styles.lobbyCodeVal}>{createdRoomCode}</span>
                    </div>
                    <p className={styles.lobbyStatusText}>Waiting for opponent to connect in another tab...</p>
                    <button 
                      className={`${styles.playBtn} ${styles.cancelLobbyBtn}`}
                      onClick={() => {
                        setIsWaitingForOpponent(false);
                        useGameStore.setState({ roomCode: null, myColor: null, isOnline: false });
                      }}
                    >
                      Cancel Room
                    </button>
                  </div>
                ) : (
                  <div className={styles.onlineSetup}>
                    {/* HOST GAME */}
                    <div className={styles.onlineSection}>
                      <h4 className={styles.setupSub}>Host Game (White)</h4>
                      
                      <div className={styles.timeGroup}>
                        <label className={styles.sectionLabel}>Commander:</label>
                        <div className={styles.timerOptions}>
                          <button
                            className={whiteComm === CommanderType.Vandoria ? styles.timeOptionActive : styles.timeOption}
                            onClick={() => setWhiteComm(CommanderType.Vandoria)}
                          >
                            ⚔️ Vandoria
                          </button>
                          <button
                            className={whiteComm === CommanderType.Valeria ? styles.timeOptionActive : styles.timeOption}
                            onClick={() => setWhiteComm(CommanderType.Valeria)}
                          >
                            🛡️ Valeria
                          </button>
                        </div>
                      </div>

                      <div className={styles.timeGroup}>
                        <label className={styles.sectionLabel}>Time Control:</label>
                        <div className={styles.timerOptions}>
                          {[
                            { value: TimerPreset.Blitz, label: '⚡ Blitz' },
                            { value: TimerPreset.Rapid, label: '⏳ Rapid' },
                            { value: TimerPreset.Classical, label: '🏆 Classic' },
                            { value: TimerPreset.Unlimited, label: '∞' },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              className={timerPreset === opt.value ? styles.timeOptionActive : styles.timeOption}
                              onClick={() => setTimerPreset(opt.value)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button className={styles.playBtn} onClick={handleCreateRoom}>
                        Create Room
                      </button>
                    </div>

                    <div className={styles.divider}><span>OR</span></div>

                    {/* JOIN GAME */}
                    <div className={styles.onlineSection}>
                      <h4 className={styles.setupSub}>Join Game (Black)</h4>
                      
                      <div className={styles.timeGroup}>
                        <label className={styles.sectionLabel}>Commander:</label>
                        <div className={styles.timerOptions}>
                          <button
                            className={blackComm === CommanderType.Vandoria ? styles.timeOptionActive : styles.timeOption}
                            onClick={() => setBlackComm(CommanderType.Vandoria)}
                          >
                            ⚔️ Vandoria
                          </button>
                          <button
                            className={blackComm === CommanderType.Valeria ? styles.timeOptionActive : styles.timeOption}
                            onClick={() => setBlackComm(CommanderType.Valeria)}
                          >
                            🛡️ Valeria
                          </button>
                        </div>
                      </div>

                      <div className={styles.timeGroup}>
                        <label className={styles.sectionLabel}>Enter Room Code:</label>
                        <input
                          type="text"
                          placeholder="e.g. 5829"
                          value={roomInput}
                          onChange={e => setRoomInput(e.target.value)}
                          className={styles.roomInput}
                        />
                      </div>

                      <button className={styles.playBtn} onClick={handleJoinRoom}>
                        Join Room
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recent Matches */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📜 Recent Match Log</h3>
            <div className={styles.matchList}>
              {profile.matchHistory.length === 0 ? (
                <div className={styles.emptyMatches}>No matches played yet.</div>
              ) : (
                profile.matchHistory.slice(0, 5).map(record => (
                  <div key={record.id} className={styles.matchItem}>
                    <div className={styles.matchMeta}>
                      <span className={styles.opponent}>vs {record.opponentName}</span>
                      <span className={styles.date}>{record.date}</span>
                    </div>
                    <div className={styles.matchResultWrapper}>
                      <span className={`${styles.badgeColor} ${record.playerColor === 'White' ? styles.badgeWhite : styles.badgeBlack}`}>
                        {record.playerColor}
                      </span>
                      <span className={styles.movesCount}>{record.movesCount} moves</span>
                      <span className={`${styles.matchResult} ${styles[record.result]}`}>
                        {record.result.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
