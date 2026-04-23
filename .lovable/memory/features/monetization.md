---
name: monetization
description: Pricing, subscriber tool discounts, and gating
type: feature
---
# Monetization

## Tiers
- **Free**: Newsfeed (15 most recent), enforcement tracker, brief teaser, free weekly digest. Tools available at standalone (non-subscriber) prices.
- **Professional**: $29/mo or $290/yr (save $58). Full archive, weekly brief re-written for industry/jurisdictions, watchlists, **subscriber-discounted pricing on every assessment tool (up to 50% off)**, Regulatory Horizon access.
- **grandfathered_premium**: legacy $20/mo holders, retained at original price.

## Stripe lookup keys
- `professional_monthly` (v2) — $29.00
- `professional_yearly` (v2) — $290.00

## Tool pricing model
There is **no monthly tool-credit allowance**. Every tool charges per use, with two price tiers resolved at checkout via `get-tool-price` / `create-tool-checkout`:
- **Standalone** (non-subscriber): full price, e.g. Healthcheck $29, LIA $39, DPIA $69.
- **Subscriber** (Professional): discounted, e.g. Healthcheck $15, LIA $19, DPIA $39.
- IR Playbook and Biometric Checker (multi-jurisdiction) are **included free** for Professional subscribers.

`profiles.bonus_report_credits` and `profiles.monthly_reports_used` columns still exist in the schema but are no longer read or written by the app.

## Ads
Contextual, non-behavioural ads shown to **all users including Professional**. Never claim "ad-free."
