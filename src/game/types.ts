export type SuitId = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type PlayerSide = 'you' | 'ai';
export type DeckMode = 'shoe' | 'director';
export type SpeedMode = 1 | 2;

export interface SuitMeta {
  id: SuitId;
  sym: string;
  label: string;
}

export interface Card {
  uid: number;
  suit: SuitId;
  sym: string;
  lbl: string;
  base: number;
  ace: boolean;
  face: boolean;
}

export interface CardEval {
  power: number;
  surged: boolean;
  tag: string;
  legal: boolean;
}

export interface FighterState {
  hp: number;
  shield: number;
  hand: Card[];
}

export interface GameConfig {
  maxReshuffles: number;
  deckMode: DeckMode;
  speed: SpeedMode;
  soundEnabled: boolean;
}

export interface CalloutEvent {
  id: number;
  text: string;
  tone: 'hearts' | 'diamonds' | 'clubs' | 'spades-pierce' | 'spades-glance';
}

export interface LastPlayedCard {
  card: Card;
  actor: 'You' | 'Rival';
  info: CardEval;
}

export interface DuelOutcome {
  winner: PlayerSide;
  title: string;
  subtitle: string;
}

export interface GameState {
  turn: number;
  turnSide: PlayerSide;
  over: boolean;
  outcome: DuelOutcome | null;
  reshufflesLeft: number;
  deck: Card[];
  discard: Card[];
  lastCard: LastPlayedCard | null;
  callout: CalloutEvent | null;
  logs: string[];
  you: FighterState;
  ai: FighterState;
}

export interface CareerStats {
  duelsPlayed: number;
  wins: number;
  losses: number;
  ascensions: number;
  knockouts: number;
  bestWinTurn: number | null;
  currentStreak: number;
  bestStreak: number;
}
