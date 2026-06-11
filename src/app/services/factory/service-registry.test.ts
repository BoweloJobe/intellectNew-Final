import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRegistryModule() {
  vi.resetModules();
  return import("./service-registry");
}

describe("service-registry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to mock mode", async () => {
    vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", undefined);
    const module = await loadRegistryModule();
    expect(module.serviceAdapterMode).toBe("mock");
  });

  it("switches to api mode from env", async () => {
    vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "api");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const module = await loadRegistryModule();
    expect(module.serviceAdapterMode).toBe("api");
  });

  it("throws when api mode is enabled without VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "api");
    vi.stubEnv("VITE_API_BASE_URL", undefined);
    await expect(loadRegistryModule()).rejects.toThrow("VITE_API_BASE_URL");
  });

  it("throws when a domain override uses api without VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "mock");
    vi.stubEnv("VITE_AUTH_ADAPTER_MODE", "api");
    vi.stubEnv("VITE_API_BASE_URL", undefined);
    await expect(loadRegistryModule()).rejects.toThrow("VITE_API_BASE_URL");
  });

  describe("per-domain adapter config", () => {
    it("all domains default to mock when no domain env is set", async () => {
      vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", undefined);
      const module = await loadRegistryModule();
      const { domainAdapterConfig } = module;
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

    it("overrides a single domain without affecting others", async () => {
      vi.stubEnv("VITE_SERVICE_ADAPTER_MODE", "mock");
      vi.stubEnv("VITE_AUTH_ADAPTER_MODE", "api");
      vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
      const module = await loadRegistryModule();
      expect(module.domainAdapterConfig.auth).toBe("api");
      expect(module.domainAdapterConfig.admin).toBe("mock");
      expect(module.domainAdapterConfig.courses).toBe("mock");
      expect(module.domainAdapterConfig.lessons).toBe("mock");
    });
  });
});
