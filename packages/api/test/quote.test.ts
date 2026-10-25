import * as schema from "@humara-neta/db/schema/index";
import { describe, expect, it } from "vitest";

import { createTestHarness } from "./harness";
import type { TestHarness } from "./harness";

const ADA = { name: "Ada Lovelace", email: "ada@example.com" };
const GRACE = { name: "Grace Hopper", email: "grace@example.com" };

const CARD_TEXT =
  "The measure of a country is how it treats its weakest citizens.";

type EditorClient = ReturnType<TestHarness["clientFor"]>;

/** A harness holding one signed-in editor, which is how nearly every test starts. */
async function editorAt(harness: TestHarness, who = ADA) {
  const userId = await harness.addUser(who);

  return { userId, client: harness.clientFor({ userId, role: "editor" }) };
}

/** A Person to hang Quotes off, created the way an editor would. */
async function aPerson(client: EditorClient, name = "Bhim Rao Ambedkar") {
  return client.person.create({ name });
}

describe("creating a Quote", () => {
  it("stores the Card, the Editorial note, the Date and the Place under a slug taken from the first Card", async () => {
    const harness = await createTestHarness();
    const { userId, client } = await editorAt(harness);
    const person = await aPerson(client);

    const created = await client.quote.create({
      personId: person.id,
      cards: [CARD_TEXT],
      editorialNote: "Speaking in the Constituent Assembly.",
      date: "1949-11-25",
      place: "New Delhi",
    });

    expect(created).toMatchObject({
      slug: "the-measure-of-a-country-is-how-it-treats-its-weakest",
      editorialNote: "Speaking in the Constituent Assembly.",
      date: "1949-11-25",
      place: "New Delhi",
      cards: [{ position: 1, text: CARD_TEXT }],
    });

    const [quoteRow] = await harness.db.select().from(schema.quote);
    expect(quoteRow).toMatchObject({
      id: created.id,
      personId: person.id,
      createdBy: userId,
      updatedBy: userId,
    });

    const cardRows = await harness.db.select().from(schema.card);
    expect(cardRows).toHaveLength(1);
    expect(cardRows[0]).toMatchObject({
      quoteId: created.id,
      position: 1,
      text: CARD_TEXT,
    });
  });

  it("leaves the Date and the Place out when the editor knows neither", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);

    const created = await client.quote.create({
      personId: person.id,
      cards: [CARD_TEXT],
      editorialNote: "Recorded without a known day or place.",
    });

    expect(created.date).toBeNull();
    expect(created.place).toBeNull();
  });

  it("keeps a Date without a Place, and a Place without a Date", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);

    const withDay = await client.quote.create({
      personId: person.id,
      cards: ["A day, but no place."],
      editorialNote: "Context.",
      date: "1949-11-25",
      place: "   ",
    });
    const withPlace = await client.quote.create({
      personId: person.id,
      cards: ["A place, but no day."],
      editorialNote: "Context.",
      date: "",
      place: "Kolkata",
    });

    expect([withDay.date, withDay.place]).toEqual(["1949-11-25", null]);
    expect([withPlace.date, withPlace.place]).toEqual([null, "Kolkata"]);
  });

  it("accepts a Card longer than the warning length, because a long quote is never cut", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);
    const longText = "word ".repeat(80).trim();

    const created = await client.quote.create({
      personId: person.id,
      cards: [longText],
      editorialNote: "Context.",
    });

    expect(created.cards[0]?.text).toBe(longText);
  });

  it("stamps every Card with its Quote's audit stamps", async () => {
    const harness = await createTestHarness();
    const { userId, client } = await editorAt(harness);
    const person = await aPerson(client);

    const created = await client.quote.create({
      personId: person.id,
      cards: ["First Card.", "Second Card."],
      editorialNote: "Context.",
    });

    expect(created.cards).toHaveLength(2);
    for (const card of created.cards) {
      expect(card).toMatchObject({ createdBy: userId, updatedBy: userId });
    }
  });

  it("numbers a slug already used under the same Person, and hands the plain slug to another Person", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const first = await client.person.create({ name: "Bhim Rao Ambedkar" });
    const second = await client.person.create({ name: "Arundhati Roy" });
    const base = "the-measure-of-a-country-is-how-it-treats-its-weakest";

    const one = await client.quote.create({
      personId: first.id,
      cards: [CARD_TEXT],
      editorialNote: "Context.",
    });
    const two = await client.quote.create({
      personId: first.id,
      cards: [CARD_TEXT],
      editorialNote: "Context, again.",
    });
    const elsewhere = await client.quote.create({
      personId: second.id,
      cards: [CARD_TEXT],
      editorialNote: "Context, elsewhere.",
    });

    expect([one.slug, two.slug, elsewhere.slug]).toEqual([
      base,
      `${base}-2`,
      base,
    ]);
  });
});

