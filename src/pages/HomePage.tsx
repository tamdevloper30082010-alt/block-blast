import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';
import { sfx } from '../lib/audio';
import { initAudio } from '../lib/audio';

const GAMES = [
  {
    id: 'block-blast',
    title: 'Block Blast',
    description: 'Xếp khối, nổ tung hàng, ghi điểm',
    emoji: '🧩',
    gradient: 'from-neon-purple via-neon-pink to-neon-orange',
    accent: 'neon-purple',
  },
  {
    id: 'tienlen',
    title: 'Tiến Lên',
    description: 'Đánh bài 4 người, hết bài trước thắng',
    emoji: '🃏',
    gradient: 'from-neon-cyan via-neon-purple to-neon-pink',
    accent: 'neon-cyan',
  },
];

export default function HomePage() {
  const nav = useNavigate();

  const handleCreate = (gameType: string) => {
    initAudio();
    sfx.click();
    nav(`/create?game=${gameType}`);
  };

  const handleJoin = () => {
    initAudio();
    sfx.click();
    nav('/join');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', filter: 'blur(60px)' }}
          animate={{ x: [0, 100, 0], y: [0, -100, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, #ff3da6 0%, transparent 70%)', filter: 'blur(60px)' }}
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 max-w-md w-full">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-2 tracking-tight">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
              Game Hub
            </span>
          </h1>
          <p className="text-white/60 text-base">Chọn game để bắt đầu</p>
        </motion.div>

        <div className="space-y-3 mb-6">
          {GAMES.map((game, idx) => (
            <motion.div
              key={game.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 + idx * 0.1 }}
              className="card hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">{game.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-xl text-white">{game.title}</h3>
                  <p className="text-white/50 text-sm">{game.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreate(game.id)}
                  className={`flex-1 bg-gradient-to-r ${game.gradient} text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg`}
                >
                  <Sparkles size={16} />
                  Tạo phòng
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleJoin}
                  className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm border border-white/10"
                >
                  <Users size={16} />
                  Vào phòng
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/30 text-xs"
        >
          Mời bạn bè vào cùng chơi — không cần đăng ký
        </motion.p>
      </div>
    </div>
  );
}
