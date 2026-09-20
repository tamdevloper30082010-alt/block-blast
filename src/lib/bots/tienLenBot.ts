// Tiến Lên bot AI — simple "play lowest valid, pass if can't beat"

import type { Card } from '../tienlen/cards';
import { sortHand, RANKS } from '../tienlen/cards';
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

  // Build combinations from hand
  const combinations = enumerateCombinations(hand);

  if (combinations.length === 0) {
    // Hand is empty or no valid combos — shouldn't happen
    return { action: 'pass' };
  }

  // Sort: prefer SINGLE first (save bigger combos), then by keyValue ascending
  combinations.sort((a, b) => {
    if (a.type !== b.type) {
      const order: any = { single: 0, pair: 1, triple: 2, straight: 3, three_pairs: 4, four_kind: 5 };
      return order[a.type] - order[b.type];
    }
    return a.keyValue - b.keyValue;
  });

  if (!state.currentPlay) {
    // New round: play lowest combination
    return { action: 'play', cards: combinations[0].cards, comboType: combinations[0].type };
  }

  // Need to beat current play
  const currentCombo = parsePlayAsCombo(state.currentPlay);
  if (!currentCombo) {
    // Can't parse current play, just play lowest
    return { action: 'play', cards: combinations[0].cards, comboType: combinations[0].type };
  }

  // Try to find lowest combo that beats
  for (const c of combinations) {
    if (canBeat(c, currentCombo)) {
      return { action: 'play', cards: c.cards, comboType: c.type };
    }
  }

  // Can't beat → pass
  return { action: 'pass' };
}

function enumerateCombinations(hand: Card[]): Combination[] {
  const combos: Combination[] = [];
  if (hand.length === 0) return combos;
  const sorted = sortHand(hand);

  // Singles — one for each card
  for (const card of sorted) {
    const c = detectCombination([card]);
    if (c) combos.push(c);
  }

  // Group by rank
  const byRank = groupByRank(sorted);
  const rankGroups = Object.values(byRank);

  // Pairs, triples, quads
  for (const cards of rankGroups) {
    if (cards.length >= 2) {
      const c = detectCombination([cards[0], cards[1]]);
      if (c) combos.push(c);
    }
    if (cards.length >= 3) {
      const c = detectCombination([cards[0], cards[1], cards[2]]);
      if (c) combos.push(c);
    }
    if (cards.length === 4) {
      const c = detectCombination(cards);
      if (c) combos.push(c);
    }
  }

  // Straights — for each valid rank sequence, try to find cards
  // Ranks 3..A (indices 0..11), no 2 (index 12)
  for (let len = 3; len <= Math.min(13, 12); len++) {
    for (let startRank = 0; startRank + len - 1 < 12; startRank++) {
      const targetRanks: string[] = [];
      for (let i = 0; i < len; i++) {
        targetRanks.push(RANKS[startRank + i]);
      }
      // Find one card of each rank
      const candidate: Card[] = [];
      let possible = true;
      for (const rank of targetRanks) {
        const card = byRank[rank]?.[0];
        if (!card) { possible = false; break; }
        candidate.push(card);
      }
      if (possible && candidate.length === len) {
        const c = detectCombination(candidate);
        if (c) combos.push(c);
      }
    }
  }

  // Three consecutive pairs (ba đôi thông) — for each 3-rank window, check if has 2+ cards of each
  for (let startRank = 0; startRank + 2 < 12; startRank++) {
    const candidate: Card[] = [];
    let possible = true;
    for (let i = 0; i < 3; i++) {
      const rank = RANKS[startRank + i];
      const cards = byRank[rank];
      if (!cards || cards.length < 2) { possible = false; break; }
      candidate.push(cards[0], cards[1]);
    }
    if (possible) {
      const c = detectCombination(candidate);
      if (c) combos.push(c);
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
  return detectCombination(play.cards);
}
