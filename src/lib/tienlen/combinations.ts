// Combination detection and comparison for Tiến Lên
// Vietnamese card game rules

import type { Card } from './cards';
import { rankValue } from './cards';

export type CombinationType =
  | 'single'      // Rác - 1 lá
  | 'pair'        // Đôi - 2 lá cùng rank
  | 'triple'      // Ba - 3 lá cùng rank
  | 'straight'    // Sảnh - 3+ lá liên tiếp (no 2)
  | 'three_pairs' // Ba đôi thông - 3 đôi liên tiếp (no 2)
  | 'four_kind';  // Tứ quý - 4 lá cùng rank

export type Combination = {
  type: CombinationType;
  cards: Card[]; // sorted by rank asc
  keyValue: number; // for comparison (rank of highest card for straight, rank for others)
};

const NO_2 = (r: string) => r !== '2';
const NO_2_AND_A_BREAK = (cards: Card[]) => {
  // Special: A-2-3-4 is not a valid straight in Vietnamese Tiến Lên
  if (cards.length === 4 &&
      cards.some(c => c.rank === 'A') &&
      cards.some(c => c.rank === '2') &&
      cards.some(c => c.rank === '3') &&
      cards.some(c => c.rank === '4')) {
    return false;
  }
  return true;
};

export function detectCombination(cards: Card[]): Combination | null {
  if (cards.length === 0) return null;
  const sorted = [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));

  // Single
  if (cards.length === 1) {
    return { type: 'single', cards: sorted, keyValue: rankValue(sorted[0].rank) };
  }

  // Pair
  if (cards.length === 2 && sorted[0].rank === sorted[1].rank) {
    return { type: 'pair', cards: sorted, keyValue: rankValue(sorted[0].rank) };
  }

  // Triple
  if (cards.length === 3 && sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
    return { type: 'triple', cards: sorted, keyValue: rankValue(sorted[0].rank) };
  }

  // Straight (3+ cards, no 2, consecutive)
  if (cards.length >= 3) {
    if (sorted.every(c => NO_2(c.rank)) && NO_2_AND_A_BREAK(sorted)) {
      const isStraight = sorted.every((c, i) => i === 0 || rankValue(c.rank) === rankValue(sorted[i-1].rank) + 1);
      if (isStraight) {
        return { type: 'straight', cards: sorted, keyValue: rankValue(sorted[sorted.length - 1].rank) };
      }
    }
  }

  // Three pairs (ba đôi thông) - 6 cards = 3 consecutive pairs (no 2)
  if (cards.length === 6) {
    if (sorted.every(c => NO_2(c.rank))) {
      const pairs: { rank: any; count: number }[] = [];
      for (const c of sorted) {
        const last = pairs[pairs.length - 1];
        if (last && last.rank === c.rank) {
          last.count++;
        } else {
          pairs.push({ rank: c.rank, count: 1 });
        }
      }
      if (pairs.length === 3 && pairs.every(p => p.count === 2)) {
        // Check consecutive
        const ranks = pairs.map(p => rankValue(p.rank));
        const isConsecutive = ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;
        if (isConsecutive) {
          return { type: 'three_pairs', cards: sorted, keyValue: ranks[2] };
        }
      }
    }
  }

  // Four of a kind (tứ quý)
  if (cards.length === 4 && sorted.every(c => c.rank === sorted[0].rank)) {
    return { type: 'four_kind', cards: sorted, keyValue: rankValue(sorted[0].rank) };
  }

  return null;
}

// Tứ quý và ba đôi thông cắt được heo (2)
export function canCut(combo: Combination): boolean {
  return combo.type === 'four_kind' || combo.type === 'three_pairs';
}

export function is2(card: Card): boolean {
  return card.rank === '2';
}

export function isHeo(card: Card): boolean {
  return is2(card);
}

// Compare two combinations. Returns:
//  1 if a beats b
// -1 if a loses to b
//  0 if equal or incomparable
export function compareCombinations(a: Combination, b: Combination): number {
  // Tứ quý / ba đôi thông can cut a single 2
  if (canCut(a) && b.type === 'single' && b.cards.every(isHeo)) {
    return 1;
  }
  if (canCut(b) && a.type === 'single' && a.cards.every(isHeo)) {
    return -1;
  }
  // Tứ quý > tứ quý (higher rank)
  if (a.type === 'four_kind' && b.type === 'four_kind') {
    if (a.keyValue > b.keyValue) return 1;
    if (a.keyValue < b.keyValue) return -1;
    return 0;
  }
  // Ba đôi thông > ba đôi thông
  if (a.type === 'three_pairs' && b.type === 'three_pairs') {
    if (a.keyValue > b.keyValue) return 1;
    if (a.keyValue < b.keyValue) return -1;
    return 0;
  }
  // Tứ quý vs ba đôi thông: tứ quý wins
  if (a.type === 'four_kind' && b.type === 'three_pairs') return 1;
  if (a.type === 'three_pairs' && b.type === 'four_kind') return -1;

  // Must be same type for normal comparison
  if (a.type !== b.type) return 0;
  if (a.cards.length !== b.cards.length) return 0;

  if (a.keyValue > b.keyValue) return 1;
  if (a.keyValue < b.keyValue) return -1;
  return 0;
}

// Can `a` beat `b`? b can be null (start of round)
export function canBeat(a: Combination, b: Combination | null): boolean {
  if (!b) return true; // start of new round, anything goes
  return compareCombinations(a, b) > 0;
}

export function comboLabel(type: CombinationType): string {
  switch (type) {
    case 'single': return 'Rác';
    case 'pair': return 'Đôi';
    case 'triple': return 'Ba';
    case 'straight': return 'Sảnh';
    case 'three_pairs': return 'Ba đôi thông';
    case 'four_kind': return 'Tứ quý';
  }
}
