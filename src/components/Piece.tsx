import { motion } from 'framer-motion';
import type { Piece } from '../lib/pieces';

type Props = {
  piece: Piece;
  cellSize?: number;
  ghost?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  disabled?: boolean;
};

export default function PieceView({ piece, cellSize = 22, ghost = false, onPointerDown, disabled }: Props) {
  const rows = piece.shape.length;
  const cols = piece.shape[0].length;
  const w = cols * cellSize;
  const h = rows * cellSize;

  return (
    <motion.div
      whileTap={disabled ? {} : { scale: 1.1 }}
      draggable={false}
      onPointerDown={disabled ? undefined : onPointerDown}
      className={`relative inline-block select-none ${disabled ? 'opacity-30' : 'cursor-grab active:cursor-grabbing'}`}
      style={{ width: w, height: h }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) =>
          piece.shape[r][c] ? (
            <div
              key={`${r}-${c}`}
              className="absolute"
              style={{
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize - 2,
                height: cellSize - 2,
                borderRadius: 4,
                backgroundColor: ghost ? `${piece.color}55` : piece.color,
                boxShadow: ghost
                  ? 'none'
                  : `inset 0 0 6px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3), 0 0 8px ${piece.color}66`,
              }}
            />
          ) : null
        )
      )}
    </motion.div>
  );
}
