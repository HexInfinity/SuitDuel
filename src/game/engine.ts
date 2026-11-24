import type {
  Card,
  CardEval,
  DeckMode,
  DuelOutcome,
  GameConfig,
  GameState,
  PlayerSide,
  SuitId,
  SuitMeta,
} from './types';

export const TARGET_HP = 200;
export const STARTING_HP = 20;
export const STARTING_SHIELD = 5;
export const HAND_SIZE = 5;

export const SUITS: SuitMeta[] = [
  { id: 'hearts', sym: '♥', label: 'Hearts' },
  { id: 'diamonds', sym: '♦', label: 'Diamonds' },
  { id: 'clubs', sym: '♣', label: 'Clubs' },
  { id: 'spades', sym: '♠', label: 'Spades' },
];

interface RankDef {
  r: number;
  lbl: string;
  base: number;
  ace?: boolean;
  face?: boolean;
}

export const RANKS: RankDef[] = [
  { r: 1, lbl: 'A', base: 1, ace: true, face: false },
  { r: 2, lbl: '2', base: 2 },
  { r: 3, lbl: '3', base: 3 },
  { r: 4, lbl: '4', base: 4 },
  { r: 5, lbl: '5', base: 5 },
  { r: 6, lbl: '6', base: 6 },
  { r: 7, lbl: '7', base: 7 },
  { r: 8, lbl: '8', base: 8 },
  { r: 9, lbl: '9', base: 9 },
  { r: 10, lbl: '10', base: 10 },
  { r: 11, lbl: 'J', base: 10, face: true },
  { r: 12, lbl: 'Q', base: 12, face: true },
  { r: 13, lbl: 'K', base: 14, face: true },
];

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildDeck(rng: () => number = Math.random): Card[] {
  const deck: Card[] = [];
  let uid = 1;
  for (const s of SUITS) {
    for (const rk of RANKS) {
      deck.push({
        uid: uid++,
        suit: s.id,
        sym: s.sym,
        lbl: rk.lbl,
        base: rk.base,
        ace: Boolean(rk.ace),
        face: Boolean(rk.face),
      });
    }
  }
  return shuffle(deck, rng);
}

export function addLog(logs: string[], message: string): string[] {
  return [message, ...logs].slice(0, 4);
}

export function evalCard(card: Card, who: PlayerSide, state: Pick<GameState, 'you' | 'ai'>): CardEval {
  const me = state[who];
  const opp = state[who === 'you' ? 'ai' : 'you'];
  let power = card.base;
  let surged = false;

  if (card.ace) {
    const behind =
      card.suit === 'hearts' || card.suit === 'spades'
        ? me.hp < opp.hp
        : me.shield < opp.shield;
    if (behind) {
      power = 11;
      surged = true;
    }
  }

  let tag = `${card.sym} ${power}`;
  let legal = true;

  if (card.suit === 'hearts') {
    tag = card.face ? `LEECH +${power}♥/+${Math.floor(power / 2)}♦` : `+${power} HP`;
  } else if (card.suit === 'diamonds') {
    tag = card.face ? `REFL +${power}♦/-${Math.floor(power / 2)}♦` : `+${power} SHD`;
  } else if (card.suit === 'clubs') {
    legal = opp.shield > 0 || card.face;
    tag = card.face ? `SHAT -${power}` : opp.shield > 0 ? `-${power} SHD` : 'No Shield';
  } else if (card.suit === 'spades') {
    if (opp.shield === 0 || card.face) {
      tag = card.face ? `PIERCE -${power}♥` : `-${power} HP`;
    } else {
      const hpD = Math.floor(power / 2);
      const shD = Math.ceil(power / 2);
      tag = `-${hpD}♥ / -${shD}♦`;
    }
  }

  return { power, surged, tag, legal };
}

function drawOneMutating(
  state: GameState,
  who: PlayerSide,
  deckMode: DeckMode,
  rng: () => number = Math.random,
): Card | null {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null;
    state.deck = shuffle(state.discard, rng);
    state.discard = [];
    state.logs = addLog(state.logs, 'Discard pile reshuffled into the shoe.');
  }

  if (deckMode === 'director' && state.deck.length > 4) {
    const me = state[who];
    const opp = state[who === 'you' ? 'ai' : 'you'];
    const want: SuitId = me.hp <= 12 ? 'hearts' : opp.shield >= 12 ? 'clubs' : 'spades';
    const idx = state.deck.findIndex((c) => c.suit === want);
    if (idx > 0 && rng() < 0.35) {
      return state.deck.splice(idx, 1)[0];
    }
  }

  return state.deck.pop() ?? null;
}

