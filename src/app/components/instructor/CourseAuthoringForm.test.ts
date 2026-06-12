import { describe, expect, it } from "vitest";
import { resolveCoursePrice, resolveLessonEstimatedCompletion } from "./CourseAuthoringForm";

describe("resolveCoursePrice", () => {
  it("submits free courses with zero price", () => {
    expect(resolveCoursePrice(true, "")).toEqual({ ok: true, price: 0 });
  });

  it("rejects paid courses with a blank price", () => {
    expect(resolveCoursePrice(false, "")).toEqual({
      ok: false,
      message: "Paid courses need a price greater than 0",
    });
  });

  it("rejects paid courses with zero price", () => {
    expect(resolveCoursePrice(false, "0")).toEqual({
      ok: false,
      message: "Paid courses need a price greater than 0",
    });
  });

  it("rejects paid courses with negative price", () => {
    expect(resolveCoursePrice(false, "-1")).toEqual({
      ok: false,
      message: "Paid courses need a price greater than 0",
    });
  });

  it("rejects paid courses with non-numeric price", () => {
    expect(resolveCoursePrice(false, "not a number")).toEqual({
      ok: false,
      message: "Paid courses need a price greater than 0",
    });
  });

  it("submits paid courses with a valid positive price", () => {
    expect(resolveCoursePrice(false, "49.99")).toEqual({ ok: true, price: 49.99 });
  });
});

describe("resolveLessonEstimatedCompletion", () => {
  it("uses a compatibility default when the hidden lesson estimate is blank or invalid", () => {
    expect(resolveLessonEstimatedCompletion(Number(""))).toBe(20);
    expect(resolveLessonEstimatedCompletion(0)).toBe(20);
    expect(resolveLessonEstimatedCompletion(Number.NaN)).toBe(20);
  });

  it("keeps valid existing lesson estimates for backend compatibility", () => {
    expect(resolveLessonEstimatedCompletion(35)).toBe(35);
  });
});
