---
name: Blog post author name format
description: In AIToolCrunch blog JSON files, author field must use display name not slug
type: feedback
---

Use the display name ("Alex Chen") not slug ("alex-chen") in blog post JSON "author" fields.

**Why:** All other blog posts use display name format; it was wrong once and had to be fixed.

**How to apply:** When writing any blog JSON file, use the "name" value from data/authors.json, not the "slug" value.
