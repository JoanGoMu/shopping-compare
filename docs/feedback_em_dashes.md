---
name: No em dashes in content
description: Never use em dashes (—) in blog posts, comparisons, or any site content — always use regular hyphen (-) or rewrite the sentence
type: feedback
---

Never use the em dash character "—" in any content written for aitoolcrunch.com. This includes blog post content, titles, excerpts, comparison verdicts, and tool descriptions.

**Why:** Joan explicitly flagged this multiple times. Em dashes are a classic AI writing tell and make content feel generated rather than human.

**How to apply:** Use a regular hyphen "-" instead, or rewrite the sentence to avoid the dash entirely. This applies to all files in `data/blog/`, `data/comparisons.json`, and `data/tools/`. Check with `grep -r '—' data/` before every commit.
