# The radar-2 model

Token Radar ranks pre-token protocols by **implied value**: what a protocol would be
worth if it had a token, judged by what the market already pays for protocols like it.
The model is one function of the snapshot's own figures, in `lib/model.ts`. No protocol
name is special-cased, and no row is hand-picked.

## The formula

```
implied = round( tvl_usd × category_multiple × growth_multiplier × maturity_multiplier )
```

- **TVL** is the protocol's total value locked, from the snapshot.
- **category_multiple** is the median market-cap-per-TVL of the live-token protocols in
  that category, shrunk toward the global median (prior weight 3) and clamped to
  [0.05, 1.5]. A category with one live comparable cannot set the price alone, and a
  category with none takes the global median. The multiples are computed from the
  snapshot at run time, never hardcoded.
- **growth_multiplier** is `1 + clamp(change_7d, -60, +120) / 100 × 0.5`: a protocol
  growing fast is worth more than a flat one, but the effect is capped.
- **maturity_multiplier** is `0.6 + min(age_days, 1095) / 1095 × 0.4`: a protocol that
  has run longer with no token is more likely to be close to one. An unlisted age uses
  365 days.

## What is ranked, and what is set aside

- The **watchlist** is the floor: every protocol with at least $50M of TVL and no token
  on record. All 40 watchlist slugs must appear on the board.
- The **early radar** adds 160 pre-token protocols below that floor, by TVL, so the
  board is 200 rows. They are ranked the same way, with the same function.
- **Live-token protocols** (24) are set aside with their market caps shown. Their market
  cap is a fact, not a model, and they are never ranked — but they are the comparables
  the multiples are built from.

## The farm plan

Every row carries a six-step farm plan: a fresh wallet, the protocol's own action
(supply, provide liquidity, bridge, stake, deposit — chosen by its category), one
qualifying action a week, a hold of 30 to 60 days by age, a claim only from the
protocol's own published link, and a farm log. Each step names its cost and its time.
The plan is derived from the protocol's category, chains, TVL and age — the same
derivation in `lib/model.ts` and in the dashboard's `app.js`, so the page and the
board agree.

## What it is not

Implied value is an estimate, not a price. It does not predict whether or when a token
is issued, and it says nothing about a protocol's team, security or governance. A high
implied value on a protocol with one comparable is a thin estimate — the dashboard says
so on the row's detail view. Read the multiple and its comparable count before the
number.