function ensurePlayableHandMutating(
  state: GameState,
  who: PlayerSide,
  deckMode: DeckMode,
  rng: () => number = Math.random,
): void {
  const hand = state[who].hand;
  if (hand.some((c) => evalCard(c, who, state).legal)) return;

  state.discard.push(...hand);
  state[who].hand = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    const card = drawOneMutating(state, who, deckMode, rng);
    if (card) state[who].hand.push(card);
  }
  state.logs = addLog(
    state.logs,
    `${who === 'you' ? 'Your' : "Rival's"} hand bricked — Clean Sweep redraw!`,
  );
}

export function checkOutcome(state: Pick<GameState, 'you' | 'ai' | 'turn'>): DuelOutcome | null {
  if (state.you.hp >= TARGET_HP) {
    return {
      winner: 'you',
      title: 'Ascension Victory',
      subtitle: `You ascended to ${state.you.hp} HP on Turn ${state.turn}!`,
    };
  }
  if (state.ai.hp <= 0) {
    return {
      winner: 'you',
      title: 'Knockout Victory',
      subtitle: `You knocked Rival out on Turn ${state.turn}!`,
    };
  }
  if (state.ai.hp >= TARGET_HP) {
    return {
      winner: 'ai',
      title: 'Rival Ascended',
      subtitle: `Rival reached ${state.ai.hp} HP on Turn ${state.turn}.`,
    };
  }
  if (state.you.hp <= 0) {
    return {
      winner: 'ai',
      title: 'Defeated',
      subtitle: `Your HP hit 0 on Turn ${state.turn}.`,
    };
  }
  return null;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    deck: state.deck.slice(),
    discard: state.discard.slice(),
    logs: state.logs.slice(),
    you: { ...state.you, hand: state.you.hand.slice() },
    ai: { ...state.ai, hand: state.ai.hand.slice() },
  };
}

function applyCardMutating(state: GameState, card: Card, who: PlayerSide, calloutId: number): void {
  const actor: 'You' | 'Rival' = who === 'you' ? 'You' : 'Rival';
  const me = state[who];
  const opp = state[who === 'you' ? 'ai' : 'you'];
  const info = evalCard(card, who, state);
  const p = info.power;

  let calloutText = '';
  let tone: NonNullable<GameState['callout']>['tone'] = 'hearts';

  if (card.suit === 'hearts') {
    me.hp += p;
    const bonusShd = card.face ? Math.floor(p / 2) : 0;
    me.shield += bonusShd;
    calloutText = bonusShd ? `+${p} HP  +${bonusShd} SHD` : `+${p} HP`;
    tone = 'hearts';
    state.logs = addLog(
      state.logs,
      `${actor} played ${card.lbl}${card.sym}: healed ${p} HP${bonusShd ? ` & +${bonusShd} Shield` : ''}.`,
    );
  } else if (card.suit === 'diamonds') {
    me.shield += p;
    const strip = card.face ? Math.min(opp.shield, Math.floor(p / 2)) : 0;
    opp.shield -= strip;
    calloutText = strip ? `+${p} SHD  -${strip} Rival SHD` : `+${p} SHD`;
    tone = 'diamonds';
    state.logs = addLog(
      state.logs,
      `${actor} played ${card.lbl}${card.sym}: +${p} Shield${strip ? ` & stripped ${strip} Shield` : ''}.`,
    );
  } else if (card.suit === 'clubs') {
    const broken = Math.min(opp.shield, p);
    opp.shield -= broken;
    const overflow = card.face ? Math.max(0, p - broken) : 0;
    opp.hp = Math.max(0, opp.hp - overflow);
    calloutText = overflow ? `SHATTER -${broken} SHD / -${overflow} HP` : `-${broken} SHD`;
    tone = 'clubs';
    state.logs = addLog(
      state.logs,
      `${actor} played ${card.lbl}${card.sym}: broke ${broken} Shield${overflow ? ` + ${overflow} HP shatter` : ''}.`,
    );
  } else if (card.suit === 'spades') {
    if (opp.shield === 0 || card.face) {
      opp.hp = Math.max(0, opp.hp - p);
      calloutText = card.face ? `PIERCE -${p} HP` : `-${p} HP`;
      tone = 'spades-pierce';
      state.logs = addLog(
        state.logs,
        `${actor} played ${card.lbl}${card.sym}: struck ${p} HP${card.face ? ' (Pierce)' : ''}!`,
      );
    } else {
      const hpD = Math.floor(p / 2);
      const shD = Math.ceil(p / 2);
      const actualShd = Math.min(opp.shield, shD);
      opp.shield -= actualShd;
      opp.hp = Math.max(0, opp.hp - hpD);
      calloutText = `GLANCE -${hpD} HP / -${actualShd} SHD`;
      tone = 'spades-glance';
      state.logs = addLog(
        state.logs,
        `${actor} played ${card.lbl}${card.sym}: glancing -${hpD} HP & -${actualShd} Shield.`,
      );
    }
  }

  state.lastCard = { card, actor, info };
  state.callout = { id: calloutId, text: calloutText, tone };
}

