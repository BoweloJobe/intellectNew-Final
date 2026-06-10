import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../api";
import { httpClient } from "../../../../api/client/httpClient";
import { ApiNotesAdapter } from "../notes.adapter";

vi.mock("../../../../api/client/httpClient", () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockHttpClient = vi.mocked(httpClient);

const backendNote = {
  id: 1,
  title: "Photosynthesis recap",
  content: "Photosynthesis uses light energy to convert carbon dioxide and water into glucose.",
  course: "Advanced Biology",
  tags: ["Biology", "Plants"],
  starred: true,
  createdAt: "2026-06-01T10:00:00.000Z",
  updatedAt: "2026-06-02T10:00:00.000Z",
};

describe("ApiNotesAdapter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists notes from GET /notes and maps the response", async () => {
    mockHttpClient.get.mockResolvedValue({ status: "ok", data: { notes: [backendNote] } });

    const notes = await new ApiNotesAdapter().getNotesLibrary();

    expect(mockHttpClient.get).toHaveBeenCalledWith("/notes");
    expect(notes).toEqual([
      {
        id: 1,
        title: backendNote.title,
        content: backendNote.content,
        course: backendNote.course,
        tags: backendNote.tags,
        starred: true,
        date: "Jun 2, 2026",
      },
    ]);
  });

  it("creates a note with POST /notes", async () => {
    mockHttpClient.post.mockResolvedValue({ status: "ok", data: { note: backendNote } });

    const result = await new ApiNotesAdapter().saveNote({
      title: backendNote.title,
      content: backendNote.content,
      course: backendNote.course,
      tags: backendNote.tags,
      starred: true,
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith("/notes", {
      body: {
        title: backendNote.title,
        content: backendNote.content,
        course: backendNote.course,
        tags: backendNote.tags,
        starred: true,
      },
    });
    expect(result.id).toBe(1);
  });

  it("updates a note with PUT /notes/:id", async () => {
    mockHttpClient.put.mockResolvedValue({ status: "ok", data: { note: backendNote } });

    await new ApiNotesAdapter().saveNote(
      {
        title: backendNote.title,
        content: backendNote.content,
        course: backendNote.course,
        tags: backendNote.tags,
        starred: false,
      },
      1,
    );

    expect(mockHttpClient.put).toHaveBeenCalledWith("/notes/1", {
      body: {
        title: backendNote.title,
        content: backendNote.content,
        course: backendNote.course,
        tags: backendNote.tags,
        starred: false,
      },
    });
  });

  it("deletes a note with DELETE /notes/:id", async () => {
    mockHttpClient.delete.mockResolvedValue(undefined);

    await new ApiNotesAdapter().deleteNote(1);

    expect(mockHttpClient.delete).toHaveBeenCalledWith("/notes/1");
  });

  it("does not swallow API errors", async () => {
    const error = new ApiError({ category: "http", message: "Notes failed", status: 500 });
    mockHttpClient.get.mockRejectedValue(error);

    await expect(new ApiNotesAdapter().getNotesLibrary()).rejects.toMatchObject({
      message: "Notes failed",
      status: 500,
    });
  });
});
