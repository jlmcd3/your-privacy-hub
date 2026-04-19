---
name: monetization
description: Pricing, report limits, credit bundles, and gating
type: feature
---
# Monetization

## Tiers
- **Free**: Newsfeed (15 most recent), enforcement tracker, brief teaser, one free assessment.
- **Professional**: $19/mo or $190/yr (save 17%). Full archive, weekly brief re-written for industry/jurisdictions, watchlists, **2 tool credits/month**, Regulatory Horizon access.
- **grandfathered_premium**: legacy $20/mo holders, retained at original price.

## Stripe lookup keys
- `professional_monthly` — $19.00
- `professional_yearly` — $190.00

## Tool credits
- `profiles.monthly_reports_used` increments per generation; resets monthly.
- `profiles.bonus_report_credits` for purchased credit packs.
- Professional tier includes 2 free credits/month before paid usage applies.

## Ads
Contextual, non-behavioural ads shown to **all users including Professional**. Never claim "ad-free."
