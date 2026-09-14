import { describe, expect, it } from "vitest";

import { age, escapeHtml, localDateTime, officialUrl } from "../src/format";

describe("format helpers", () => {
  it("escapes untrusted upstream text", () => {
    expect(escapeHtml('<script>"x"</script>')).toBe("&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
  });

  it("formats advisory age", () => {
    expect(age(90)).toBe("1m ago");
    expect(age(7200)).toBe("2h ago");
    expect(age(null)).toBe("Unknown");
  });

  it("formats an authoritative timestamp in the browser locale", () => {
    const expected = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date("2026-08-25T12:00:00Z"));
    expect(localDateTime("2026-08-25T12:00:00Z")).toBe(expected);
    expect(localDateTime("not-a-date")).toBeNull();
    expect(localDateTime(null)).toBeNull();
  });

  it("rejects unsafe link schemes", () => {
    expect(officialUrl("javascript:alert(1)")).toBeNull();
    expect(officialUrl("https://www.nhc.noaa.gov/test")).toContain("https://");
  });
});
