import type { CareerStats, GameConfig } from './types';

const CONFIG_KEY = 'suit-duel.config.v1';
const STATS_KEY = 'suit-duel.stats.v1';

export const DEFAULT_CONFIG: GameConfig = {
  maxReshuffles: 1,
  deckMode: 'shoe',
  speed: 1,
  soundEnabled: true,
};

export const DEFAULT_STATS: CareerStats = {
  duelsPlayed: 0,
  wins: 0,
  losses: 0,
  ascensions: 0,
  knockouts: 0,
  bestWinTurn: null,
  currentStreak: 0,
  bestStreak: 0,
};

export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<GameConfig>;
    return {
      maxReshuffles:
        typeof parsed.maxReshuffles === 'number' && parsed.maxReshuffles >= 0 && parsed.maxReshuffles <= 3
          ? parsed.maxReshuffles
          : DEFAULT_CONFIG.maxReshuffles,
      deckMode: parsed.deckMode === 'director' ? 'director' : 'shoe',
      speed: parsed.speed === 2 ? 2 : 1,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors in restricted webviews.
  }
}

export function loadStats(): CareerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw) as Partial<CareerStats>;
    return {
      ...DEFAULT_STATS,
      ...parsed,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function recordDuelOutcome(
  stats: CareerStats,
  winner: 'you' | 'ai',
  title: string,
  turn: number,
): CareerStats {
  const won = winner === 'you';
  const nextStreak = won ? stats.currentStreak + 1 : 0;
  const next: CareerStats = {
    duelsPlayed: stats.duelsPlayed + 1,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
    ascensions: stats.ascensions + (won && title.includes('Ascension') ? 1 : 0),
    knockouts: stats.knockouts + (won && title.includes('Knockout') ? 1 : 0),
    bestWinTurn:
      won && (stats.bestWinTurn === null || turn < stats.bestWinTurn) ? turn : stats.bestWinTurn,
    currentStreak: nextStreak,
    bestStreak: Math.max(stats.bestStreak, nextStreak),
  };
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors.
  }
  return next;
}
