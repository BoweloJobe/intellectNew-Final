import { describe, expect, it } from "vitest";
import { getAsyncErrorMessage } from "./async-errors";
import { ApiError } from "../api";

describe("async-errors", () => {
  it("returns message from mapped API errors", () => {
    const error = new ApiError({ category: "http", message: "Request failed", status: 400 });
    expect(getAsyncErrorMessage(error)).toBe("Request failed");
  });

  it("uses fallback for unknown empty/default errors", () => {
    expect(getAsyncErrorMessage(new Error(""), "Fallback")).toBe("Fallback");
    expect(getAsyncErrorMessage(null, "Fallback")).toBe("Fallback");
  });

  it("uses custom fallback when needed", () => {
    expect(getAsyncErrorMessage(undefined, "Custom fallback")).toBe("Custom fallback");
  });
});