export function createInitialState(
  config: Pick<GameConfig, 'maxReshuffles' | 'deckMode'>,
  rng: () => number = Math.random,
): GameState {
  const state: GameState = {
    turn: 1,
    turnSide: 'you',
    over: false,
    outcome: null,
    reshufflesLeft: config.maxReshuffles,
    deck: buildDeck(rng),
    discard: [],
    lastCard: null,
    callout: null,
    logs: ['Duel started! Race to 200 HP or drop Rival to 0 HP.'],
    you: { hp: STARTING_HP, shield: STARTING_SHIELD, hand: [] },
    ai: { hp: STARTING_HP, shield: STARTING_SHIELD, hand: [] },
  };

  for (let i = 0; i < HAND_SIZE; i++) {
    const pCard = drawOneMutating(state, 'you', config.deckMode, rng);
    if (pCard) state.you.hand.push(pCard);
    const aCard = drawOneMutating(state, 'ai', config.deckMode, rng);
    if (aCard) state.ai.hand.push(aCard);
  }

  ensurePlayableHandMutating(state, 'you', config.deckMode, rng);
  return state;
}

export function playPlayerCard(
  prevState: GameState,
  handIndex: number,
  deckMode: DeckMode,
  rng: () => number = Math.random,
): GameState {
  if (prevState.over || prevState.turnSide !== 'you') return prevState;
  const card = prevState.you.hand[handIndex];
  if (!card) return prevState;

  const info = evalCard(card, 'you', prevState);
  if (!info.legal) return prevState;

  const next = cloneState(prevState);
  next.you.hand.splice(handIndex, 1);
  next.discard.push(card);

  const calloutId = (prevState.callout?.id ?? 0) + 1;
  applyCardMutating(next, card, 'you', calloutId);

  const drawn = drawOneMutating(next, 'you', deckMode, rng);
  if (drawn) next.you.hand.push(drawn);

  const outcome = checkOutcome(next);
  if (outcome) {
    next.over = true;
    next.outcome = outcome;
    return next;
  }

  next.turnSide = 'ai';
  ensurePlayableHandMutating(next, 'ai', deckMode, rng);
  return next;
}

export function pickAiCardIndex(state: GameState): number {
  let bestIdx = 0;
  let bestScore = -999;

  state.ai.hand.forEach((card, idx) => {
    const info = evalCard(card, 'ai', state);
    if (!info.legal) return;

    let score = info.power + (info.surged ? 4 : 0) + (card.face ? 3 : 0);
    if (card.suit === 'hearts' && state.ai.hp >= 185) score += 15;
    if (card.suit === 'spades' && state.you.hp <= info.power) score += 25;
    if (card.suit === 'clubs' && state.you.shield > 0) score += 3;

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

export function runAiTurn(
  prevState: GameState,
  deckMode: DeckMode,
  rng: () => number = Math.random,
): GameState {
  if (prevState.over || prevState.turnSide !== 'ai') return prevState;

  const next = cloneState(prevState);
  const bestIdx = pickAiCardIndex(next);
  const chosen = next.ai.hand.splice(bestIdx, 1)[0];
  if (!chosen) return prevState;

  next.discard.push(chosen);
  const calloutId = (prevState.callout?.id ?? 0) + 1;
  applyCardMutating(next, chosen, 'ai', calloutId);

  const drawn = drawOneMutating(next, 'ai', deckMode, rng);
  if (drawn) next.ai.hand.push(drawn);

  const outcome = checkOutcome(next);
  if (outcome) {
    next.over = true;
    next.outcome = outcome;
    return next;
  }

  next.turn += 1;
  next.turnSide = 'you';
  ensurePlayableHandMutating(next, 'you', deckMode, rng);
  return next;
}

export function usePlayerReshuffle(
  prevState: GameState,
  deckMode: DeckMode,
  rng: () => number = Math.random,
): GameState {
  if (prevState.over || prevState.turnSide !== 'you' || prevState.reshufflesLeft <= 0) {
    return prevState;
  }

  const next = cloneState(prevState);
  next.reshufflesLeft -= 1;
  next.discard.push(...next.you.hand);
  next.you.hand = [];

  for (let i = 0; i < HAND_SIZE; i++) {
    const card = drawOneMutating(next, 'you', deckMode, rng);
    if (card) next.you.hand.push(card);
  }

  ensurePlayableHandMutating(next, 'you', deckMode, rng);
  next.logs = addLog(next.logs, `You used a free hand reshuffle (${next.reshufflesLeft} left).`);
  return next;
}
