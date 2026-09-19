import type { Piece } from './pieces';
import { pieceCells } from './pieces';

export const BOARD_SIZE = 8;

export type Board = number[][];

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function canPlacePiece(board: Board, piece: Piece, row: number, col: number): boolean {
  const cells = pieceCells(piece);
  for (const [dr, dc] of cells) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== 0) return false;
  }
  return true;
}

export function placePiece(board: Board, piece: Piece, row: number, col: number, playerId: number): Board {
  const newBoard = board.map(row => [...row]);
  const cells = pieceCells(piece);
  for (const [dr, dc] of cells) {
    newBoard[row + dr][col + dc] = playerId;
  }
  return newBoard;
}

export function findFullLines(board: Board): { rows: number[]; cols: number[] } {
  const fullRows: number[] = [];
  const fullCols: number[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    if (board[r].every(cell => cell !== 0)) fullRows.push(r);
  }
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][c] === 0) { full = false; break; }
    }
    if (full) fullCols.push(c);
  }

  return { rows: fullRows, cols: fullCols };
}

export function clearLines(board: Board, rows: number[], cols: number[]): Board {
  const newBoard = board.map(row => [...row]);
  for (const r of rows) {
    for (let c = 0; c < BOARD_SIZE; c++) newBoard[r][c] = 0;
  }
  for (const c of cols) {
    for (let r = 0; r < BOARD_SIZE; r++) newBoard[r][c] = 0;
  }
  return newBoard;
}

export function canPlaceAny(board: Board, pieces: Piece[]): boolean {
  for (const piece of pieces) {
    for (let r = 0; r <= BOARD_SIZE - piece.shape.length; r++) {
      for (let c = 0; c <= BOARD_SIZE - piece.shape[0].length; c++) {
        if (canPlacePiece(board, piece, r, c)) return true;
      }
    }
    // Also check rotated variants for square pieces handled by canPlacePiece logic
  }
  return false;
}

export function calculateScore(
  blocksPlaced: number,
  rowsCleared: number,
  colsCleared: number,
  combo: number
): number {
  let score = blocksPlaced; // +1 per block
  if (rowsCleared > 0 || colsCleared > 0) {
    score += (rowsCleared + colsCleared) * 10;
    // Combo bonus: clearing multiple lines at once
    if (rowsCleared + colsCleared >= 2) {
      score += (rowsCleared + colsCleared) * 5 * combo;
    }
  }
  return score;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
