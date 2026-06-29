'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { Color, CommanderType, TimerPreset } from '../engine/types';
import { supabase } from '../utils/supabase';

export function useMultiplayerSync() {
  const isOnline = useGameStore(s => s.isOnline);
  const roomCode = useGameStore(s => s.roomCode);
  const myColor = useGameStore(s => s.myColor);
  const setBroadcastAction = useGameStore(s => s.setBroadcastAction);
  const setupOnlineMatch = useGameStore(s => s.setupOnlineMatch);
  
  const receiveOpponentMove = useGameStore(s => s.receiveOpponentMove);
  const receiveOpponentSkill = useGameStore(s => s.receiveOpponentSkill);
  const receiveOpponentEndDoubleStep = useGameStore(s => s.receiveOpponentEndDoubleStep);
  const receiveOpponentResign = useGameStore(s => s.receiveOpponentResign);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !roomCode) return;

    // Connect to Supabase Realtime Channel for this room
    const channel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: {
          self: false, // Don't echo broadcast events back to sender
        },
      },
    });
    channelRef.current = channel;

    // Register broadcast sender callback in gameStore
    setBroadcastAction((actionType, payload) => {
      const currentRoom = useGameStore.getState().roomCode;
      if (!currentRoom) return;

      channel.send({
        type: 'broadcast',
        event: actionType,
        payload: {
          roomCode: currentRoom,
          senderColor: useGameStore.getState().myColor,
          actionType,
          payload
        }
      });
    });

    // Listen for incoming messages on Supabase Realtime Channel
    const handleMessage = (event: any) => {
      const { roomCode: msgRoomCode, senderColor, actionType, payload } = event.payload;
      
      const currentRoom = useGameStore.getState().roomCode;
      const currentOnline = useGameStore.getState().isOnline;
      const currentMyColor = useGameStore.getState().myColor;

      // 1. Room Connection Handshake
      if (actionType === 'JOIN' && msgRoomCode === currentRoom && currentMyColor === Color.White) {
        const localWhiteComm = useGameStore.getState().gameState.commanders.w.type || CommanderType.Vandoria;
        const opponentBlackComm = payload.blackCommander || CommanderType.Valeria;
        const preset = useGameStore.getState().timerPreset;

        setupOnlineMatch(
          currentRoom!, 
          Color.White, 
          localWhiteComm, 
          opponentBlackComm, 
          preset
        );

        // Notify Black that room is ready and send game settings
        channel.send({
          type: 'broadcast',
          event: 'ROOM_READY',
          payload: {
            roomCode: currentRoom,
            senderColor: Color.White,
            actionType: 'ROOM_READY',
            payload: {
              whiteCommander: localWhiteComm,
              blackCommander: opponentBlackComm,
              timerPreset: preset
            }
          }
        });
        return;
      }

      if (actionType === 'ROOM_READY' && msgRoomCode === currentRoom && currentMyColor === Color.Black && !currentOnline) {
        const { whiteCommander, blackCommander, timerPreset } = payload;
        setupOnlineMatch(
          currentRoom!,
          Color.Black,
          whiteCommander,
          blackCommander,
          timerPreset
        );
        return;
      }

      // 2. In-game Actions Sync
      if (msgRoomCode !== currentRoom || !currentOnline || senderColor === currentMyColor) {
        return;
      }

      switch (actionType) {
        case 'MOVE':
          receiveOpponentMove(payload.from, payload.to, payload.promotion);
          break;
        case 'SKILL':
          receiveOpponentSkill(payload.targetSquare);
          break;
        case 'END_DOUBLE_STEP':
          receiveOpponentEndDoubleStep();
          break;
        case 'RESIGN':
          receiveOpponentResign();
          break;
      }
    };

    // Bind event handler and subscribe to channel
    channel
      .on('broadcast', { event: '*' }, handleMessage)
      .subscribe();

    return () => {
      channel.unsubscribe();
      setBroadcastAction(null);
    };
  }, [
    roomCode,
    setBroadcastAction, 
    setupOnlineMatch, 
    receiveOpponentMove, 
    receiveOpponentSkill, 
    receiveOpponentEndDoubleStep, 
    receiveOpponentResign
  ]);
}
