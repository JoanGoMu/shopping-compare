---
name: Never open visible tabs or windows for background work
description: User strongly dislikes any approach that opens tabs or windows the user didn't ask for. Use hidden iframes instead.
type: feedback
---

Never open browser tabs or windows for background data extraction or refresh operations.

**Why:** User explicitly rejected background tabs ("really disruptive, opens tabs in the navigator without the user wanting it") and minimized windows (opened a full new window per product - even worse). Tried both approaches and both were immediately rejected.

**How to apply:** For any feature that needs to load product pages in the background (e.g. refreshing related products from the same store), use hidden iframes injected into the current page. They share the same browser session/cookies, the content script runs inside them (all_frames: true), and they're completely invisible. If a store blocks iframes via X-Frame-Options, accept the graceful failure - don't fall back to tabs or windows.
