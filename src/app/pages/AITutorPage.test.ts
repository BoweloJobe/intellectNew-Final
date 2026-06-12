import { describe, expect, it } from "vitest";
import { ApiError } from "../api";
import { getTutorSubmitErrorMessage } from "./AITutorPage";

describe("getTutorSubmitErrorMessage", () => {
  it("shows a clear unavailable message for unconfigured production AI", () => {
    expect(getTutorSubmitErrorMessage(new ApiError({
      category: "http",
      status: 503,
      message: "AI Tutor is unavailable because the production AI backend is not configured.",
    }))).toBe("AI Tutor is unavailable because the production AI backend is not configured.");
  });
});
