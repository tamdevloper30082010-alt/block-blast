import { createClient } from '@supabase/supabase-js';
import type { Card } from './tienlen/cards';

const SUPABASE_URL = 'https://jdwohshmxzipjzzmygqx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nODbi7QXyXbvP-60uaTHEA_0FCE2xnN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});

export type GameType = 'block-blast' | 'tienlen';

export type Room = {
  id: string;
  code: string;
  host_name: string;
  host_id: string;
  duration_seconds: number;
  max_players: number;
  status: 'waiting' | 'playing' | 'finished';
  started_at: string | null;
  ends_at: string | null;
  game_type: GameType;
  game_state: any | null;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  player_id: string;
  name: string;
  score: number;
  board: number[][];
  is_alive: boolean;
  combo: number;
  is_bot: boolean;
  pieces: any[] | null;
  last_active_at: string;
  joined_at: string;
};

// Tiến Lên game state stored in rooms.game_state
export type TienLenPlay = {
  playerId: string;
  cards: Card[];
  type: string;
  playedAt: number;
};

export type TienLenState = {
  deckSeed: number;
  hands: Record<string, Card[]>; // player_id -> hand
  turnOrder: string[]; // player_ids in seating order
  currentTurn: string | null; // player_id whose turn it is
  currentPlay: TienLenPlay | null;
  passCount: number;
  winner: string | null;
  lastWinner: string | null; // winner of last round (starts next)
  startedAt: number;
};
