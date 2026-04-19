# Memory: index.md
Updated: today

# Project Memory

## Core
Typography: DM Serif Display (Headings), DM Sans (Body), DM Mono (Citations).
Voice: Never use "AI-generated" or "AI-summarized". Use "Key takeaways" and "Full Analysis".
Security: Supabase with RLS. Write restricted to service_role. Sub/billing fields are read-only.
Cron: pg_cron jobs must use hardcoded function URLs.
Content: All AI-enriched analysis fields are completely ungated for all users.
Subscriptions: Professional tier $19/mo or $190/yr. Legacy "grandfathered_premium" preserved. Contextual ads shown to ALL users including Professional — never claim "ad-free".
Routing: React Router `<Link>` for internal. External links use `target="_blank"`.

## Memories
- [Project Overview](mem://project/overview) — What EndUserPrivacy.com is and its core features
- [Design System](mem://design/typography-and-colors) — Fonts, UI colors, article card styling, and document layouts
- [Brand Voice](mem://brand/voice-policy) — Banned words, allowed terminology, product identity
- [Monetization](mem://features/monetization) — Pricing ($19/$190), report limits, credit bundles, gating, ad policy
- [Newsfeed Rules](mem://features/newsfeed) — Access limits, breaking news logic, URL sync, ungated fields
- [Intelligence Brief](mem://features/intelligence-brief) — Inline citations, relevance scoring, custom generation
- [Routing & Navigation](mem://architecture/routing-navigation) — Link handling, scroll behavior, SEO redirects, jurisdiction slugs
- [Ingestion Pipeline](mem://architecture/ingestion-pipeline) — Rate limits, translation rules, sanitization, data sources
- [Database Schema](mem://architecture/database) — Key tables, constraints, environment IDs, and backfill logic
- [Security & Cron](mem://architecture/security-and-cron) — RLS policies, edge function auth, scheduling constraints
