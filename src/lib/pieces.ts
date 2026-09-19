// Block piece definitions for Block Blast
// Each piece is a 2D grid: 1 = block, 0 = empty
// Pieces are designed to fit within an 8x8 board with various sizes

export type Piece = {
  id: string;
  shape: number[][];
  color: string;
};

const COLOR = {
  pink: '#ff3da6',
  purple: '#a855f7',
  cyan: '#22d3ee',
  lime: '#a3e635',
  orange: '#fb923c',
  yellow: '#facc15',
  blue: '#3b82f6',
  red: '#ef4444',
};

// All standard Block Blast pieces
export const PIECE_TEMPLATES: Piece[] = [
  // Singles
  { id: 'dot', shape: [[1]], color: COLOR.pink },

  // Lines
  { id: 'h2', shape: [[1, 1]], color: COLOR.cyan },
  { id: 'h3', shape: [[1, 1, 1]], color: COLOR.purple },
  { id: 'h4', shape: [[1, 1, 1, 1]], color: COLOR.lime },
  { id: 'h5', shape: [[1, 1, 1, 1, 1]], color: COLOR.orange },
  { id: 'v2', shape: [[1], [1]], color: COLOR.cyan },
  { id: 'v3', shape: [[1], [1], [1]], color: COLOR.purple },
  { id: 'v4', shape: [[1], [1], [1], [1]], color: COLOR.lime },
  { id: 'v5', shape: [[1], [1], [1], [1], [1]], color: COLOR.orange },

  // Squares
  { id: 'sq2', shape: [[1, 1], [1, 1]], color: COLOR.yellow },
  { id: 'sq3', shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: COLOR.red },

  // L-shapes (4 orientations)
  { id: 'L1', shape: [[1, 0], [1, 0], [1, 1]], color: COLOR.blue },
  { id: 'L2', shape: [[1, 1, 1], [1, 0, 0]], color: COLOR.blue },
  { id: 'L3', shape: [[1, 1], [0, 1], [0, 1]], color: COLOR.blue },
  { id: 'L4', shape: [[0, 0, 1], [1, 1, 1]], color: COLOR.blue },

  // J-shapes (mirror L)
  { id: 'J1', shape: [[0, 1], [0, 1], [1, 1]], color: COLOR.pink },
  { id: 'J2', shape: [[1, 0, 0], [1, 1, 1]], color: COLOR.pink },
  { id: 'J3', shape: [[1, 1], [1, 0], [1, 0]], color: COLOR.pink },
  { id: 'J4', shape: [[1, 1, 1], [0, 0, 1]], color: COLOR.pink },

  // T-shapes (4 orientations)
  { id: 'T1', shape: [[1, 1, 1], [0, 1, 0]], color: COLOR.purple },
  { id: 'T2', shape: [[0, 1], [1, 1], [0, 1]], color: COLOR.purple },
  { id: 'T3', shape: [[0, 1, 0], [1, 1, 1]], color: COLOR.purple },
  { id: 'T4', shape: [[1, 0], [1, 1], [1, 0]], color: COLOR.purple },

  // S / Z shapes
  { id: 'S1', shape: [[0, 1, 1], [1, 1, 0]], color: COLOR.lime },
  { id: 'S2', shape: [[1, 0], [1, 1], [0, 1]], color: COLOR.lime },
  { id: 'Z1', shape: [[1, 1, 0], [0, 1, 1]], color: COLOR.orange },
  { id: 'Z2', shape: [[0, 1], [1, 1], [1, 0]], color: COLOR.orange },

  // Big L (3x3 with 2x2 corner)
  { id: 'bigL1', shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]], color: COLOR.red },
  { id: 'bigL2', shape: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], color: COLOR.red },
  { id: 'bigL3', shape: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: COLOR.red },
  { id: 'bigL4', shape: [[0, 0, 1], [0, 0, 1], [1, 1, 1]], color: COLOR.red },

  // 2x2 with bumps
  { id: 'p1', shape: [[1, 1, 1], [1, 1, 1], [1, 0, 0]], color: COLOR.cyan },
];

export function getRandomPieces(count: number): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * PIECE_TEMPLATES.length);
    out.push({ ...PIECE_TEMPLATES[idx] });
  }
  return out;
}

export function pieceCells(piece: Piece): Array<[number, number]> {
  const cells: Array<[number, number]> = [];
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) cells.push([r, c]);
    }
  }
  return cells;
}
