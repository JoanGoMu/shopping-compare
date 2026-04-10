---
name: Always add comparisons when adding new tools
description: Every new tool added to data/tools/ must also get comparison pages against related tools in the same category before committing
type: feedback
---

Whenever a new tool is added to `data/tools/`, always add comparison entries to `data/comparisons.json` in the same commit - before pushing.

**Why:** Joan asked why comparisons weren't created when Make and n8n were added. Comparisons are high SEO value pages and should always accompany new tools. They were missing because I added the tools but forgot the comparisons.

**How to apply:**
- For each new tool, add comparisons against: all other tools in the same category, plus any closely related tools in adjacent categories.
- Example: adding Make (ai-automation) means adding make-vs-n8n, make-vs-gumloop, n8n-vs-gumloop in the same commit.
- Check `data/comparisons.json` for existing slugs to avoid duplicates.
- A comparison slug is always alphabetical: if A comes before B alphabetically, use a-vs-b.
