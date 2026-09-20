// Block Blast bot AI — greedy placement strategy

import {
  BOARD_SIZE,
  canPlacePiece,
  placePiece as placeOnBoard,
  findFullLines,
  calculateScore,
} from '../gameLogic';
import type { Piece } from '../pieces';
import { getRandomPieces } from '../pieces';

export type BotMove = {
  pieceIdx: number;
  row: number;
  col: number;
  scoreGained: number;
  newCombo: number;
  clearedRows: number[];
  clearedCols: number[];
} | null;

// Find best placement for the given pieces
// Priority: 1) clear lines, 2) avoid filling up board
export function decideBotMove(
  board: number[][],
  pieces: (Piece | null)[],
  combo: number
): BotMove {
  let bestMove: BotMove = null;
  let bestScore = -1;

  for (let pIdx = 0; pIdx < pieces.length; pIdx++) {
    const piece = pieces[pIdx];
    if (!piece) continue;

    for (let r = 0; r <= BOARD_SIZE - piece.shape.length; r++) {
      for (let c = 0; c <= BOARD_SIZE - piece.shape[0].length; c++) {
        if (!canPlacePiece(board, piece, r, c)) continue;

        // Simulate placement
        const placed = placeOnBoard(board, piece, r, c, 2); // bot player_id = 2+
        const { rows, cols } = findFullLines(placed);
        const blocksPlaced = piece.shape.flat().filter(v => v === 1).length;
        const scoreGained = calculateScore(blocksPlaced, rows.length, cols.length, combo);

        // Scoring heuristic:
        // - Strongly prefer clearing lines
        // - Among same clearing count, prefer placing in corners/edges (less blocking)
        const lineScore = (rows.length + cols.length) * 100;
        const edgeBonus = (r === 0 || c === 0 || r + piece.shape.length === BOARD_SIZE || c + piece.shape[0].length === BOARD_SIZE) ? 5 : 0;
        const totalScore = scoreGained + lineScore + edgeBonus;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMove = {
            pieceIdx: pIdx,
            row: r,
            col: c,
            scoreGained,
            newCombo: rows.length + cols.length > 0 ? combo + 1 : 0,
            clearedRows: rows,
            clearedCols: cols,
          };
        }
      }
    }
  }

  return bestMove;
}

// Apply the bot move and generate next piece
export function applyBotMove(
  board: number[][],
  pieces: (Piece | null)[],
  move: NonNullable<BotMove>,
  playerIdNum: number
): { newBoard: number[][]; newPieces: (Piece | null)[]; newScore: number; newCombo: number } {
  const piece = pieces[move.pieceIdx];
  if (!piece) return { newBoard: board, newPieces: pieces, newScore: 0, newCombo: 0 };

  const placed = placeOnBoard(board, piece, move.row, move.col, playerIdNum);
  const { rows, cols } = findFullLines(placed);
  let finalBoard = placed;
  let scoreGained = 0;

  if (rows.length > 0 || cols.length > 0) {
    // Clear lines (use the function from gameLogic)
    const newBoard = placed.map(row => [...row]);
    for (const r of rows) {
      for (let c = 0; c < BOARD_SIZE; c++) newBoard[r][c] = 0;
    }
    for (const c of cols) {
      for (let r = 0; r < BOARD_SIZE; r++) newBoard[r][c] = 0;
    }
    finalBoard = newBoard;
    const blocksPlaced = piece.shape.flat().filter(v => v === 1).length;
    scoreGained = calculateScore(blocksPlaced, rows.length, cols.length, 0);
  } else {
    const blocksPlaced = piece.shape.flat().filter(v => v === 1).length;
    scoreGained = calculateScore(blocksPlaced, 0, 0, 0);
  }

  // Generate new piece for the slot
  const newPieces = [...pieces];
  newPieces[move.pieceIdx] = getRandomPieces(1)[0];

  // If all pieces used (shouldn't happen), generate 3 new
  if (newPieces.every(p => !p)) {
    return {
      newBoard: finalBoard,
      newPieces: getRandomPieces(3),
      newScore: scoreGained,
      newCombo: 0,
    };
  }

  return {
    newBoard: finalBoard,
    newPieces,
    newScore: scoreGained,
    newCombo: rows.length + cols.length > 0 ? 1 : 0,
  };
}
