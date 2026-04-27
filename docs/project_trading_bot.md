---
name: Trading bot - full project state
description: Complete context for the AI trading bot: architecture, all strategies, recent rework, key files, open issues
type: project
originSessionId: 29f91ca8-a2f2-412f-9c63-e94987827885
---
# Trading Bot - Project State (as of 2026-04-26)

## Location
`/Users/joan.mussone/Desktop/Projects/trading-bot/` (dev on Mac, deploy on Windows server via git push to GitHub)

## Stack
- Python async engine, SQLite trades DB, pandas-ta indicators
- Claude Haiku (fast decisions, 1m cycles), Claude Opus (daily advisor/picks)
- Brokers: Interactive Brokers (stocks), Coinbase Advanced Trade (crypto)
- Dashboard: single-file Python HTTP server (`dashboard.py`), LightweightCharts

## Strategies

### Scalping Crypto (Coinbase, 1m, 24/7)
**Entry (6 conditions, all must pass before Haiku is called):**
1. Trend gate: 15m close >= 15m EMA50 AND 5m close >= 5m EMA20
2. RSI(14) < 30 on 1m
3. Price <= lower Bollinger Band (20,2)
4. Volume > 1.2x 20-bar average
5. Not within 0.5% of nearest 15m swing-high resistance (PIVOTS_50)
6. Price within 0.5% of VWAP (near_vwap)

**Exit:**
- Hard stop: ATR(14) x 2.0 below entry (floor: -3%)
- Hard TP: ATR(14) x 4.0 above entry (cap: +8%)
- Indicator exits (only active after +3% profit - fee-aware floor): RSI > 70 OR MACD bearish cross
- Re-entry cooldown: 30 min after any SELL on same symbol

**Config:** max 15 trades/day, max 2/symbol/day, roundtrip_fee_pct: 1.2, context_timeframes: ["5m","15m"], indicators include VWAP + PIVOTS_50

### Scalping Stocks (IB, 1m, 09:35-15:50 US/Eastern)
**Entry (5 conditions):**
1. Trend gate: 15m EMA50 + 5m EMA20 (same as crypto)
2. RSI < 30
3. Price below VWAP
4. Volume > 1.2x avg
5. Not within 0.5% of nearest 15m swing-high resistance (PIVOTS_50)

**Exit:** -2% stop / +5% TP, min +2% for indicator exits (RSI > 65, MACD bearish), 30 min cooldown

**Config:** max 20 trades/day, max 2/symbol/day, context_timeframes: ["5m","15m"], PIVOTS_50 added

### Momentum Stocks / US Core / AI Picks (5m candles, unaffected by the rework)
Standard mean-reversion: RSI < 35, above VWAP, vol > 1.5x, MACD bullish. Different exit logic (trailing stops, longer holds). No trend gate, no S/R gate, no cooldown, no ATR stops. Not affected by Scalping rework.

## Key architectural decisions

### Haiku HOLD cache (ai/evaluator.py)
Symbols that got HOLD response skip Haiku re-call for 5 min if price hasn't moved >0.5% or RSI >2pts. BUY/SELL always evict cache immediately. Saves ~60-70% Haiku calls on slow days.

### Coinbase bar pagination (brokers/coinbase_broker.py)
Fetches up to 4,200 candles in 350-bar chunks (12 chunks max). Was silently returning only ~350 bars before. Now 15m context data covers ~44 days enabling real S/R (PIVOTS_50) and accurate EMA50.

### Two separate bar pipelines (core/engine.py)
- **Chart bars**: 2,000 bars of 1m data written to `logs/bars/SYMBOL.json` each cycle. ~33 hours of history. Resets on restart. This is what the chart displays.
- **Context bars**: 4,000 bars of 15m (44 days) and 5m (14 days) fetched internally each cycle for trend gate EMA computation and PIVOTS_50 S/R levels. Never written to chart files. These two pipelines are completely independent.

### ATR-based stops on lots (core/lot_registry.py)
`stop_price` and `take_profit_price` stored as absolute prices on each lot row. Migration runs idempotently on connect. Exit manager prefers absolute price; falls back to % if NULL.

### Multi-timeframe context (core/engine.py)
Fetches 4,000 bars for each context_timeframe per symbol before indicator cycle. Results in `context_snaps`. Trend gate is deterministic (before Haiku). Values written to snapshot: `trend_15m_bullish`, `trend_5m_bullish`, `nearest_resistance`, `nearest_support`.

### Trend gate (both Scalping strategies)
Blocks all entries when: 15m close < 15m EMA50 OR 5m close < 5m EMA20. Both must be true (price above both lines) for an entry to proceed. EMA50 on 15m = ~12.5h history. EMA20 on 5m = ~100min. Logs `[TrendGate] {symbol} blocked`.

## Dashboard key facts
- **Logs tab**: full unfiltered log. Strategy tabs show only logs matching that strategy name + all ERRORs (not WARNINGs).
- **Scanner cards**: 2-column grid with .scan-row wrappers for aligned separators
- **Chart**: auto-detects decimal precision from last close price (8dp sub-$0.0001, 6dp sub-$0.01, 4dp sub-$1, 2dp otherwise). Custom formatter forces trailing zeros.
- **Chart bar data**: 2,000 1m bars written each cycle to `logs/bars/SYMBOL.json`. Only covers ~33h since last restart.
- **Scalping panel**: interleaved 4-row CSS grid so budget/exit/card rows align between Stocks and Crypto columns
- **Guide tab**: has full documentation including Bar Data pipelines section, EMA/ATR explanations, Haiku cache, trend gate, S/R gate detail

## Known open issues
- **Earnings/dividends "⚠ Soon"**: yfinance sometimes fails to return concrete dates. Fix: run `python run_advisor.py` on server. Code path: `ai/daily_advisor.py` → yfinance enrichment → `logs/ai_picks.json`.
- **trend_gate always ✗**: As of 2026-04-26, crypto market broadly below 15m EMA50 (downtrend). Gate working correctly - verify in logs with `[TrendGate]` lines.
- **Chart "1M" shows only 2 days**: bars files only have 33h of 1m data since last server restart. Grows daily. The 44 days of 15m data are context-only (internal), never on chart.

## Exit conditions logic (important - user asked about this)
Layer 1 (always active): hard stop and hard TP fire regardless of profit level.
Layer 2 (only after min profit floor): indicator exits (RSI/MACD) unlock.
In practice: most exits happen at 3-6% via indicators; +8% TP is a safety ceiling not a target. To hold longer, disable indicator exit checkboxes in dashboard.
RSI exit thresholds: Scalping Crypto = 70 (raised from 65), Scalping Stocks = 65 (raised from 60).

## Deployment
- Dev: Mac. Push to GitHub → pull on Windows server → restart bot.
- DB migration (stop_price/take_profit_price columns) runs automatically on startup.
- Kill switch: create `TRADING_HALTED` file in bot folder to halt all trading immediately.

**Why:** User is actively trading with live money on IB + Coinbase. Bot runs 24/7 on Windows server. Changes go live after git pull + restart.
**How to apply:** When discussing changes, always consider: does it affect the risk manager? Does it need a DB migration? Does it affect both scalping strategies or just one? Non-scalping strategies (Momentum, US Core, AI Picks) are untouched by the rework.