describe("editing a Quote", () => {
  it("rewrites the Cards, note, Date and Place, keeps the slug, and moves the stamps to the editor who saved", async () => {
    const harness = await createTestHarness();
    const { userId: firstEditor, client } = await editorAt(harness);
    const { userId: secondEditor, client: secondClient } = await editorAt(
      harness,
      GRACE
    );
    const person = await aPerson(client);
    const created = await client.quote.create({
      personId: person.id,
      cards: [CARD_TEXT],
      editorialNote: "Context.",
      date: "1949-11-25",
      place: "New Delhi",
    });

    const revised = await secondClient.quote.update({
      id: created.id,
      personId: person.id,
      slug: created.slug,
      cards: ["A first Card.", "A second Card."],
      editorialNote: "Corrected context.",
      date: "1950-01-26",
      place: "Kolkata",
    });

    expect(revised).toMatchObject({
      id: created.id,
      slug: created.slug,
      editorialNote: "Corrected context.",
      date: "1950-01-26",
      place: "Kolkata",
      cards: [
        { position: 1, text: "A first Card." },
        { position: 2, text: "A second Card." },
      ],
    });

    // The Cards inherit the Quote's stamps: the editor who created the Quote
    // still owns it, and the editor who saved last is who the Cards point at.
    for (const card of revised.cards) {
      expect(card).toMatchObject({
        createdBy: firstEditor,
        updatedBy: secondEditor,
      });
    }

    const [quoteRow] = await harness.db.select().from(schema.quote);
    expect(quoteRow).toMatchObject({
      slug: created.slug,
      createdBy: firstEditor,
      updatedBy: secondEditor,
    });

    const cardRows = await harness.db.select().from(schema.card);
    expect(cardRows).toHaveLength(2);
  });

  it("removes a Card the editor deleted rather than leaving it behind", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);
    const created = await client.quote.create({
      personId: person.id,
      cards: ["Kept.", "Dropped."],
      editorialNote: "Context.",
    });

    await client.quote.update({
      id: created.id,
      personId: person.id,
      cards: ["Kept."],
      editorialNote: "Context.",
    });

    const cardRows = await harness.db.select().from(schema.card);
    expect(cardRows.map(({ text }) => text)).toEqual(["Kept."]);
  });

  it("refuses to move a slug that links already point at, and explains why", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);
    const created = await client.quote.create({
      personId: person.id,
      cards: [CARD_TEXT],
      editorialNote: "Context.",
    });

    await expect(
      client.quote.update({
        id: created.id,
        personId: person.id,
        slug: "a-shorter-address",
        cards: [CARD_TEXT],
        editorialNote: "Context.",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/already circulating/u),
    });

    const [quoteRow] = await harness.db.select().from(schema.quote);
    expect(quoteRow?.slug).toBe(created.slug);
  });

  it("refuses to hand a Quote to another Person, because its permalink would move with it", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const owner = await client.person.create({ name: "Bhim Rao Ambedkar" });
    const other = await client.person.create({ name: "Arundhati Roy" });
    const created = await client.quote.create({
      personId: owner.id,
      cards: [CARD_TEXT],
      editorialNote: "Context.",
    });

    await expect(
      client.quote.update({
        id: created.id,
        personId: other.id,
        cards: [CARD_TEXT],
        editorialNote: "Context.",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/stays with the Person/u),
    });

    const [quoteRow] = await harness.db.select().from(schema.quote);
    expect(quoteRow?.personId).toBe(owner.id);
  });

  it("refuses an update to a Quote who is not there", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);

    await expect(
      client.quote.update({
        id: "quote_missing",
        personId: person.id,
        cards: [CARD_TEXT],
        editorialNote: "Context.",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("reading a Quote in public", () => {
  it("serves the Card text and the Editorial note to a reader who is not signed in", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await client.person.create({
      name: "Bhim Rao Ambedkar",
      bio: "Jurist.",
    });
    const created = await client.quote.create({
      personId: person.id,
      cards: [CARD_TEXT],
      editorialNote: "Speaking in the Constituent Assembly.",
      date: "1949-11-25",
      place: "New Delhi",
    });

    const page = await harness.clientFor(null).quote.bySlug({
      personSlug: person.slug,
      quoteSlug: created.slug,
    });

    expect(page).toMatchObject({
      slug: created.slug,
      editorialNote: "Speaking in the Constituent Assembly.",
      date: "1949-11-25",
      place: "New Delhi",
      cards: [{ position: 1, text: CARD_TEXT }],
      person: { name: "Bhim Rao Ambedkar", slug: person.slug },
    });
  });

  it("returns not found for a Quote slug no one lives at, and for a Quote asked for under the wrong Person", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const owner = await client.person.create({ name: "Bhim Rao Ambedkar" });
    const other = await client.person.create({ name: "Arundhati Roy" });
    const created = await client.quote.create({
      personId: owner.id,
      cards: [CARD_TEXT],
      editorialNote: "Context.",
    });
    const anonymous = harness.clientFor(null);

    await expect(
      anonymous.quote.bySlug({
        personSlug: owner.slug,
        quoteSlug: "nobody-at-all",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      anonymous.quote.bySlug({
        personSlug: other.slug,
        quoteSlug: created.slug,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("the admin list of Quotes", () => {
  it("lists every Quote under its own Person, and none of another Person's", async () => {
    const harness = await createTestHarness();
    const { userId: firstEditor, client } = await editorAt(harness);
    const { userId: secondEditor, client: secondClient } = await editorAt(
      harness,
      GRACE
    );
    const owner = await client.person.create({ name: "Bhim Rao Ambedkar" });
    const other = await client.person.create({ name: "Arundhati Roy" });
    await client.quote.create({
      personId: owner.id,
      cards: ["Older words."],
      editorialNote: "Context.",
    });
    const newer = await client.quote.create({
      personId: owner.id,
      cards: ["Newer words."],
      editorialNote: "Context.",
    });
    await client.quote.create({
      personId: other.id,
      cards: ["Someone else's words."],
      editorialNote: "Context.",
    });
    await secondClient.quote.update({
      id: newer.id,
      personId: owner.id,
      cards: ["Newer words."],
      editorialNote: "Context, corrected.",
    });

    const listed = await client.quote.listForPerson({ personId: owner.id });

    expect(listed).toHaveLength(2);
    expect(listed.map(({ editorialNote }) => editorialNote)).toEqual(
      expect.arrayContaining(["Context.", "Context, corrected."])
    );
    expect(listed.find(({ id }) => id === newer.id)).toMatchObject({
      createdBy: firstEditor,
      updatedBy: secondEditor,
      updatedByName: "Grace Hopper",
      cards: [{ text: "Newer words." }],
    });
  });
});

describe("who may write a Quote", () => {
  it("refuses to create, edit or list one without a signed-in editor", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);
    const anonymous = harness.clientFor(null);

    await expect(
      anonymous.quote.create({
        personId: person.id,
        cards: [CARD_TEXT],
        editorialNote: "Context.",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(
      anonymous.quote.update({
        id: "quote_missing",
        personId: person.id,
        cards: [CARD_TEXT],
        editorialNote: "Context.",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    await expect(
      anonymous.quote.listForPerson({ personId: person.id })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("what an editor may not save", () => {
  it("refuses a Quote with no Cards at all, and writes nothing", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);

    await expect(
      client.quote.create({
        personId: person.id,
        cards: [],
        editorialNote: "Context.",
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/at least one Card/u),
    });

    expect(await harness.db.select().from(schema.quote)).toHaveLength(0);
  });

  it("refuses an empty Card and an empty Editorial note, in words the editor can act on", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);
    const draft = {
      personId: person.id,
      cards: [CARD_TEXT],
      editorialNote: "Context.",
    };

    await expect(
      client.quote.create({ ...draft, cards: ["   "] })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/Card cannot be empty/u),
    });

    await expect(
      client.quote.create({ ...draft, editorialNote: "  " })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/Editorial note is needed/u),
    });

    expect(await harness.db.select().from(schema.quote)).toHaveLength(0);
  });

  it("refuses a Date in the future, and a day that is not on the calendar", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const person = await aPerson(client);
    const draft = {
      personId: person.id,
      cards: [CARD_TEXT],
      editorialNote: "Context.",
    };

    await expect(
      client.quote.create({ ...draft, date: "2999-01-01" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/future/u),
    });

    await expect(
      client.quote.create({ ...draft, date: "2026-02-31" })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/calendar/u),
    });

    expect(await harness.db.select().from(schema.quote)).toHaveLength(0);
  });

  it("refuses a Quote under a Person who does not exist", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);

    await expect(
      client.quote.create({
        personId: "person_missing",
        cards: [CARD_TEXT],
        editorialNote: "Context.",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(await harness.db.select().from(schema.quote)).toHaveLength(0);
  });
});
