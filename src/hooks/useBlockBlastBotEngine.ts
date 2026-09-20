// Bot engine for Block Blast — runs bot moves automatically

import { useEffect, useRef } from 'react';
import { supabase, type Player } from '../lib/supabase';
import { decideBotMove, applyBotMove } from '../lib/bots/blockBlastBot';
import type { Piece } from '../lib/pieces';

export function useBlockBlastBotEngine(
  players: Player[],
  isHost: boolean,
  enabled: boolean
) {
  const tickingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isHost) return;

    const bots = players.filter(p => p.is_bot && p.pieces && p.pieces.length > 0);
    if (bots.length === 0) return;

    const interval = setInterval(async () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      try {
        const now = Date.now();
        // Each bot moves every ~2s, offset by index
        for (const bot of bots) {
          const lastActive = new Date(bot.last_active_at).getTime();
          const botOffset = bots.indexOf(bot) * 600;
          if (now - lastActive < 1800 + botOffset) continue;

          const pieces = bot.pieces as (Piece | null)[];
          const board = bot.board || [];
          const move = decideBotMove(board, pieces, bot.combo || 0);
          if (!move) continue;

          const playerNum = players.findIndex(p => p.id === bot.id) + 1;
          const { newBoard, newPieces, newScore, newCombo } = applyBotMove(
            board,
            pieces,
            move,
            playerNum
          );

          await supabase.from('players').update({
            board: newBoard,
            pieces: newPieces,
            score: bot.score + newScore,
            combo: newCombo,
            last_active_at: new Date().toISOString(),
          }).eq('id', bot.id);
        }
      } finally {
        tickingRef.current = false;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [players.length, isHost, enabled]);
}
