import { describe, expect, it } from "vitest";
import {
  ApiError,
  mapFetchError,
  mapHttpError,
  mapParseError,
  mapTimeoutError,
  toApiError,
} from "./apiErrors";

describe("apiErrors", () => {
  it("maps timeout errors with context", () => {
    const error = mapTimeoutError(2500, { method: "GET", url: "/x" });
    expect(error.category).toBe("timeout");
    expect(error.message).toContain("2500");
    expect(error.method).toBe("GET");
    expect(error.url).toBe("/x");
  });

  it("maps fetch and abort errors", () => {
    const abortError = new DOMException("aborted", "AbortError");
    expect(mapFetchError(abortError).message).toBe("Request was aborted.");

    const networkError = mapFetchError(new Error("Network down"));
    expect(networkError.category).toBe("network");
    expect(networkError.message).toBe("Network down");
  });

  it("maps HTTP errors and payload messages", () => {
    expect(mapHttpError(404, null).message).toBe("Requested resource was not found.");
    expect(mapHttpError(500, { message: "Server exploded" }).message).toBe("Server exploded");
    expect(mapHttpError(400, "Bad input").message).toBe("Bad input");
  });

  it("maps parse errors", () => {
    const error = mapParseError(new Error("Invalid JSON"), { operation: "parse" });
    expect(error.category).toBe("parse");
    expect(error.operation).toBe("parse");
  });

  it("converts unknown errors to ApiError", () => {
    const existing = new ApiError({ category: "http", message: "Already mapped", status: 400 });
    expect(toApiError(existing)).toBe(existing);

    const converted = toApiError(new Error("Boom"));
    expect(converted).toBeInstanceOf(ApiError);
    expect(converted.category).toBe("unknown");
    expect(converted.message).toBe("Boom");
  });
});
