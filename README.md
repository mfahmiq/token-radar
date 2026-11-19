# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mfahmiq/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mfahmiq/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

The best token launch radar: a dashboard that ranks pre-token protocols by implied value and shows a reader how to farm each one. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

## What it does

A protocol's launch is the token it may issue one day. This radar reads a sealed snapshot of 758 DefiLlama protocols (as of 2026-11-14), scores the 40 on the watchlist plus 160 early pre-token protocols below the $50M floor, and ranks all 200 by an implied value — what a token would be worth if the protocol's record stayed as it is. It never predicts whether or when a token is issued.

## The model (radar-2)

Implied value follows only from the snapshot's own figures:

```
implied = TVL x CATEGORY_MULTIPLE x growth x maturity
```

- **CATEGORY_MULTIPLE** — the median market-cap-per-TVL of the protocols in the same category that already trade, shrunk toward the global median (prior weight 3) and clamped to [0.05, 1.5], computed from the snapshot at run time. A category with no live comparable takes the global median (×0.246). No protocol name is ever special-cased.
- **growth** — the 7-day TVL change, clamped to [−60%, +120%], weighted 0.5.
- **maturity** — 0.6 + min(age in days, 1095) / 1095 × 0.4, so a protocol that has run longer with no token scores higher; unknown age counts as 365 days.

Every row also carries a concrete 6-step farm plan (what to do, what it costs, how long it takes), derived from the protocol's category, chains, TVL and age. A separate Live-token view shows the 24 largest protocols that already trade, at the market's own values — never mixed into the ranked board.

## Run it

```sh
# Build the board + dashboard from the sealed snapshot:
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
# Add a one-line summary (top five rows and the category multiples):
MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json> --summary
# Serve the dashboard (it reads data.js, no network):
python3 -m http.server 8080 --directory out
# open http://localhost:8080/dashboard/
```

`main.ts` (Node 22, standard library only) reads `/input/snapshot.json`, writes the ranked board to `/output/board.json`, the dashboard's data to `/output/data.js`, copies `dashboard/` and `screenshots/` to `/output`, and writes `/output/dossier.json` with the vendored make.fun library. Before it writes anything it validates the board against the gate's own shape (ranks 1..N, implied values non-increasing, all 40 watchlist slugs present, every farm plan 3 to 12 steps of 20 to 600 characters) and refuses a board that fails.

## What the dashboard shows

- **The board**: 200 pre-token rows, strongest implied value first, with TVL, seven-day growth, age and a bar for each row's share of the leader. Click a row (or press Enter on it) for its detail drawer.
- **Filters**: search by name, category or chain; a category and a chain dropdown; and a Pre-token / Live-token tab. The live tab shows the 24 protocols that already trade, at the market's own values.
- **The model panel**: the formula in full, the explanation, and a table of every category's multiple with its comparable count — so a reader can see which multiples rest on many protocols and which on one.
- **The detail drawer**: the row's implied-value equation with the model's own inputs, the comparable count its multiple rests on, the page's recomputation of the row beside the board's number (the two agree, or the drawer says the data would be stale), and the six-step farm plan with each step's cost and time.
- **Shortcuts**: press **E** to download the filtered board as CSV, **C** to copy a link to the current view (the link carries the search, the filters and the open row). Both are listed in the footer, below the board.

## How to read the board

Start with the multiple, not the number. A row whose category multiple rests on 15 live comparables (Lending, ×0.151) is a thick estimate; a row whose multiple rests on one (Risk Curators, ×0.928) is thin — the dashboard says so on the row. The top of the board is dominated by Risk Curators because one live comparable set a high multiple; that is the model following the snapshot, not a judgement about the protocols. And implied value is an estimate, never a price: it does not predict whether or when a token is issued.

## The board

| | |
|---|---|
| Rows | 200 (40 watchlist + 160 early) |
| #1 | Steakhouse Financial — $2.02B implied |
| Snapshot | DefiLlama, 2026-11-14 |

---

<sub>Entered on [make.fun](https://make.fun/?ref=g2ktgb6s&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
