# User tracking clean-up: registrations, subscriptions, policy versions

## Recommendation in short

Your five ideas are right in substance. One change of approach: instead of five separate
lists that each hold their own copy of a person, keep **one person record** (the account)
plus **event history**, and make each admin page a different view of that same data. That
is how most operations teams do it, and it avoids the same person appearing three times
with three different truths.

So:

- One master people list = every account, with their current status (Registered / Trial /
  Subscriber / Cancelled / Terminated).
- One lifecycle history = dated rows for "registered", "trial started", "became
  subscriber", "cancelled", "terminated", written automatically by the payment webhook.
- One policy-versions library, with each account stamped at sign-up with the exact
  versions they agreed to.
- One support log.

Every admin page (Registered Users, Trial & Subscribers, Master list) then reads the same
source, so the numbers can never disagree.

## What gets built

### 1. Rename "newsletter sign-ups" to "Registered Users"
`/admin/email-signups` becomes `/admin/registered-users` (old link redirects). The screen
lists people with accounts who are not paying, not the old email-capture list. Columns:
email, registered at, policy versions agreed, current status, became subscriber on,
cancelled on, terminated on.

### 2. Trial users and subscribers on one screen
`/admin/subscribers` becomes the paid screen covering both, with a status filter (Trialing
/ Active / Cancelling / Cancelled / Past due). Shows trial start and end, conversion date,
cancellation date, plan, and interval. `/admin/trial-users` stays as a shortcut that opens
the same screen pre-filtered to trials.

### 3. Policy versions library at `/admin/PP-ToS`
A table of published documents: kind (Privacy Policy / Privacy Notice / Terms of Service),
version label, published date and time, full text of that version, and who published it.
Admins can add a new version; older versions are never edited. Privacy Notice starts empty
until you publish one.

At sign-up we record which version of each document was live at that moment, so any
account can be traced back to the exact text they accepted.

### 4. Master list with export
`/admin/people` — every account in one sortable table: user type, email (A–Z), registration
date, subscription date, cancellation date, termination date. Filters by type and date
range, and an **Export CSV** button that produces the email list for a campaign (respecting
anyone who has opted out of marketing email).

### 5. Support log
`/admin/support` — support contacts by email address with the messages they sent, date, and
a resolved flag. Entries can be added by an admin now; if you later route support email
into the app, it can populate automatically.

## Technical notes

New tables (all admin-read only, service-role write):

- `policy_documents` — kind, version, published_at, body (markdown/HTML), published_by.
- `account_lifecycle_events` — user_id, event_type (registered | trial_started |
  subscribed | cancelled | reactivated | terminated), occurred_at, source, metadata.
- `support_messages` — email, user_id (nullable), subject, body, channel, created_at,
  resolved_at.

New columns on `profiles` (additive, nullable): `registered_at`, `terminated_at`,
`first_subscribed_at`, `cancelled_at`, `accepted_privacy_policy_id`,
`accepted_privacy_notice_id`, `accepted_terms_id`, `marketing_opt_out`.

A database view `admin_people` joins `profiles` + `user_entitlements` + latest lifecycle
events and computes the status label; all admin screens read it.

Backfill: registration date from `auth.users.created_at`, subscription dates from existing
Stripe fields in `user_entitlements`, and one seeded version row each for the current
Privacy Policy and Terms of Service (dated as today unless you give me their real
publication dates). The Stripe webhook and the sign-up flow get lifecycle-event writes so
future changes are captured automatically.

`email_signups` is kept as-is for historical newsletter records and shown as a secondary
tab, not deleted.

## Open questions

- Real publication dates for the current Privacy Policy and Terms of Service, if you want
  history to be accurate before today.
- Whether "terminated" means account deleted by us or by the user; the plan treats it as
  the account being closed either way, with the reason stored.
