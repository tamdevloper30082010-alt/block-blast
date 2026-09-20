import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, Home } from 'lucide-react';
import { supabase, type Room, type Player, type TienLenState } from '../lib/supabase';
import { sfx } from '../lib/audio';

export default function TienLenResultsPage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [state, setState] = useState<TienLenState | null>(null);

  useEffect(() => {
    if (!code) return;
    load();
  }, [code]);

  useEffect(() => {
    if (players.length > 0) sfx.win();
  }, [players.length]);

  async function load() {
    const { data: roomData } = await supabase.from('rooms').select('*').eq('code', code).single();
    if (!roomData) return;
    setRoom(roomData);
    setState(roomData.game_state as TienLenState);
    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('joined_at', { ascending: true });
    setPlayers(playerData || []);
  }

  if (!room || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60 animate-pulse">Đang tải kết quả...</div>
      </div>
    );
  }

  // Ranking: winner first, then by hand size (less = better)
  const ranked = [...players].sort((a, b) => {
    const aHand = state.hands[a.player_id]?.length ?? 0;
    const bHand = state.hands[b.player_id]?.length ?? 0;
    if (a.player_id === state.winner) return -1;
    if (b.player_id === state.winner) return 1;
    return aHand - bHand;
  });

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const podiumColors = [
    { bg: 'from-yellow-400 to-yellow-600', icon: Crown, color: '#facc15' },
    { bg: 'from-gray-300 to-gray-500', icon: Medal, color: '#d1d5db' },
    { bg: 'from-orange-400 to-orange-700', icon: Award, color: '#fb923c' },
  ];

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col items-center">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8 mt-4"
        >
          <div className="text-6xl mb-2">🏆</div>
          <h1 className="font-display text-4xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 bg-clip-text text-transparent">
            Kết quả
          </h1>
        </motion.div>

        {top3.length > 0 && (
          <div className="flex items-end justify-center gap-2 mb-8 px-2">
            {top3[1] && (
              <Podium
                player={top3[1]}
                place={2}
                color={podiumColors[1]}
                delay={0.3}
                height={100}
                handSize={state.hands[top3[1].player_id]?.length}
              />
            )}
            {top3[0] && (
              <Podium
                player={top3[0]}
                place={1}
                color={podiumColors[0]}
                delay={0.1}
                height={130}
                isWinner={top3[0].player_id === state.winner}
                handSize={state.hands[top3[0].player_id]?.length}
              />
            )}
            {top3[2] && (
              <Podium
                player={top3[2]}
                place={3}
                color={podiumColors[2]}
                delay={0.5}
                height={80}
                handSize={state.hands[top3[2].player_id]?.length}
              />
            )}
          </div>
        )}

        {rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="card mb-6"
          >
            <div className="space-y-2">
              {rest.map((p, idx) => (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
                  <span className="text-white/40 font-bold w-6">{idx + 4}.</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-white/60 text-sm">{state.hands[p.player_id]?.length ?? 0} lá</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { sfx.click(); nav('/'); }}
          className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
        >
          <Home size={20} />
          Về trang chủ
        </motion.button>
      </div>
    </div>
  );
}

function Podium({ player, place, color, delay, height, isWinner, handSize }: {
  player: Player;
  place: number;
  color: { bg: string; icon: any; color: string };
  delay: number;
  height: number;
  isWinner?: boolean;
  handSize?: number;
}) {
  const Icon = color.icon;
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', damping: 12 }}
      className="flex-1 flex flex-col items-center"
    >
      <div className="mb-2 flex flex-col items-center">
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
        >
          <Icon size={32} style={{ color: color.color }} />
        </motion.div>
        <div className="text-xs font-medium mt-1 truncate max-w-full">{player.name}</div>
        <div className="text-xs text-white/50">{isWinner ? 'Về nhất' : handSize !== undefined ? `${handSize} lá` : ''}</div>
      </div>
      <div
        className={`w-full rounded-t-2xl bg-gradient-to-b ${color.bg} flex items-center justify-center font-display text-3xl font-bold shadow-lg`}
        style={{ height, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
      >
        {place}
      </div>
    </motion.div>
  );
}
