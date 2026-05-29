# Brands are a single shared catalog, not per-user data

Every other table is private per-user (RLS scoped to `auth.uid()`). The `brands` table is the deliberate exception: it is one global catalog (`name, aliases, domain, logo_url`) curated by the owner and shared across all users, used only to show a merchant logo on the dashboard in place of a generic category icon. A Transaction's free-text `note` is auto-matched against brand names/aliases on ingest to set an optional `brand_id`; no match falls back to the Category icon.

## Consequences

- RLS exception: all authenticated users may **read** `brands`; only the **service role** writes it. This is the only table where one user can see rows they didn't create — acceptable because it holds no personal data, just public merchant logos.
- Logos are referenced from an external logo CDN by domain (e.g. `logo.dev` / Clearbit-style), not stored by us — fewer assets to host, but a runtime dependency on that CDN's availability.
- Auto-match is best-effort (MVP = match-on-note only); a manual brand override in the CRUD UI is a planned later addition.
