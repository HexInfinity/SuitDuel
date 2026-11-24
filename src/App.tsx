import { useEffect, useState } from 'react';
import { BookOpen, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { sfx } from './audio/sfx';
import {
  TARGET_HP,
  createInitialState,
  evalCard,
  playPlayerCard,
  runAiTurn,
  usePlayerReshuffle,
} from './game/engine';
import { loadConfig, loadStats, recordDuelOutcome, saveConfig } from './game/storage';
import type { CareerStats, DeckMode, GameConfig, GameState, SuitId } from './game/types';

function suitClass(suit: SuitId): string {
  return `suit-${suit}`;
}

export default function App() {
  const [config, setConfig] = useState<GameConfig>(() => loadConfig());
  const [draftConfig, setDraftConfig] = useState<GameConfig>(() => loadConfig());
  const [state, setState] = useState<GameState>(() => createInitialState(loadConfig()));
  const [stats, setStats] = useState<CareerStats>(() => loadStats());
  const [rulesOpen, setRulesOpen] = useState(false);

  // Trigger AI turn automatically when it's Rival's turn.
  useEffect(() => {
    if (state.over || state.turnSide !== 'ai') return;
    const delayMs = config.speed === 2 ? 420 : 850;
    const timer = window.setTimeout(() => {
      setState((prev) => {
        const next = runAiTurn(prev, config.deckMode);
        if (next.lastCard) {
          sfx.playCard(next.lastCard.card.suit, next.lastCard.info.surged, config.soundEnabled);
        }
        if (next.over && next.outcome) {
          sfx.playOutcome(next.outcome.winner === 'you', config.soundEnabled);
          setStats((s) => recordDuelOutcome(s, next.outcome!.winner, next.outcome!.title, next.turn));
        }
        return next;
      });
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [state.over, state.turnSide, state.turn, config.speed, config.deckMode, config.soundEnabled]);

  const handlePlayCard = (index: number) => {
    if (state.over || state.turnSide !== 'you') return;
    const card = state.you.hand[index];
    if (!card) return;
    const info = evalCard(card, 'you', state);
    if (!info.legal) return;

    sfx.playCard(card.suit, info.surged, config.soundEnabled);

    setState((prev) => {
      const next = playPlayerCard(prev, index, config.deckMode);
      if (next.over && next.outcome) {
        sfx.playOutcome(next.outcome.winner === 'you', config.soundEnabled);
        setStats((s) => recordDuelOutcome(s, next.outcome!.winner, next.outcome!.title, next.turn));
      }
      return next;
    });
  };

  const handleReshuffle = () => {
    setState((prev) => usePlayerReshuffle(prev, config.deckMode));
  };

  const handleToggleSpeed = () => {
    const nextConfig: GameConfig = { ...config, speed: config.speed === 1 ? 2 : 1 };
    setConfig(nextConfig);
    setDraftConfig(nextConfig);
    saveConfig(nextConfig);
  };

  const handleToggleSound = () => {
    const nextConfig: GameConfig = { ...config, soundEnabled: !config.soundEnabled };
    setConfig(nextConfig);
    setDraftConfig(nextConfig);
    saveConfig(nextConfig);
  };

  const handleStartNewDuel = (nextCfg: GameConfig = config) => {
    setState(createInitialState(nextCfg));
  };

  const handleApplyRules = () => {
    setConfig(draftConfig);
    saveConfig(draftConfig);
    setRulesOpen(false);
    handleStartNewDuel(draftConfig);
  };

  const openRules = () => {
    setDraftConfig(config);
    setRulesOpen(true);
  };

  return (
    <div className="sd-shell">
      {/* Top Bar */}
      <header className="sd-topbar">
        <div>
          <h1 className="sd-title">SUIT DUEL: 200</h1>
          <p className="sd-sub">
            Turn <strong>{state.turn}</strong> • Shoe <strong>{state.deck.length}</strong>
          </p>
        </div>
        <div className="sd-actions">
          <button
            type="button"
            className="sd-btn"
            onClick={handleToggleSound}
            aria-label={config.soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {config.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button type="button" className="sd-btn" onClick={handleToggleSpeed}>
            {config.speed}x
          </button>
          <button type="button" className="sd-btn sd-btn-emerald" onClick={openRules}>
            <BookOpen size={13} />
            Rules
          </button>
        </div>
      </header>

      {/* Main Tabletop */}
      <main className="sd-main">
        {/* Rival Panel */}
        <section className="sd-panel">
          <div className="sd-row-between">
            <div className="sd-fighter-meta">
              <span className="sd-badge-role sd-role-ai">Rival</span>
              <span className="sd-shield-pill">♦ {state.ai.shield}</span>
            </div>
            <div className="sd-hp-text">
              <strong>{state.ai.hp}</strong> / {TARGET_HP} HP
            </div>
          </div>
          <div className="sd-hp-track">
            <div
              className="sd-hp-fill sd-hp-ai"
              style={{ width: `${Math.min(100, (state.ai.hp / TARGET_HP) * 100)}%` }}
            />
          </div>
          <div className="sd-ai-hand" aria-label={`Rival has ${state.ai.hand.length} cards`}>
            {state.ai.hand.map((c) => (
              <div key={c.uid} className="sd-card-back" />
            ))}
          </div>
        </section>

        {/* Center Arena */}
        <section className="sd-arena">
          <div
            className={`sd-turn-pill ${
              state.turnSide === 'you' ? 'sd-turn-you' : 'sd-turn-ai'
            }`}
          >
            {state.turnSide === 'you' ? 'Your Turn — Tap a Card' : 'Rival Thinking...'}
          </div>

          <div className="sd-center-stage">
            {state.lastCard ? (
              <div className="sd-last-card sd-card-face">
                <span style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  {state.lastCard.actor}
                </span>
                <div
                  className={suitClass(state.lastCard.card.suit)}
                  style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}
                >
                  {state.lastCard.card.lbl}
                  {state.lastCard.card.sym}
                </div>
                <span className="sd-card-tag">{state.lastCard.info.tag}</span>
              </div>
            ) : (
              <div className="sd-empty-slot">Table Center</div>
            )}

            {state.callout && (
              <div key={state.callout.id} className="sd-callout-wrap">
                <span className={`sd-callout sd-tone-${state.callout.tone}`}>
                  {state.callout.text}
                </span>
              </div>
            )}
          </div>

          <div className="sd-log" aria-live="polite">
            {state.logs.slice(0, 3).map((line, idx) => (
              <div key={`${idx}-${line}`} className={`sd-log-line ${idx === 0 ? 'latest' : ''}`}>
                • {line}
              </div>
            ))}
          </div>
        </section>

        {/* Player Panel */}
        <section className="sd-panel sd-panel-you">
          <div className="sd-row-between" style={{ marginBottom: 4 }}>
            <div className="sd-fighter-meta">
              <span className="sd-badge-role sd-role-you">You</span>
              <span className="sd-shield-pill">♦ {state.you.shield}</span>
            </div>
            <button
              type="button"
              className="sd-btn sd-btn-indigo"
              disabled={state.over || state.turnSide !== 'you' || state.reshufflesLeft <= 0}
              onClick={handleReshuffle}
            >
              <RotateCcw size={11} />
              Reshuffle ({state.reshufflesLeft}/{config.maxReshuffles})
            </button>
          </div>

          <div className="sd-row-between" style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
            <span className="sd-hp-text">
              <strong>{state.you.hp}</strong> / {TARGET_HP} HP
            </span>
            <span style={{ color: 'rgba(110, 231, 183, 0.85)' }}>
              {config.deckMode === 'shoe' ? 'True 52-Card Shoe' : 'Director RNG'}
            </span>
          </div>

          <div className="sd-hp-track">
            <div
              className="sd-hp-fill sd-hp-you"
              style={{ width: `${Math.min(100, (state.you.hp / TARGET_HP) * 100)}%` }}
            />
          </div>

          <div className="sd-hand-grid">
            {state.you.hand.map((card, idx) => {
              const info = evalCard(card, 'you', state);
              const canTap = !state.over && state.turnSide === 'you' && info.legal;
              return (
                <button
                  key={card.uid}
                  type="button"
                  disabled={!canTap}
                  onClick={() => handlePlayCard(idx)}
                  className={`sd-hand-card sd-card-face ${
                    canTap ? 'sd-card-playable' : ''
                  } ${info.surged ? 'sd-card-surge' : ''}`}
                >
                  {info.surged && <span className="sd-pill-surge">11!</span>}
                  {card.face && <span className="sd-pill-od">OD</span>}
                  <div className={`sd-card-corner ${suitClass(card.suit)}`}>
                    <span>{card.lbl}</span>
                    <span>{card.sym}</span>
                  </div>
                  <div className={`sd-card-center-sym ${suitClass(card.suit)}`}>{card.sym}</div>
                  <span className="sd-card-tag">{info.tag}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      {/* Rules & House Tuning Modal */}
      {rulesOpen && (
        <div className="sd-modal-backdrop" onClick={() => setRulesOpen(false)}>
          <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sd-row-between">
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fcd34d' }}>
                Rules &amp; House Tuning
              </h2>
              <button type="button" className="sd-btn" onClick={() => setRulesOpen(false)}>
                Close
              </button>
            </div>

            <div className="sd-stats-grid">
              <div className="sd-stat-cell">
                <div className="sd-stat-val">{stats.wins}</div>
                <div className="sd-stat-lbl">Wins ({stats.duelsPlayed} Duels)</div>
              </div>
              <div className="sd-stat-cell">
                <div className="sd-stat-val">{stats.bestStreak}</div>
                <div className="sd-stat-lbl">Best Streak</div>
              </div>
              <div className="sd-stat-cell">
                <div className="sd-stat-val">{stats.bestWinTurn ?? '—'}</div>
                <div className="sd-stat-lbl">Fastest Win Turn</div>
              </div>
            </div>

            <div className="sd-modal-box">
              <div className="sd-row-between">
                <span style={{ fontWeight: 700 }}>Free Reshuffles / Duel</span>
                <div className="sd-opt-group">
                  {[0, 1, 2, 3].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`sd-opt ${draftConfig.maxReshuffles === val ? 'active' : ''}`}
                      onClick={() => setDraftConfig((c) => ({ ...c, maxReshuffles: val }))}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sd-row-between">
                <span style={{ fontWeight: 700 }}>Deck Engine</span>
                <div className="sd-opt-group">
                  {(['shoe', 'director'] as DeckMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`sd-opt ${draftConfig.deckMode === mode ? 'active' : ''}`}
                      onClick={() => setDraftConfig((c) => ({ ...c, deckMode: mode }))}
                    >
                      {mode === 'shoe' ? 'True 52 Shoe' : 'Director RNG'}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className="sd-cta sd-cta-amber" onClick={handleApplyRules}>
                Apply &amp; Start New Duel
              </button>
            </div>

            <div className="sd-rules-list">
              <p>
                <strong style={{ color: '#fcd34d' }}>Win:</strong> Reach <strong>200 HP</strong>{' '}
                (Ascension) or drop Rival to <strong>0 HP</strong> (Knockout). Start at 20 HP / 5 Shield.
              </p>
              <p>
                <strong style={{ color: '#fb7185' }}>♥ Hearts:</strong> Heal +Power HP.{' '}
                <em>Face (Leech):</em> +⌊Power/2⌋ Shield.
              </p>
              <p>
                <strong style={{ color: '#38bdf8' }}>♦ Diamonds:</strong> Gain +Power Shield.{' '}
                <em>Face (Reflect):</em> -⌊Power/2⌋ Rival Shield.
              </p>
              <p>
                <strong style={{ color: '#34d399' }}>♣ Clubs:</strong> Break Rival Shield.{' '}
                <em>Face (Shatter):</em> Excess damage hits Rival HP.
              </p>
              <p>
                <strong style={{ color: '#f8fafc' }}>♠ Spades:</strong> Full HP hit if Rival Shield = 0
                or <em>Face (Pierce)</em>. Otherwise <strong>Glancing</strong>: ⌊P/2⌋ HP + ⌈P/2⌉ Shield.
              </p>
              <p>
                <strong style={{ color: '#fcd34d' }}>Underdog Aces &amp; Faces:</strong> Aces ={' '}
                <strong>11</strong> when behind in that suit&apos;s stat (HP for ♥/♠, Shield for ♦/♣),
                else 1. J=10, Q=12, K=14.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {state.over && state.outcome && (
        <div className="sd-modal-backdrop">
          <div className="sd-modal" style={{ maxWidth: 360, textAlign: 'center', borderColor: 'rgba(251, 191, 36, 0.5)' }}>
            <div>
              <span
                className="sd-turn-pill"
                style={{
                  background:
                    state.outcome.winner === 'you'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(244, 63, 94, 0.2)',
                  color: state.outcome.winner === 'you' ? '#6ee7b7' : '#fda4af',
                }}
              >
                {state.outcome.winner === 'you' ? 'Victory' : 'Defeat'}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{state.outcome.title}</h2>
            <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>{state.outcome.subtitle}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="sd-stat-cell">
                <div className="sd-stat-lbl">You</div>
                <div style={{ fontWeight: 800, color: '#6ee7b7', marginTop: 3 }}>
                  {state.you.hp} HP • {state.you.shield} SHD
                </div>
              </div>
              <div className="sd-stat-cell">
                <div className="sd-stat-lbl">Rival</div>
                <div style={{ fontWeight: 800, color: '#fda4af', marginTop: 3 }}>
                  {state.ai.hp} HP • {state.ai.shield} SHD
                </div>
              </div>
            </div>
            <button
              type="button"
              className="sd-cta sd-cta-emerald"
              onClick={() => handleStartNewDuel()}
            >
              Play Another Duel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
