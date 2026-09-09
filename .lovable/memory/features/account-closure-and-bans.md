---
name: Account closure, deletion and bans
description: Rules for closing accounts, the 30-day data purge, and the 365-day banned-user record
type: feature
---
- "Terminated" means the account is closed, not yet deleted.
- Closure types: `user_request` and `tos_violation` (`profiles.closure_type`, set via `close_account()`).
- 30 days after closure all account data (email, documents, activity history) is fully deleted and the account terminated — `purge_closed_accounts()`, daily cron `account-purge-daily`.
- Exception: Terms of Service closures keep email + reason + closure date in `banned_users` for 365 days; `purge_expired_bans()` removes them afterwards.
- Banned emails cannot re-register: `handle_new_user()` raises on `is_email_banned(email)`.
- Admin controls (Close / Close & ban / Reopen) and the banned list live on `/admin/people`.
