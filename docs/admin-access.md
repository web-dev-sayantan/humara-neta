# Admin access

Who may sign in is the `allowlist` table, not a screen. The product has no allowlist management at all: no page, no procedure, nothing to click. Rows are written with SQL. This is deliberate — see [ADR-0003](./adr/0003-allowlist-gated-auth.md).

An allowlist row carries a **role**:

| Role | Can do |
| --- | --- |
| `editor` | create and correct Persons, Quotes, Cards, Sources and Tags |
| `admin` | everything an Editor can do, plus curation (Featured, Home picks, figures on the front page, the methodology page) and archive/restore |

Emails are matched lower-case, so `Owner@Example.com` on the row still matches a sign-in as `owner@example.com`. Write them lower-case anyway.

Apply the migrations (`bun run db:migrate`) before writing any of these rows: the statements below assume the `allowlist` table and Better Auth's own tables exist.

## Seed the first administrator

Run this against the deployed database, for example with `turso db shell <db>`, replacing the address with the one the person will sign in with:

```sql
INSERT INTO allowlist (email, role) VALUES ('owner@example.com', 'admin');
```

That person then signs in at `/sign-in` with Google (or with a one-time code sent to the same address). Their `user` row is created the first time they sign in — no user row exists before that, because a non-allowlisted address is refused before one is made.

## Signing in

Google is the main way in; the one-time code is there for someone without a Google account. Both paths check the same allowlist row, and both resolve to the same `user` row when they use the same address, so audit stamps never split one person into two identities. An address that is not on the allowlist is never mailed a code.

A code is six digits, expires in five minutes, and allows three guesses; after that it is discarded and a new one must be requested. Codes are stored as a digest, not as the digits that were mailed.

## Add an editor

```sql
INSERT INTO allowlist (email, role) VALUES ('writer@example.com', 'editor');
```

## Change someone's role

```sql
UPDATE allowlist SET role = 'admin' WHERE lower(email) = 'writer@example.com';
```

## Remove someone's access

```sql
DELETE FROM allowlist WHERE lower(email) = 'writer@example.com';
```

Do **not** delete their `user` row. `created_by` and `updated_by` on content reference it, so deleting the user would leave every entry they wrote pointing at nothing. Removing the allowlist row is enough: the actor is resolved from the allowlist on every request, so their very next request is refused, and a new sign-in is refused too, so no fresh session is minted.

## Losing the last administrator

There is no privilege escalation in the product, so recovery is the same SQL as above: insert or promote an `admin` row directly in the database.
