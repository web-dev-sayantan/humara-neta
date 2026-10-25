import * as schema from "@humara-neta/db/schema/index";
import { describe, expect, it } from "vitest";

import { createTestHarness } from "./harness";
import type { TestHarness } from "./harness";

const ADA = { name: "Ada Lovelace", email: "ada@example.com" };
const GRACE = { name: "Grace Hopper", email: "grace@example.com" };

/** A harness holding one signed-in editor, which is how nearly every test starts. */
async function editorAt(harness: TestHarness, who = ADA) {
  const userId = await harness.addUser(who);

  return { userId, client: harness.clientFor({ userId, role: "editor" }) };
}

describe("creating a Person", () => {
  it("stores the name and short bio an editor typed, under a slug derived from the name", async () => {
    const harness = await createTestHarness();
    const { userId, client } = await editorAt(harness);

    const created = await client.person.create({
      name: "Bhim Rao Ambedkar",
      bio: "Jurist and the chief architect of the Indian Constitution.",
    });

    expect(created).toMatchObject({
      name: "Bhim Rao Ambedkar",
      slug: "bhim-rao-ambedkar",
      bio: "Jurist and the chief architect of the Indian Constitution.",
    });

    const [row] = await harness.db.select().from(schema.person);
    expect(row).toMatchObject({
      id: created.id,
      slug: "bhim-rao-ambedkar",
      createdBy: userId,
      updatedBy: userId,
    });
  });

  it("gives a second Person of the same name their own slug rather than a clash", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);

    const first = await client.person.create({ name: "Arundhati Roy" });
    const second = await client.person.create({ name: "Arundhati Roy" });

    expect([first.slug, second.slug]).toEqual([
      "arundhati-roy",
      "arundhati-roy-2",
    ]);
    expect(second.id).not.toBe(first.id);
  });

  it("folds accents out of the slug and turns the periods of initials into hyphens", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);

    const initials = await client.person.create({
      name: "A. P. J. Abdul Kalam",
    });
    const accents = await client.person.create({ name: "Amílcar Cabral" });

    expect(initials.slug).toBe("a-p-j-abdul-kalam");
    expect(accents.slug).toBe("amilcar-cabral");
  });
});

describe("editing a Person", () => {
  it("changes the name and bio in place, leaving the slug where it was first set", async () => {
    const harness = await createTestHarness();
    const { userId: firstEditor, client } = await editorAt(harness);
    const { userId: secondEditor, client: secondClient } = await editorAt(
      harness,
      GRACE
    );
    const created = await client.person.create({
      name: "Arundhati Roy",
      bio: "Novelist.",
    });

    const revised = await secondClient.person.update({
      id: created.id,
      name: "Suzanna Arundhati Roy",
      bio: "Novelist and activist.",
      slug: created.slug,
    });

    expect(revised).toMatchObject({
      id: created.id,
      name: "Suzanna Arundhati Roy",
      bio: "Novelist and activist.",
      slug: "arundhati-roy",
    });

    const [row] = await harness.db.select().from(schema.person);
    expect(row).toMatchObject({
      slug: "arundhati-roy",
      createdBy: firstEditor,
      updatedBy: secondEditor,
    });
  });

  it("refuses to move a slug that links already point at, and explains why", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const created = await client.person.create({
      name: "Bhim Rao Ambedkar",
      bio: "Jurist.",
    });

    await expect(
      client.person.update({
        id: created.id,
        name: "Bhim Rao Ambedkar",
        bio: "Jurist.",
        slug: "br-ambedkar",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/already circulating/u),
    });

    const [row] = await harness.db.select().from(schema.person);
    expect(row?.slug).toBe("bhim-rao-ambedkar");
  });

  it("clears a bio that an editor empties, and refuses an update to a Person who is not there", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    const created = await client.person.create({
      name: "Bhim Rao Ambedkar",
      bio: "Jurist.",
    });

    const revised = await client.person.update({
      id: created.id,
      name: created.name,
      bio: "  ",
    });

    expect(revised.bio).toBeNull();

    await expect(
      client.person.update({ id: "person_missing", name: "Nobody" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("reading Persons in public", () => {
  it("lists every Person ordered by name, whatever case the name is typed in", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    await client.person.create({ name: "Zora Neale Hurston" });
    await client.person.create({ name: "bell hooks" });
    await client.person.create({ name: "Bhim Rao Ambedkar" });

    const listed = await harness.clientFor(null).person.list();

    expect(listed.map(({ name }) => name)).toEqual([
      "bell hooks",
      "Bhim Rao Ambedkar",
      "Zora Neale Hurston",
    ]);
  });

  it("leaves out a Person who has been archived, on the list and on their own slug", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    await client.person.create({ name: "Zora Neale Hurston", bio: "Writer." });
    // Archiving gets its own procedure in #10; here the existing row is stamped
    // the only way a test can, and the reads must already hide it.
    await harness.db.update(schema.person).set({ archivedAt: new Date() });

    expect(await harness.clientFor(null).person.list()).toEqual([]);
    // #10 turns a withdrawn page into a 410; until then it is simply not served.
    await expect(
      harness.clientFor(null).person.bySlug({ slug: "zora-neale-hurston" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await client.person.create({ name: "Bhim Rao Ambedkar" });

    const listed = await harness.clientFor(null).person.list();
    expect(listed.map(({ name }) => name)).toEqual(["Bhim Rao Ambedkar"]);
  });

  it("serves a Person's name and bio to a reader who is not signed in", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);
    await client.person.create({
      name: "Bhim Rao Ambedkar",
      bio: "Jurist and the chief architect of the Indian Constitution.",
    });

    const page = await harness
      .clientFor(null)
      .person.bySlug({ slug: "bhim-rao-ambedkar" });

    expect(page).toMatchObject({
      name: "Bhim Rao Ambedkar",
      slug: "bhim-rao-ambedkar",
      bio: "Jurist and the chief architect of the Indian Constitution.",
    });
  });

  it("returns not found for a slug no Person lives at", async () => {
    const harness = await createTestHarness();

    await expect(
      harness.clientFor(null).person.bySlug({ slug: "nobody-at-all" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("who may write a Person", () => {
  it("refuses to create or edit one without a signed-in editor", async () => {
    const harness = await createTestHarness();
    const anonymous = harness.clientFor(null);

    await expect(
      anonymous.person.create({ name: "Bhim Rao Ambedkar" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      anonymous.person.update({ id: "person_missing", name: "Nobody" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("what an editor may not save", () => {
  it("refuses a Person with no name, and writes nothing", async () => {
    const harness = await createTestHarness();
    const { client } = await editorAt(harness);

    await expect(client.person.create({ name: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    expect(await harness.db.select().from(schema.person)).toHaveLength(0);
  });
});
