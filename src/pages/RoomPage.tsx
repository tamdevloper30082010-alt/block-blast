import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, Play, Crown, ArrowLeft, LogOut } from 'lucide-react';
import { supabase, type Room, type Player } from '../lib/supabase';
import { getPlayerId } from '../lib/identity';
import { sfx } from '../lib/audio';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const playerId = getPlayerId();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!code) return;
    loadRoom();

    // Subscribe to room + players changes
    const ch = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => loadRoom())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadRoom())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [code]);

  // Navigate to game when status becomes 'playing'
  useEffect(() => {
    if (room?.status === 'playing') {
      nav(`/game/${code}`);
    }
  }, [room?.status, code, nav]);

  async function loadRoom() {
    const { data: roomData, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single();
    if (roomErr || !roomData) {
      setError('Phòng không tồn tại');
      return;
    }
    setRoom(roomData);

    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id)
      .order('joined_at', { ascending: true });
    setPlayers(playerData || []);
  }

  const isHost = room?.host_id === playerId;
  const amIInRoom = players.some(p => p.player_id === playerId);

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    sfx.click();
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = async () => {
    if (!room || !isHost) return;
    if (players.length < 1) return;
    sfx.click();
    const now = new Date();
    const ends = new Date(now.getTime() + room.duration_seconds * 1000);
    const { error } = await supabase
      .from('rooms')
      .update({
        status: 'playing',
        started_at: now.toISOString(),
        ends_at: ends.toISOString(),
      })
      .eq('id', room.id);
    if (error) setError(error.message);
  };

  const leaveRoom = async () => {
    if (!room) return;
    sfx.click();
    if (isHost) {
      // Host leaves → delete room (cascade deletes players)
      await supabase.from('rooms').delete().eq('id', room.id);
    } else {
      await supabase.from('players').delete().eq('room_id', room.id).eq('player_id', playerId);
    }
    nav('/');
  };

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="card text-center max-w-sm">
          <div className="text-5xl mb-4">😢</div>
          <h2 className="text-xl font-bold mb-2">{error}</h2>
          <button onClick={() => nav('/')} className="btn-primary mt-4">Về trang chủ</button>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/60 animate-pulse">Đang tải phòng...</div>
      </div>
    );
  }

  const minutes = Math.floor(room.duration_seconds / 60);

  return (
    <div className="min-h-screen p-4 md:p-6 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { sfx.click(); leaveRoom(); }} className="text-white/60 hover:text-white flex items-center gap-1.5 text-sm">
            {isHost ? <LogOut size={16} /> : <ArrowLeft size={16} />}
            <span>{isHost ? 'Đóng phòng' : 'Rời phòng'}</span>
          </button>
          {isHost && (
            <div className="flex items-center gap-1.5 text-yellow-400 text-sm">
              <Crown size={16} />
              <span>Chủ phòng</span>
            </div>
          )}
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="card text-center mb-6"
        >
          <p className="text-white/50 text-sm mb-2">Mã phòng</p>
          <button
            onClick={copyCode}
            className="font-display text-5xl font-bold tracking-[0.3em] mb-3 hover:text-neon-purple transition-colors"
          >
            {code}
          </button>
          <div className="flex items-center justify-center gap-2 text-sm text-white/50">
            {copied ? (
              <><Check size={14} className="text-green-400" /><span className="text-green-400">Đã copy</span></>
            ) : (
              <><Copy size={14} /><span>Bấm để copy và gửi cho bạn bè</span></>
            )}
          </div>
        </motion.div>

        <div className="card mb-6">
          <h3 className="text-sm font-medium text-white/60 mb-3">Người chơi ({players.length})</h3>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={`px-4 py-3 rounded-2xl flex items-center gap-3 ${
                  p.player_id === playerId ? 'bg-neon-purple/20 border border-neon-purple/40' : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center font-bold text-sm">
                  {p.name[0]?.toUpperCase() || '?'}
                </div>
                <span className="font-medium truncate flex-1 text-left">{p.name}</span>
                {p.player_id === room.host_id && <Crown size={14} className="text-yellow-400" />}
              </motion.div>
            ))}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="px-4 py-3 rounded-2xl border border-dashed border-white/10 text-white/30 text-sm flex items-center justify-center">
                Đang chờ...
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Thời lượng</span>
            <span className="font-semibold">{minutes} phút</span>
          </div>
        </div>

        <div className="mt-auto">
          {isHost ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              disabled={!amIInRoom}
              className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
            >
              <Play size={20} />
              Bắt đầu trận đấu
            </motion.button>
          ) : (
            <div className="text-center text-white/50 py-4">
              <div className="animate-pulse">Đang chờ chủ phòng bắt đầu...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
