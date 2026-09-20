import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, Play, Crown, ArrowLeft, LogOut, Users, Gamepad2, Bot } from 'lucide-react';
import { supabase, type Room, type Player } from '../lib/supabase';
import { getPlayerId } from '../lib/identity';
import { sfx } from '../lib/audio';
import { shuffleDeck, dealCards, generateSeed } from '../lib/tienlen/cards';
import { getRandomPieces } from '../lib/pieces';

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

    const ch = supabase
      .channel(`room-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => loadRoom())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => loadRoom())
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [code]);

  useEffect(() => {
    if (room?.status === 'playing') {
      const target = room.game_type === 'tienlen' ? `/game/tl/${code}` : `/game/${code}`;
      nav(target);
    }
  }, [room?.status, code, nav, room?.game_type]);

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
    const isTienLen = room.game_type === 'tienlen';
    const botCount = parseInt(sessionStorage.getItem(`bba.botCount.${room.id}`) || '0', 10);
    const minPlayers = botCount > 0 ? 1 : 2;
    if (players.length < minPlayers) {
      sfx.error();
      return;
    }
    sfx.click();

    // Insert bot players if requested
    const botPlayers: Player[] = [];
    if (botCount > 0) {
      for (let i = 0; i < botCount; i++) {
        // Generate a VALID UUID (36-char format)
        const botId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
          ? (crypto as any).randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
              const r = (Math.random() * 16) | 0;
              return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
            });
        const botName = `Bot ${i + 1}`;
        const emptyBoard = Array.from({ length: 8 }, () => Array(8).fill(0));
        const initialPieces = isTienLen ? null : getRandomPieces(3);
        const { data, error: botErr } = await supabase.from('players').insert({
          room_id: room.id,
          player_id: botId,
          name: botName,
          board: emptyBoard,
          score: 0,
          is_alive: true,
          is_bot: true,
          pieces: initialPieces,
        }).select().single();
        if (botErr) {
          setError(`Không thể tạo bot: ${botErr.message}`);
          sfx.error();
          return;
        }
        if (data) botPlayers.push(data);
      }
    }

    // Reload players to include bots
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at', { ascending: true });
    const finalPlayers = allPlayers || players;

    let updateData: any = { status: 'playing' };

    if (isTienLen) {
      // Initialize Tiến Lên game state
      const seed = generateSeed();
      const deck = shuffleDeck(seed);
      const hands = dealCards(deck, finalPlayers.length);
      const handsMap: Record<string, any> = {};
      finalPlayers.forEach((p, idx) => {
        handsMap[p.player_id] = hands[idx];
      });

      // First player: the one who has 3♠ (Vietnamese rule)
      let firstPlayerIdx = 0;
      const threeSpades = '3-♠';
      for (let i = 0; i < hands.length; i++) {
        if (hands[i].find(c => c.id === threeSpades)) {
          firstPlayerIdx = i;
          break;
        }
      }

      updateData.started_at = new Date().toISOString();
      updateData.ends_at = null;
      updateData.game_state = {
        deckSeed: seed,
        hands: handsMap,
        turnOrder: finalPlayers.map(p => p.player_id),
        currentTurn: finalPlayers[firstPlayerIdx].player_id,
        currentPlay: null,
        passCount: 0,
        winner: null,
        lastWinner: finalPlayers[firstPlayerIdx].player_id,
        startedAt: Date.now(),
      };
    } else {
      const now = new Date();
      const ends = new Date(now.getTime() + room.duration_seconds * 1000);
      updateData.started_at = now.toISOString();
      updateData.ends_at = ends.toISOString();
    }

    const { error } = await supabase
      .from('rooms')
      .update(updateData)
      .eq('id', room.id);
    if (error) setError(error.message);
  };

  const leaveRoom = async () => {
    if (!room) return;
    sfx.click();
    if (isHost) {
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
  const needed = Math.max(0, (room.max_players || 4) - players.length);
  const isTienLen = room.game_type === 'tienlen';

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
          className="card text-center mb-4"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gamepad2 size={14} className="text-neon-cyan" />
            <span className="text-xs text-white/50 uppercase tracking-wider">
              {isTienLen ? 'Tiến Lên' : 'Block Blast'}
            </span>
          </div>
          <p className="text-white/50 text-xs mb-1">Mã phòng</p>
          <button
            onClick={copyCode}
            className="font-display text-5xl font-bold tracking-[0.3em] mb-3 hover:text-neon-purple transition-colors"
          >
            {code}
          </button>
          <div className="flex items-center justify-center gap-2 text-xs text-white/50">
            {copied ? (
              <><Check size={12} className="text-green-400" /><span className="text-green-400">Đã copy</span></>
            ) : (
              <><Copy size={12} /><span>Bấm để copy và gửi cho bạn bè</span></>
            )}
          </div>
        </motion.div>

        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/80">Người chơi</h3>
            <div className="flex items-center gap-1.5 text-sm">
              <Users size={14} className="text-neon-cyan" />
              <span className="font-bold text-white">{players.length}</span>
              <span className="text-white/50">/ {room.max_players || 4}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={`px-4 py-3 rounded-2xl flex items-center gap-3 ${
                  p.is_bot ? 'bg-neon-cyan/10 border border-neon-cyan/30' :
                  p.player_id === playerId ? 'bg-neon-purple/20 border border-neon-purple/40' : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  p.is_bot ? 'bg-gradient-to-br from-neon-cyan to-neon-purple' :
                  'bg-gradient-to-br from-neon-cyan to-neon-purple'
                }`}>
                  {p.is_bot ? <Bot size={16} /> : (p.name[0]?.toUpperCase() || '?')}
                </div>
                <span className="font-medium truncate flex-1 text-left">{p.name}</span>
                {p.player_id === room.host_id && <Crown size={14} className="text-yellow-400" />}
                {p.is_bot && <span className="text-xs text-neon-cyan">BOT</span>}
              </motion.div>
            ))}
            {Array.from({ length: needed }).map((_, i) => (
              <div key={`empty-${i}`} className="px-4 py-3 rounded-2xl border border-dashed border-white/10 text-white/30 text-sm flex items-center justify-center">
                Đang chờ...
              </div>
            ))}
          </div>
        </div>

        <div className="card mb-4 space-y-2">
          {!isTienLen && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Thời lượng</span>
              <span className="font-semibold">{minutes} phút</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Số người tối đa</span>
            <span className="font-semibold">{room.max_players || 4} người</span>
          </div>
          {isTienLen && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Luật chơi</span>
              <span className="font-semibold text-xs">Hết bài đầu tiên thắng</span>
            </div>
          )}
        </div>

        <div className="mt-auto">
          {isHost ? (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startGame}
                disabled={!amIInRoom || players.length < (parseInt(sessionStorage.getItem(`bba.botCount.${room.id}`) || '0', 10) > 0 ? 1 : 2)}
                className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
              >
                <Play size={20} />
                Bắt đầu {(() => {
                  const bc = parseInt(sessionStorage.getItem(`bba.botCount.${room.id}`) || '0', 10);
                  if (bc > 0 && players.length < 2) return '(có thể chơi với bot)';
                  return '';
                })()}
              </motion.button>
              {(() => {
                const bc = parseInt(sessionStorage.getItem(`bba.botCount.${room.id}`) || '0', 10);
                if (bc > 0) {
                  return (
                    <p className="text-center text-neon-cyan/80 text-xs mt-2 flex items-center justify-center gap-1.5">
                      <Bot size={12} />
                      Sẽ thêm {bc} bot — bắt đầu được luôn không cần chờ người
                    </p>
                  );
                }
                if (players.length < 2) {
                  return (
                    <p className="text-center text-white/40 text-xs mt-2">
                      Chờ thêm ít nhất 1 người nữa vào phòng
                    </p>
                  );
                }
                return null;
              })()}
            </>
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
