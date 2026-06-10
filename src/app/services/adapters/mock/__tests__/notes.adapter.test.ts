import { describe, expect, it } from "vitest";
import { MockNotesAdapter } from "../notes.adapter";

describe("MockNotesAdapter", () => {
  it("searches and filters notes in memory", async () => {
    const result = await new MockNotesAdapter().listNotes({
      search: "DNA",
      tag: "Biology",
      starred: true,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("DNA Replication Process");
    expect(result).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("paginates notes in memory", async () => {
    const result = await new MockNotesAdapter().listNotes({ page: 2, pageSize: 2 });

    expect(result.items.map((note) => note.id)).toEqual([3, 4]);
    expect(result).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 4,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});
