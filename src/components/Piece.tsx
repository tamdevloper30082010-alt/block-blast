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

  // Defensive color — fall back to purple if missing
  const color = piece?.color || '#a855f7';

  return (
    <motion.div
      whileTap={disabled || ghost ? {} : { scale: 1.05 }}
      draggable={false}
      onPointerDown={disabled ? undefined : onPointerDown}
      className={`piece ${disabled ? 'piece-disabled' : ''} ${ghost ? 'piece-ghost' : ''}`}
      style={{
        width: w,
        height: h,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        position: 'relative',
      }}
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) =>
          piece.shape[r][c] ? (
            <div
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                left: c * cellSize,
                top: r * cellSize,
                width: cellSize - 2,
                height: cellSize - 2,
                borderRadius: 5,
                backgroundColor: color,
                boxShadow: ghost
                  ? 'none'
                  : `inset 0 0 8px rgba(255,255,255,0.45), 0 2px 4px rgba(0,0,0,0.35), 0 0 10px ${color}99`,
                opacity: ghost ? 0.5 : 1,
              }}
            />
          ) : null
        )
      )}
    </motion.div>
  );
}
