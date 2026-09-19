import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdwohshmxzipjzzmygqx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nODbi7QXyXbvP-60uaTHEA_0FCE2xnN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: { eventsPerSecond: 20 },
  },
});

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
  last_active_at: string;
  joined_at: string;
};
