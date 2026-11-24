import { describe, expect, it } from 'vitest';
import {
  buildDeck,
  checkOutcome,
  createInitialState,
  evalCard,
  playPlayerCard,
  runAiTurn,
  usePlayerReshuffle,
} from '../src/game/engine';
import type { Card, GameState } from '../src/game/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    uid: 1,
    suit: 'spades',
    sym: '♠',
    lbl: '5',
    base: 5,
    ace: false,
    face: false,
    ...overrides,
  };
}

describe('Suit Duel engine', () => {
  it('builds a standard 52-card deck', () => {
    const deck = buildDeck(() => 0.5);
    expect(deck).toHaveLength(52);
    const suits = new Set(deck.map((c) => c.suit));
    expect(suits.size).toBe(4);
  });

  it('activates Underdog Ace surge (11 power) only when behind in that suit stat', () => {
    const state: Pick<GameState, 'you' | 'ai'> = {
      you: { hp: 15, shield: 8, hand: [] },
      ai: { hp: 25, shield: 5, hand: [] },
    };

    const heartAce = makeCard({ suit: 'hearts', sym: '♥', lbl: 'A', base: 1, ace: true });
    const diamondAce = makeCard({ suit: 'diamonds', sym: '♦', lbl: 'A', base: 1, ace: true });

    const heartEval = evalCard(heartAce, 'you', state);
    expect(heartEval.surged).toBe(true);
    expect(heartEval.power).toBe(11);

    const diamondEval = evalCard(diamondAce, 'you', state);
    expect(diamondEval.surged).toBe(false);
    expect(diamondEval.power).toBe(1);
  });

  it('marks non-face clubs illegal when opponent has 0 shield', () => {
    const state: Pick<GameState, 'you' | 'ai'> = {
      you: { hp: 20, shield: 5, hand: [] },
      ai: { hp: 20, shield: 0, hand: [] },
    };
    const club5 = makeCard({ suit: 'clubs', sym: '♣', lbl: '5', base: 5, face: false });
    const clubJ = makeCard({ suit: 'clubs', sym: '♣', lbl: 'J', base: 10, face: true });

    expect(evalCard(club5, 'you', state).legal).toBe(false);
    expect(evalCard(clubJ, 'you', state).legal).toBe(true);
  });

  it('plays a player card, updates stats, draws replacement, and passes turn to AI', () => {
    const initial = createInitialState({ maxReshuffles: 1, deckMode: 'shoe' }, () => 0.42);
    initial.you.hand[0] = makeCard({ uid: 901, suit: 'hearts', sym: '♥', lbl: '8', base: 8 });
    const next = playPlayerCard(initial, 0, 'shoe', () => 0.42);

    expect(next.you.hp).toBe(28);
    expect(next.you.hand).toHaveLength(5);
    expect(next.turnSide).toBe('ai');

    const afterAi = runAiTurn(next, 'shoe', () => 0.42);
    expect(afterAi.turn).toBe(2);
    expect(afterAi.turnSide).toBe('you');
  });

  it('consumes a free reshuffle and replaces player hand', () => {
    const initial = createInitialState({ maxReshuffles: 1, deckMode: 'shoe' }, () => 0.25);
    const reshuffled = usePlayerReshuffle(initial, 'shoe', () => 0.25);

    expect(reshuffled.reshufflesLeft).toBe(0);
    expect(reshuffled.you.hand).toHaveLength(5);
    expect(reshuffled.discard.length).toBeGreaterThanOrEqual(5);
  });

  it('detects Ascension and Knockout outcomes', () => {
    expect(
      checkOutcome({
        turn: 12,
        you: { hp: 200, shield: 0, hand: [] },
        ai: { hp: 50, shield: 5, hand: [] },
      })?.winner,
    ).toBe('you');

    expect(
      checkOutcome({
        turn: 9,
        you: { hp: 40, shield: 5, hand: [] },
        ai: { hp: 0, shield: 0, hand: [] },
      })?.winner,
    ).toBe('you');
  });
});
