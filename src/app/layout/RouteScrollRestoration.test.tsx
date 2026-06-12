import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouteScrollRestoration } from "./RouteScrollRestoration";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockPathname = "/one";
let mockNavigationType: "POP" | "PUSH" | "REPLACE" = "PUSH";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
  useNavigationType: () => mockNavigationType,
}));

describe("RouteScrollRestoration", () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPathname = "/one";
    mockNavigationType = "PUSH";
    scrollToSpy = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollToSpy,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("scrolls to top on normal route navigation", async () => {
    await act(async () => {
      root.render(<RouteScrollRestoration />);
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    scrollToSpy.mockClear();

    await act(async () => {
      mockPathname = "/two";
      root.render(<RouteScrollRestoration />);
    });

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("does not override back/forward scroll restoration", async () => {
    mockNavigationType = "POP";

    await act(async () => {
      root.render(<RouteScrollRestoration />);
    });

    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
