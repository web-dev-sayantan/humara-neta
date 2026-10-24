# humara-neta

Verified quotes from public figures, published as shareable image cards.

## Language

### Content

**Person**:
A public figure whose quotes the site publishes; each Person has their own route.
_Avoid_: author, speaker, figure, subject

**Quote**:
A short passage attributed to a Person, entered only after an Administrator has checked it against a Source. Always typed in English, transliterated where the words were originally spoken in another language.
_Avoid_: saying, excerpt, clip, post

**Source**:
An external link to where a Quote's words appear, shown alongside the Quote but never inside a Card. A Quote may have more than one.
_Avoid_: reference, citation, link, citation URL

**Editorial note**:
The Administrator-written context that accompanies a Quote, shown outside the Card image.
_Avoid_: caption, description, annotation, commentary

**Card**:
One image carrying a Quote's text plus its optional Date and Place. A Quote is published as one or more Cards.
_Avoid_: image, poster, graphic, slide

**Carousel**:
The full set of Cards belonging to one Quote, arranged in reading order. A Quote that fits one Card is a Carousel of one.
_Avoid_: thread, gallery, album, swipe

**Featured**:
A Quote an Administrator has promoted into the top section of its Person's page.
_Avoid_: recommended, pinned, highlighted, editor's pick

**Home pick**:
A Quote marked to appear in the front page's editorial section.
_Avoid_: featured, pinned, promoted

**Archived**:
Removed from the public site while the record is kept, so a permalink stops resolving without the content being lost. Archiving is reversible; it is what "delete" means in this product.
_Avoid_: deleted, removed, hidden, draft

## People

**Administrator**:
An allowlisted account role for someone who writes and corrects content and also curates it: they set Featured, Home picks and the methodology page, and they archive content. Signing in does not make someone an Administrator: only allowlisted email addresses may sign in.
_Avoid_: admin user, staff, moderator, superuser

**Editor**:
An allowlisted account role for someone who writes and corrects content. Editors create and update Quotes, Persons and Cards, but cannot archive anything or change what is curated.
_Avoid_: writer, contributor, author

**Allowlist**:
The set of email addresses permitted to sign in, each carrying a role. It is edited directly in the database and is not visible anywhere in the application.
_Avoid_: users, members, team, ACL

### Metadata

**Date**:
The calendar day a Quote was made, e.g. 20 March 2026. Optional, and never more precise than a day.
_Avoid_: timestamp, publishedAt, createdAt

**Place**:
Where a Quote was made, written as freeform text (e.g. Kolkata, or Esplanade, Kolkata). Optional.
_Avoid_: venue, location, address, coordinates

**Verification**:
The editor's manual check that a Quote's text matches its Source. It is a human act rather than a stored state: every Quote in the database has already been verified, and the application neither tracks nor enforces it.
_Avoid_: moderation, approval, review state, published
