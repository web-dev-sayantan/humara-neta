# Allowlist-gated sign-in with two roles, managed in the database

Authentication is Google first with email OTP as fallback, both via Better Auth. Neither may grant access on its own: OTP sign-in and social sign-in both create a user on first use, so **authentication is not authorisation** here. An `allowlist` table of `(email, role)` is checked before a user is created; non-allowlisted emails are refused without an account, without an OTP being sent. Accounts are linked by verified email so one person is one `user` row, keeping `created_by` / `updated_by` meaningful.

Two roles. **Administrator** writes and corrects content, and additionally curates (Featured, Home picks, methodology page) and archives. **Editor** writes and corrects content only. The panel has no allowlist screen at all: roles are changed with SQL by whoever administers the database, and no path in the product can add, promote, demote or remove an administrator.

## Considered Options

- **Open sign-in, role assigned afterwards**: anyone with a Google account becomes a user. Rejected — the panel would be publicly reachable.
- **In-app invite flow**: needs an invite screen, token handling and a second email path, for an action that happens a few times a year.
- **Env-var email list**: no room for the role column, and changing it needs a deploy.
- **Single administrator** (recommended during design, overruled): the requirement was multiple admins with audit stamps.

## Consequences

- Adding or removing a person's access is a database operation, not a product feature. Losing the last administrator means SQL recovery.
- Removing someone from the allowlist **must not delete their `user` row**, or every audit stamp they wrote becomes a dangling reference. Revocation is a flag or a row deletion in `allowlist` only.
- With no privilege escalation available in the product, an administrator account cannot be taken over through the UI — the trade is that it also cannot be handed over through the UI.
- Roles are enforced per mutation, not per screen: hiding a control is not a permission check.
