# Suit Duel: 200

Mobile-first tactical 52-card duel game packaged with React, TypeScript, Vite, and Capacitor Android.

## Rules Summary
- **Goal**: Reach **200 HP** (Ascension) or drop Rival to **0 HP** (Knockout). Start at 20 HP / 5 Shield.
- **♥ Hearts**: Heal `+Power` HP. *Face (Leech)* adds `+⌊Power/2⌋` Shield.
- **♦ Diamonds**: Gain `+Power` Shield. *Face (Reflect)* strips `⌊Power/2⌋` Rival Shield.
- **♣ Clubs**: Break Rival Shield. *Face (Shatter)* deals excess damage to Rival HP.
- **♠ Spades**: Full HP hit if Rival Shield = 0 or *Face (Pierce)*; otherwise **Glancing** (`⌊P/2⌋` HP + `⌈P/2⌉` Shield).
- **Underdog Aces**: Aces surge to **11** when behind in that suit's stat (HP for ♥/♠, Shield for ♦/♣).

## Scripts
- `npm run dev` — Start Vite dev server on `http://127.0.0.1:5181`
- `npm run build` — Typecheck and build production bundle to `dist/`
- `npm run preview` — Preview production build on `http://127.0.0.1:5181`
- `npm run test` — Run Vitest engine suite
- `npm run cap:sync` — Sync `dist/` into the Capacitor Android project

## Firebase & GitHub Actions
Workflow: `.github/workflows/firebase-deploy.yml`
- **Project**: `hexinfinity-sakj`
- **Hosting target**: `suitduel`
- **Android package**: `com.hexinfinity.SuitDuel`
- Required GitHub repository secrets: `FIREBASE_TOKEN` and (for App Distribution) `FIREBASE_ANDROID_APP_ID`.
