import { describe, expect, it } from "vitest";
import { MockTutorAdapter } from "../tutor.adapter";

describe("MockTutorAdapter", () => {
  it("labels generated tutor replies as demo responses", async () => {
    const reply = await new MockTutorAdapter().generateTutorReply({
      prompt: "Explain cells",
      tags: [{ id: "topic-cells", type: "topic", label: "cells" }],
    });

    expect(reply.content).toContain("Demo AI Tutor response");
  });

  it("labels note explanations as demo output", async () => {
    const explanation = await new MockTutorAdapter().generateNoteExplanation({
      noteTitle: "Cells",
      noteContent: "Cells are the basic units of life.",
      lessonTitle: "Cell Biology",
      courseName: "Biology",
      tags: ["cells"],
    });

    expect(explanation).toContain("Demo AI Tutor explanation");
  });
});
