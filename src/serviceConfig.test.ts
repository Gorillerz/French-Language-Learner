import { describe, expect, it } from "vitest";
import { checkCloudUrl } from "./serviceConfig";

describe("cloud URL", () => {
  it("accepts HTTPS", () => {
    expect(checkCloudUrl("https://sync.example.com/api/")).toEqual({
      available: true,
      baseUrl: "https://sync.example.com/api",
    });
  });

  it.each(["http://127.0.0.1:4311", "http://localhost:4311", "http://[::1]:4311"])(
    "accepts %s, which never leaves the machine",
    (url) => {
      expect(checkCloudUrl(url)).toEqual({ available: true, baseUrl: url });
    },
  );

  it.each([
    "http://sync.example.com",
    "http://localhost.example.com",
    "http://127.0.0.1.example.com",
    "ftp://sync.example.com",
  ])("refuses %s", (url) => {
    expect(checkCloudUrl(url)).toEqual({ available: false, reason: "insecure" });
  });

  it("refuses something that is not a URL", () => {
    expect(checkCloudUrl("sync.example.com")).toEqual({ available: false, reason: "insecure" });
  });

  it("reports that no cloud is configured", () => {
    expect(checkCloudUrl(undefined)).toEqual({ available: false, reason: "missing" });
    expect(checkCloudUrl("")).toEqual({ available: false, reason: "missing" });
  });
});
