import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfigModule() {
  vi.resetModules();
  return import("./apiConfig");
}

describe("apiConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses safe defaults when env is missing", async () => {
    vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", undefined);
    vi.stubEnv("VITE_API_BASE_URL", undefined);
    vi.stubEnv("VITE_API_TIMEOUT", undefined);

    const { apiConfig, adapterMode, isApiMode } = await loadConfigModule();

    expect(apiConfig.adapterMode).toBe("mock");
    expect(apiConfig.baseUrl).toBe("");
    expect(apiConfig.timeoutMs).toBe(10000);
    expect(adapterMode).toBe("mock");
    expect(isApiMode).toBe(false);
  });

  it("parses and normalizes explicit env values", async () => {
    vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "API");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com/");
    vi.stubEnv("VITE_API_TIMEOUT", "4500");

    const { apiConfig, adapterMode, isApiMode } = await loadConfigModule();

    expect(apiConfig.adapterMode).toBe("api");
    expect(apiConfig.baseUrl).toBe("https://api.example.com");
    expect(apiConfig.timeoutMs).toBe(4500);
    expect(adapterMode).toBe("api");
    expect(isApiMode).toBe(true);
  });

  it("falls back from invalid mode/timeout values", async () => {
    vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "other");
    vi.stubEnv("VITE_API_TIMEOUT", "-1");

    const { apiConfig } = await loadConfigModule();

    expect(apiConfig.adapterMode).toBe("mock");
    expect(apiConfig.timeoutMs).toBe(10000);
  });

  describe("domainAdapterConfig", () => {
    it("all domains default to mock when no domain env is set", async () => {
      vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", undefined);

      const { domainAdapterConfig } = await loadConfigModule();

      expect(domainAdapterConfig.admin).toBe("mock");
      expect(domainAdapterConfig.auth).toBe("mock");
      expect(domainAdapterConfig.courses).toBe("mock");
      expect(domainAdapterConfig.lessons).toBe("mock");
      expect(domainAdapterConfig.quizzes).toBe("mock");
      expect(domainAdapterConfig.progress).toBe("mock");
      expect(domainAdapterConfig.subscription).toBe("mock");
      expect(domainAdapterConfig.notifications).toBe("mock");
      expect(domainAdapterConfig.notes).toBe("mock");
      expect(domainAdapterConfig.dashboard).toBe("mock");
      expect(domainAdapterConfig.community).toBe("mock");
      expect(domainAdapterConfig.tutor).toBe("mock");
    });

    it("all domains inherit global api mode when no domain env is set", async () => {
      vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "api");
      vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");

      const { domainAdapterConfig } = await loadConfigModule();

      expect(domainAdapterConfig.admin).toBe("api");
      expect(domainAdapterConfig.auth).toBe("api");
      expect(domainAdapterConfig.courses).toBe("api");
    });

    it("overrides a single domain without affecting others", async () => {
      vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "mock");
      vi.stubEnv("VITE_AUTH_ADAPTER_MODE", "api");
      vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");

      const { domainAdapterConfig } = await loadConfigModule();

      expect(domainAdapterConfig.auth).toBe("api");
      expect(domainAdapterConfig.admin).toBe("mock");
      expect(domainAdapterConfig.courses).toBe("mock");
      expect(domainAdapterConfig.lessons).toBe("mock");
    });

    it("domain env invalid value falls back to mock", async () => {
      vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "mock");
      vi.stubEnv("VITE_COURSES_ADAPTER_MODE", "invalid");

      const { domainAdapterConfig } = await loadConfigModule();

      expect(domainAdapterConfig.courses).toBe("mock");
    });
  });
});
