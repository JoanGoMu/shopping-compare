---
name: Chart sync solution - trading bot dashboard
description: Working solution for syncing 3 Lightweight Charts panels (candlestick + RSI + MACD) with auto-aggregation, bidirectional scroll/zoom, and no feedback loops
type: project
originSessionId: 29f91ca8-a2f2-412f-9c63-e94987827885
---
The chart modal in `dashboard.py` uses 3 independent Lightweight Charts v4.1.3 instances (main candle, RSI, MACD). The final working approach as of commit 025cd0e:

**Key patterns:**

1. **Bidirectional sync with `_syncLock`**: a `syncAll(tr, src)` function sets all charts except `src` to the given time range. `_syncLock=true` before setting, `false` after. Each chart's `subscribeVisibleTimeRangeChange` handler checks `!_syncLock&&!_aggRunning` before calling `syncAll`. Prevents feedback loops.

2. **Auto-aggregation via logical range**: `subscribeVisibleLogicalRangeChange` on main chart only. The visible bar count is `Math.round((lr.to - lr.from) * _lastFactor)` — multiply by current factor to get raw-bar-equivalent. This prevents the oscillation where resampled bars appear "too few" and trigger a factor decrease.

3. **Viewport preservation across resampling**: before `setData` calls in `applyFactor(f)`, capture `savedRange = CH.main.timeScale().getVisibleRange()`. After resampling, restore it via `setVisibleRange(savedRange)` in a `setTimeout(..., 80)`. Then call `syncAll(tr, 'main')` to align RSI/MACD. Set `_aggRunning=false` last.

4. **`fitContent()` only at initial load**: called once in `buildCharts()` on each chart. Never called inside `applyFactor()` — that was the cause of viewport reset on every zoom.

5. **RSI and MACD are interactive** (default `handleScroll/handleScale`). They sync via their own `subscribeVisibleTimeRangeChange` handlers back to main through `syncAll`.

**Why:** `visible * _lastFactor` is the critical insight. Without it, 83 resampled 30m bars → `factorForBars(83)=1` contradicts `_lastFactor=6` → infinite 5m↔30m oscillation (blinking).
