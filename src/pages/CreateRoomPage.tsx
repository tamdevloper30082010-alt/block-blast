import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Users, Gamepad2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { GameType } from '../lib/supabase';
import { generateRoomCode } from '../lib/gameLogic';
import { getPlayerId, getDisplayName, setDisplayName } from '../lib/identity';
import { sfx, initAudio } from '../lib/audio';

const DURATIONS = [
  { label: '1 phút', value: 60 },
  { label: '2 phút', value: 120 },
  { label: '3 phút', value: 180 },
  { label: '5 phút', value: 300 },
];

const PLAYER_COUNTS = [2, 3, 4];

const GAMES = [
  { id: 'block-blast', title: 'Block Blast', emoji: '🧩', desc: 'Xếp khối thi đấu điểm' },
  { id: 'tienlen', title: 'Tiến Lên', emoji: '🃏', desc: 'Đánh bài hết trước thắng' },
];

export default function CreateRoomPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const initialGame = (searchParams.get('game') as GameType) || 'block-blast';

  const [name, setName] = useState(getDisplayName());
  const [gameType, setGameType] = useState<GameType>(initialGame);
  const [duration, setDuration] = useState(180);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialGame === 'tienlen') {
      setDuration(0); // Tiến Lên doesn't use timer
      setMaxPlayers(4);
    } else {
      setDuration(180);
      setMaxPlayers(4);
    }
  }, [gameType]);

  const isTienLen = gameType === 'tienlen';

  const create = async () => {
    initAudio();
    if (!name.trim()) {
      setError('Vui lòng nhập tên');
      sfx.error();
      return;
    }
    setError('');
    setLoading(true);
    sfx.click();
    setDisplayName(name.trim());

    const playerId = getPlayerId();

    let attempts = 0;
    while (attempts < 5) {
      const code = generateRoomCode();
      const insertData: any = {
        code,
        host_name: name.trim(),
        host_id: playerId,
        duration_seconds: isTienLen ? 0 : duration,
        max_players: maxPlayers,
        status: 'waiting',
        game_type: gameType,
      };

      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .insert(insertData)
        .select()
        .single();

      if (roomErr) {
        if (roomErr.code === '23505') {
          attempts++;
          continue;
        }
        setError(roomErr.message);
        setLoading(false);
        sfx.error();
        return;
      }

      const emptyBoard = Array.from({ length: 8 }, () => Array(8).fill(0));
      const { error: playerErr } = await supabase.from('players').insert({
        room_id: room.id,
        player_id: playerId,
        name: name.trim(),
        board: emptyBoard,
        score: 0,
        is_alive: true,
      });

      if (playerErr) {
        setError(playerErr.message);
        setLoading(false);
        sfx.error();
        return;
      }

      sessionStorage.setItem(`bba.roomHost.${room.id}`, '1');
      nav(`/room/${room.code}`);
      return;
    }

    setError('Không thể tạo phòng, thử lại sau');
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-md w-full"
      >
        <button
          onClick={() => { sfx.click(); nav('/'); }}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Quay lại</span>
        </button>

        <div className="card">
          <h1 className="font-display text-3xl font-bold mb-2">Tạo phòng</h1>
          <p className="text-white/50 mb-8">Mời bạn bè vào cùng chơi</p>

          <div className="space-y-6">
            <div>
              <label className="text-sm text-white/60 mb-2 font-medium flex items-center gap-1.5">
                <Gamepad2 size={14} />
                Chọn game
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GAMES.map(g => (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setGameType(g.id as GameType); sfx.click(); }}
                    className={`p-3 rounded-2xl transition-all text-left ${
                      gameType === g.id
                        ? 'bg-gradient-to-br from-neon-purple/30 to-neon-pink/30 border-2 border-neon-purple shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                        : 'bg-white/5 hover:bg-white/10 border-2 border-transparent text-white/70'
                    }`}
                  >
                    <div className="text-2xl mb-1">{g.emoji}</div>
                    <div className="font-semibold text-sm">{g.title}</div>
                    <div className="text-xs text-white/40 mt-0.5">{g.desc}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2 font-medium">Tên hiển thị</label>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nhập tên của bạn"
                maxLength={20}
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-2 font-medium flex items-center gap-1.5">
                <Users size={14} />
                Số người chơi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PLAYER_COUNTS.map(n => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setMaxPlayers(n); sfx.click(); }}
                    className={`py-3 rounded-2xl font-semibold transition-all ${
                      maxPlayers === n
                        ? 'bg-gradient-to-r from-neon-purple to-neon-pink text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]'
                        : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                    }`}
                  >
                    {n} người
                  </motion.button>
                ))}
              </div>
            </div>

            {!isTienLen && (
              <div>
                <label className="block text-sm text-white/60 mb-2 font-medium">Thời lượng trận đấu</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d => (
                    <motion.button
                      key={d.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setDuration(d.value); sfx.click(); }}
                      className={`py-3 rounded-2xl font-semibold transition-all ${
                        duration === d.value
                          ? 'bg-gradient-to-r from-neon-cyan to-neon-purple text-white shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                          : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                      }`}
                    >
                      {d.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {isTienLen && (
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white/60">
                ⏱️ Tiến Lên chơi đến khi có người hết bài — không giới hạn thời gian
              </div>
            )}

            {error && (
              <motion.div
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: [0, -8, 8, -8, 8, 0], opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="px-4 py-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200 text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={create}
              disabled={loading}
              className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>Tạo phòng</>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
