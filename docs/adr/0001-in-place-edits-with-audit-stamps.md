# In-place edits, no revision history, audit by stamp

Entries are edited in place: there is no revision history, no draft/published workflow, and no verification state stored in the database. An entry existing in the backend means it has been verified, and the presence of `created_by` / `updated_by` on the tables is the audit record. This keeps the admin panel a place to fix a typo rather than a publishing system, and it matches the intended use: a handful of trusted administrators entering quotes they have checked by hand.

## Considered Options

- **Draft → published workflow with frozen revisions** (recommended during design, declined): protects the promise that a card shared six months ago still matches what the page says, but costs a revisions table and a second editing surface in v1.
- **Soft verification flags** (e.g. an `unverified` boolean): rejected because a state the application never enforces is a state that will drift out of sync with reality.
- **Full audit log table**: deferred. `created_by` / `updated_by` records _who touched it and when_, not _what changed_.

## Consequences

- A card shared into the wild can drift from the live page. Once a quote is edited, the earlier image circulating on WhatsApp is unreproducible — the image URL must therefore be cache-busted by `updated_at` so a shared link never serves a stale render.
- Changing a Quote's or Person's slug breaks every link already shared, with no redirect history to repair it. Slugs are frozen after first save and only changed deliberately.
- Retrofitting revision history later means a migration plus a decision about what to do with entries that predate it.
- With several administrators and no diff history, `updated_by` answers "who changed this last" but not "who changed the phrase that got us in trouble". Accepted at this scale.
