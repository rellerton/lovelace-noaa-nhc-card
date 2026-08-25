import { describe, expect, it } from "vitest";

import { age, escapeHtml, officialUrl } from "../src/format";

describe("format helpers", () => {
  it("escapes untrusted upstream text", () => {
    expect(escapeHtml('<script>"x"</script>')).toBe("&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  });

  it("formats advisory age", () => {
    expect(age(90)).toBe("1m ago");
    expect(age(7200)).toBe("2h ago");
    expect(age(null)).toBe("Unknown");
  });

  it("rejects unsafe link schemes", () => {
    expect(officialUrl("javascript:alert(1)")).toBeNull();
    expect(officialUrl("https://www.nhc.noaa.gov/test")).toContain("https://");
  });
});
