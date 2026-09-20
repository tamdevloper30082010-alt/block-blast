// Card deck utilities for Tiến Lên

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export type Card = {
  id: string; // 'rank-suit' unique
  rank: Rank;
  suit: Suit;
};

const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

// Numerical rank value: 3=0, 4=1, ..., A=11, 2=12
export function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function suitValue(suit: Suit): number {
  return SUITS.indexOf(suit);
}

// Suit color (red for hearts/diamonds)
export function suitColor(suit: Suit): 'red' | 'black' {
  return suit === '♥' || suit === '♦' ? 'red' : 'black';
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}`, rank, suit });
    }
  }
  return deck;
}

// Seeded shuffle (deterministic) - all clients get same deal
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let s = seed;
  // Simple xorshift PRNG
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return Math.abs(s);
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function shuffleDeck(seed: number): Card[] {
  return seededShuffle(createDeck(), seed);
}

export function dealCards(deck: Card[], playerCount: number): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < deck.length; i++) {
    hands[i % playerCount].push(deck[i]);
  }
  // Sort each hand by rank then suit
  return hands.map(hand => sortHand(hand));
}

export function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const r = rankValue(a.rank) - rankValue(b.rank);
    return r !== 0 ? r : suitValue(a.suit) - suitValue(b.suit);
  });
}

export function cardEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

// Generate a random seed for the game
export function generateSeed(): number {
  return Math.floor(Math.random() * 0xFFFFFFFF);
}
