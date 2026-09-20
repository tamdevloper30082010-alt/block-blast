// Tiến Lên bot AI — simple "play lowest valid, pass if can't beat"

import type { Card } from '../tienlen/cards';
import { rankValue, sortHand } from '../tienlen/cards';
import { detectCombination, canBeat, type Combination } from '../tienlen/combinations';
import type { TienLenState, TienLenPlay } from '../supabase';

export type BotDecision = {
  action: 'play' | 'pass';
  cards?: Card[];
  comboType?: string;
};

export function botDecideMove(state: TienLenState, botId: string): BotDecision {
  const hand = state.hands[botId];
  if (!hand || hand.length === 0) return { action: 'pass' };

  // Build combinations from hand (singles, pairs, triples, straights)
  const combinations = enumerateCombinations(hand);

  // Sort combinations by keyValue ascending (prefer playing LOW cards)
  combinations.sort((a, b) => {
    if (a.type !== b.type) {
      // Prefer singles first
      const order = { single: 0, pair: 1, triple: 2, straight: 3, three_pairs: 4, four_kind: 5 };
      return order[a.type] - order[b.type];
    }
    return a.keyValue - b.keyValue;
  });

  if (!state.currentPlay) {
    // New round: play lowest combination (preferably single)
    if (combinations.length > 0) {
      const c = combinations[0];
      return { action: 'play', cards: c.cards, comboType: c.type };
    }
    return { action: 'pass' };
  }

  // Need to beat current play
  const currentCombo = parsePlayAsCombo(state.currentPlay);
  if (!currentCombo) return { action: 'pass' };

  // Try to find lowest combo that beats
  for (const c of combinations) {
    if (canBeat(c, currentCombo)) {
      return { action: 'play', cards: c.cards, comboType: c.type };
    }
  }

  // Can't beat → pass
  return { action: 'pass' };
}

// Enumerate all valid combinations from a hand
function enumerateCombinations(hand: Card[]): Combination[] {
  const combos: Combination[] = [];
  const sorted = sortHand(hand);

  // Singles
  for (const card of sorted) {
    const c = detectCombination([card]);
    if (c) combos.push(c);
  }

  // Pairs
  const byRank = groupByRank(sorted);
  for (const cards of Object.values(byRank)) {
    if (cards.length >= 2) {
      const c = detectCombination([cards[0], cards[1]]);
      if (c) combos.push(c);
    }
    // Triples
    if (cards.length >= 3) {
      const c = detectCombination([cards[0], cards[1], cards[2]]);
      if (c) combos.push(c);
    }
    // Four of a kind
    if (cards.length === 4) {
      const c = detectCombination(cards);
      if (c) combos.push(c);
    }
  }

  // Straights (3-13 cards)
  // Generate all possible straights from low ranks to high
  for (let len = 3; len <= Math.min(13, sorted.length); len++) {
    // Find sequences
    for (let startIdx = 0; startIdx <= sorted.length - len; startIdx++) {
      // Check if sorted[startIdx..startIdx+len] form a straight
      const candidate = sorted.slice(startIdx, startIdx + len);
      if (candidate.some(c => c.rank === '2')) continue; // no 2 in straights
      const vals = candidate.map(c => rankValue(c.rank));
      let isStraight = true;
      for (let i = 1; i < vals.length; i++) {
        if (vals[i] !== vals[i - 1] + 1) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) {
        const c = detectCombination(candidate);
        if (c) combos.push(c);
      }
    }
  }

  return combos;
}

function groupByRank(cards: Card[]): Record<string, Card[]> {
  const groups: Record<string, Card[]> = {};
  for (const c of cards) {
    if (!groups[c.rank]) groups[c.rank] = [];
    groups[c.rank].push(c);
  }
  return groups;
}

function parsePlayAsCombo(play: TienLenPlay): Combination | null {
  const c = detectCombination(play.cards);
  return c;
}
