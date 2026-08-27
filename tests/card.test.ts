import { beforeEach, describe, expect, it, vi } from "vitest";

import { NoaaNhcCard } from "../src/noaa-nhc-card";
import type { HomeAssistant } from "../src/types";
import { presentation } from "./fixtures";

function createCard(responses = [presentation()]): NoaaNhcCard {
  const card = new NoaaNhcCard();
  card.setConfig({ type: "custom:noaa-nhc-card", refresh_seconds: 60 });
  const callWS = vi.fn();
  for (const response of responses) callWS.mockResolvedValueOnce(response);
  card.hass = { callWS } as HomeAssistant;
  document.body.append(card);
  return card;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("NOAA NHC card", () => {
  it("renders every configured basin and dynamic storm without entity IDs", async () => {
    const card = createCard();
    await vi.waitFor(() => expect(card.shadowRoot?.textContent).toContain("Iselle"));
    const text = card.shadowRoot?.textContent ?? "";
    expect(text).toContain("Atlantic");
    expect(text).toContain("Eastern Pacific");
    expect(text).toContain("No active storms in this configured basin");
    expect(text).toContain("2 potential development areas");
    expect(text).toContain("Eastern Tropical Atlantic");
    expect(card.shadowRoot?.querySelector(".outlook img")).not.toBeNull();
    expect(card.shadowRoot?.querySelector<HTMLAnchorElement>(".outlook .image-link")?.href).toBe(
      "https://www.nhc.noaa.gov/gtwo.php?basin=atlc&fdays=7",
    );
    expect(text).toContain("Iselle");
    expect(text).toContain("60 kn");
    expect(card.shadowRoot?.innerHTML).not.toContain("entity_id");
  });

  it("supports an explicit MPH display preference without changing the contract", async () => {
    const card = new NoaaNhcCard();
    card.setConfig({ type: "custom:noaa-nhc-card", wind_speed_unit: "mph" });
    card.hass = { callWS: vi.fn().mockResolvedValue(presentation()) } as HomeAssistant;
    document.body.append(card);
    await vi.waitFor(() => expect(card.shadowRoot?.textContent).toContain("69 mph"));
  });

  it("supports miles while retaining kilometers as the default distance unit", async () => {
    const kilometers = createCard();
    await vi.waitFor(() => expect(kilometers.shadowRoot?.textContent).toContain("4000 km"));

    const miles = new NoaaNhcCard();
    miles.setConfig({ type: "custom:noaa-nhc-card", distance_unit: "miles" });
    miles.hass = { callWS: vi.fn().mockResolvedValue(presentation()) } as HomeAssistant;
    document.body.append(miles);
    await vi.waitFor(() => expect(miles.shadowRoot?.textContent).toContain("2485 mi"));
    expect(miles.shadowRoot?.textContent).not.toContain("4000 km");
  });

  it("shows a requested basin outlook image when there are zero potential areas", async () => {
    const data = presentation();
    const atlantic = data.basins[0];
    if (!atlantic) throw new Error("Missing Atlantic fixture");
    data.basins = [
      {
        ...atlantic,
        outlook: {
          ...atlantic.outlook,
          area_count: 0,
          has_potential: false,
          areas: [],
        },
      },
    ];
    const card = createCard([data]);
    await vi.waitFor(() => expect(card.shadowRoot?.textContent).toContain("0 potential"));
    expect(card.shadowRoot?.querySelector(".outlook img")).not.toBeNull();
  });

  it("filters presentation to a card-specific basin subset", async () => {
    const card = new NoaaNhcCard();
    card.setConfig({ type: "custom:noaa-nhc-card", basins: ["al"] });
    card.hass = { callWS: vi.fn().mockResolvedValue(presentation()) } as HomeAssistant;
    document.body.append(card);
    await vi.waitFor(() => expect(card.shadowRoot?.textContent).toContain("Atlantic"));
    const text = card.shadowRoot?.textContent ?? "";
    expect(text).toContain("2 potential development areas");
    expect(text).not.toContain("Eastern Pacific");
    expect(text).not.toContain("Iselle");
  });

  it("defaults storm images below text and supports a top override", async () => {
    const bottom = createCard();
    await vi.waitFor(() => expect(bottom.shadowRoot?.querySelector(".storm")).not.toBeNull());
    expect(bottom.shadowRoot?.querySelector(".storm")?.firstElementChild?.className).toBe(
      "storm-main",
    );

    const top = new NoaaNhcCard();
    top.setConfig({ type: "custom:noaa-nhc-card", storm_image_position: "top" });
    top.hass = { callWS: vi.fn().mockResolvedValue(presentation()) } as HomeAssistant;
    document.body.append(top);
    await vi.waitFor(() => expect(top.shadowRoot?.querySelector(".storm")).not.toBeNull());
    expect(top.shadowRoot?.querySelector(".storm")?.firstElementChild?.className).toBe("image");
    expect(top.shadowRoot?.querySelector<HTMLAnchorElement>(".storm .image-link")?.href).toBe(
      "https://www.nhc.noaa.gov/graphics_ep4.shtml",
    );
  });

  it("keeps an image visible but non-clickable without a safe official parent page", async () => {
    const data = presentation();
    const storm = data.storms[0];
    if (!storm) throw new Error("Missing storm fixture");
    storm.advisory.links.forecast_graphics = "javascript:alert(1)";
    const card = createCard([data]);
    await vi.waitFor(() => expect(card.shadowRoot?.querySelector(".storm img")).not.toBeNull());
    expect(card.shadowRoot?.querySelector(".storm .image-link")).toBeNull();
  });

  it("rejects invalid basin, image-position, and distance-unit configuration", () => {
    const card = new NoaaNhcCard();
    expect(() => card.setConfig({ type: "custom:noaa-nhc-card", basins: [] })).toThrow(
      "basins must be a non-empty list",
    );
    expect(() =>
      card.setConfig({
        type: "custom:noaa-nhc-card",
        storm_image_position: "side" as "top",
      }),
    ).toThrow("storm_image_position must be top or bottom");
    expect(() =>
      card.setConfig({
        type: "custom:noaa-nhc-card",
        distance_unit: "nautical_miles" as "km",
      }),
    ).toThrow("distance_unit must be km or miles");
  });

  it("adds and removes storms solely from refreshed contract data", async () => {
    const first = presentation();
    const second = presentation();
    second.storms = [];
    const easternPacific = second.basins[1];
    if (!easternPacific) throw new Error("Missing Eastern Pacific fixture");
    second.basins[1] = { ...easternPacific, active_count: 0, has_activity: false };
    const card = createCard([first, second]);
    await vi.waitFor(() => expect(card.shadowRoot?.textContent).toContain("Iselle"));
    await card.refresh();
    expect(card.shadowRoot?.textContent).not.toContain("Iselle");
    expect(card.shadowRoot?.textContent).toContain("No active storms");
  });

  it("keeps storms visible when optional images and links are missing", async () => {
    const data = presentation();
    const storm = data.storms[0];
    if (!storm) throw new Error("Missing storm fixture");
    storm.image = null;
    storm.advisory.links = {
      public_advisory: null,
      forecast_discussion: null,
      forecast_graphics: null,
    };
    const card = createCard([data]);
    await vi.waitFor(() => expect(card.shadowRoot?.textContent).toContain("Iselle"));
    expect(card.shadowRoot?.textContent).toContain("Iselle");
    expect(card.shadowRoot?.querySelector(".storm img")).toBeNull();
  });

  it("distinguishes stale storm data and an active local alert", async () => {
    const data = presentation();
    data.freshness.storm_source_status = "stale";
    data.local_alerts = {
      state: "active",
      count: 1,
      types: ["Hurricane Warning"],
      alerts: [
        {
          identifier: "urn:test",
          event: "Hurricane Warning",
          severity: "Extreme",
          effective: "2026-08-25T09:00:00Z",
          expires: "2026-08-25T15:00:00Z",
          url: "https://alerts.weather.gov/test",
          affected_area: "Synthetic test area",
        },
      ],
    };
    const card = createCard([data]);
    await vi.waitFor(() => expect(card.shadowRoot?.textContent).toContain("Hurricane Warning"));
    const text = card.shadowRoot?.textContent ?? "";
    expect(text).toContain("Storm data is stale");
    expect(text).toContain("Official tropical watch/warning affects");
    expect(text).toContain("Hurricane Warning");
    expect(text).toContain("Basin activity and storm proximity do not mean");
  });

  it("rejects an unsupported presentation version", async () => {
    const data = presentation();
    data.contract_version = 2;
    const card = createCard([data]);
    await vi.waitFor(() =>
      expect(card.shadowRoot?.textContent).toContain("Unsupported presentation contract 2"),
    );
  });
});
