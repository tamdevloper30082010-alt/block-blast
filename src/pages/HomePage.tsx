import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, Users } from 'lucide-react';

export default function HomePage() {
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background blobs */}
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

      <div className="relative z-10 max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-6 inline-block"
        >
          <div className="text-7xl">🧩</div>
        </motion.div>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-display text-5xl md:text-6xl font-bold mb-3 tracking-tight"
        >
          <span className="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
            Block Blast
          </span>
        </motion.h1>

        <motion.p
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/60 text-lg mb-12"
        >
          Xếp khối. Thi đấu. Chiến thắng.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => nav('/create')}
            className="w-full btn-primary flex items-center justify-center gap-3 text-lg py-4"
          >
            <Sparkles size={22} />
            Tạo phòng mới
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => nav('/join')}
            className="w-full btn-ghost flex items-center justify-center gap-3 text-lg py-4"
          >
            <Users size={22} />
            Vào phòng có sẵn
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12 flex items-center justify-center gap-6 text-white/40 text-sm"
        >
          <div className="flex items-center gap-1.5">
            <Play size={14} />
            <span>Chơi ngay</span>
          </div>
          <div>•</div>
          <div>Không cần đăng ký</div>
        </motion.div>
      </div>
    </div>
  );
}
