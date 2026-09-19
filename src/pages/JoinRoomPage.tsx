import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getPlayerId, getDisplayName, setDisplayName } from '../lib/identity';
import { createEmptyBoard } from '../lib/gameLogic';
import { sfx } from '../lib/audio';

export default function JoinRoomPage() {
  const nav = useNavigate();
  const [name, setName] = useState(getDisplayName());
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const join = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!name.trim()) {
      setError('Vui lòng nhập tên');
      sfx.error();
      return;
    }
    if (trimmedCode.length !== 6) {
      setError('Mã phòng phải có 6 ký tự');
      sfx.error();
      return;
    }
    setError('');
    setLoading(true);
    sfx.click();
    setDisplayName(name.trim());

    const playerId = getPlayerId();

    // Find the room
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', trimmedCode)
      .single();

    if (roomErr || !room) {
      setError('Không tìm thấy phòng với mã này');
      setLoading(false);
      sfx.error();
      return;
    }

    // Check if player already in room
    const { data: existing } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .eq('player_id', playerId)
      .maybeSingle();

    if (!existing) {
      // Add as new player
      const { error: playerErr } = await supabase.from('players').insert({
        room_id: room.id,
        player_id: playerId,
        name: name.trim(),
        board: createEmptyBoard(),
        score: 0,
        is_alive: true,
      });

      if (playerErr) {
        setError(playerErr.message);
        setLoading(false);
        sfx.error();
        return;
      }
    }

    nav(`/room/${room.code}`);
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
          <h1 className="font-display text-3xl font-bold mb-2">Vào phòng</h1>
          <p className="text-white/50 mb-8">Nhập mã phòng từ chủ phòng</p>

          <div className="space-y-6">
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
              <label className="block text-sm text-white/60 mb-2 font-medium">Mã phòng</label>
              <input
                className="input text-center font-display text-3xl tracking-[0.5em] uppercase"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="------"
                maxLength={6}
                style={{ letterSpacing: '0.5em' }}
              />
              <p className="text-xs text-white/40 mt-2 text-center">Mã có 6 ký tự (chữ và số)</p>
            </div>

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
              onClick={join}
              disabled={loading}
              className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Đang vào...
                </>
              ) : (
                <>Vào phòng</>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
