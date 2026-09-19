import { motion } from 'framer-motion';
import { BOARD_SIZE } from '../lib/gameLogic';

type Props = {
  board: number[][];
  myId: number;
  ghost?: { row: number; col: number; shape: number[][]; color: string } | null;
  invalid?: { row: number; col: number; shape: number[][] } | null;
  clearingRows?: number[];
  clearingCols?: number[];
  onCellEnter?: (r: number, c: number) => void;
  onCellLeave?: () => void;
  onClick?: (r: number, c: number) => void;
  onPointerUp?: (r: number, c: number) => void;
  size?: 'lg' | 'sm' | 'xs';
  hideGrid?: boolean;
};

const SIZES = {
  lg: { cell: 44, gap: 2, radius: 8 },
  sm: { cell: 28, gap: 1, radius: 6 },
  xs: { cell: 18, gap: 1, radius: 4 },
};

const PLAYER_COLORS = [
  '#a855f7', // purple
  '#22d3ee', // cyan
  '#fb923c', // orange
  '#a3e635', // lime
  '#ff3da6', // pink
  '#facc15', // yellow
  '#3b82f6', // blue
  '#ef4444', // red
];

function colorForCell(value: number, myId: number): string {
  if (value === 0) return 'transparent';
  if (value === myId) return 'url(#myCellGrad)';
  // Other player — alternate colors deterministically
  const palette = PLAYER_COLORS;
  return palette[(value - 1) % palette.length];
}

export default function Board({
  board,
  myId,
  ghost,
  invalid,
  clearingRows = [],
  clearingCols = [],
  onCellEnter,
  onCellLeave,
  onClick,
  onPointerUp,
  size = 'lg',
  hideGrid = false,
}: Props) {
  const { cell, gap, radius } = SIZES[size];
  const boardSizePx = BOARD_SIZE * cell + (BOARD_SIZE - 1) * gap;

  const ghostMap = new Set<string>();
  if (ghost) {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (ghost.shape[r][c]) {
          ghostMap.add(`${ghost.row + r}:${ghost.col + c}`);
        }
      }
    }
  }
  const invalidMap = new Set<string>();
  if (invalid) {
    for (let r = 0; r < invalid.shape.length; r++) {
      for (let c = 0; c < invalid.shape[r].length; c++) {
        if (invalid.shape[r][c]) {
          invalidMap.add(`${invalid.row + r}:${invalid.col + c}`);
        }
      }
    }
  }
  const clearingRowSet = new Set(clearingRows);
  const clearingColSet = new Set(clearingCols);

  return (
    <div
      className="relative inline-block"
      style={{ width: boardSizePx, height: boardSizePx }}
    >
      {/* SVG defs for gradients */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="myCellGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c084fc" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="ghostGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c084fc" stopOpacity="0.5" />
            <stop offset="1" stopColor="#7c3aed" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>

      <div
        className="absolute inset-0 rounded-2xl bg-white/5 border border-white/10"
        style={{ boxShadow: 'inset 0 0 30px rgba(168, 85, 247, 0.15)' }}
      />
      {Array.from({ length: BOARD_SIZE }, (_, r) =>
        Array.from({ length: BOARD_SIZE }, (_, c) => {
          const v = board[r][c];
          const key = `${r}:${c}`;
          const isGhost = ghostMap.has(key);
          const isInvalid = invalidMap.has(key);
          const isClearing = clearingRowSet.has(r) || clearingColSet.has(c);
          const cellColor = colorForCell(v, myId);

          return (
            <div
              key={key}
              onPointerEnter={() => onCellEnter?.(r, c)}
              onPointerLeave={() => onCellLeave?.()}
              onPointerUp={() => onPointerUp?.(r, c)}
              onClick={() => onClick?.(r, c)}
              className={`absolute ${onClick || onPointerUp ? 'cursor-pointer' : ''}`}
              style={{
                left: c * (cell + gap),
                top: r * (cell + gap),
                width: cell,
                height: cell,
                borderRadius: radius,
              }}
            >
              {!hideGrid && v === 0 && !isGhost && !isInvalid && (
                <div
                  className="absolute inset-0 rounded-md bg-white/[0.03] border border-white/[0.04]"
                />
              )}

              {isGhost && !isInvalid && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.7 }}
                  className="absolute inset-0"
                  style={{
                    borderRadius: radius,
                    background: 'url(#ghostGrad)',
                    backgroundColor: '#a855f7',
                    boxShadow: '0 0 12px rgba(168, 85, 247, 0.6)',
                    opacity: 0.5,
                  }}
                />
              )}

              {isInvalid && (
                <div
                  className="absolute inset-0"
                  style={{
                    borderRadius: radius,
                    backgroundColor: '#ef4444',
                    opacity: 0.5,
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                  }}
                />
              )}

              {v !== 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={
                    isClearing
                      ? { scale: [1, 1.2, 0], opacity: [1, 1, 0], rotate: [0, 90, 180] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={
                    isClearing
                      ? { duration: 0.4, ease: 'easeOut' }
                      : { type: 'spring', stiffness: 300, damping: 20 }
                  }
                  className="absolute inset-0"
                  style={{
                    borderRadius: radius,
                    background: cellColor,
                    boxShadow: isClearing
                      ? '0 0 20px rgba(255,255,255,0.9)'
                      : `inset 0 0 8px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.3)`,
                  }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
