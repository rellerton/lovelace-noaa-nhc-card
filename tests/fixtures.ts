import type { PresentationContract } from "../src/types";

export function presentation(): PresentationContract {
  return {
    contract_version: 1,
    integration_version: "0.2.0",
    generated_at: "2026-08-25T10:00:00Z",
    freshness: {
      storm_source_status: "fresh",
      storm_data_age_seconds: 60,
      storm_last_attempt: "2026-08-25T10:00:00Z",
      storm_last_success: "2026-08-25T10:00:00Z",
      source_updated_at: "2026-08-25T09:00:00Z",
      alert_source_status: "fresh",
      alert_last_success: "2026-08-25T10:00:00Z",
    },
    basins: [
      { id: "al", name: "Atlantic", active_count: 0, has_activity: false, nearest_storm_id: null },
      {
        id: "ep",
        name: "Eastern Pacific",
        active_count: 1,
        has_activity: true,
        nearest_storm_id: "ep092026",
      },
    ],
    storms: [
      {
        id: "ep092026",
        basin: "ep",
        name: "Iselle",
        classification: { code: "TS", label: "Tropical Storm", severity: "warning" },
        wind_kt: 60,
        pressure_hpa: 988,
        distance_km: 4000,
        bearing_degrees: 266,
        movement: { direction_degrees: 305, speed_mph: 15 },
        advisory: {
          number: "008",
          issued_at: "2026-08-25T09:00:00Z",
          age_seconds: 3600,
          links: {
            public_advisory: "https://www.nhc.noaa.gov/text/test.shtml",
            forecast_discussion: null,
            forecast_graphics: "https://www.nhc.noaa.gov/graphics_ep4.shtml",
          },
        },
        image: {
          type: "forecast_cone",
          url: "/api/noaa_nhc/v1/storms/ep092026/image?authSig=test",
          cached_at: null,
          stale: false,
        },
      },
    ],
    local_alerts: { state: "clear", count: 0, types: [], alerts: [] },
    semantics: {
      basin_activity_is_local_alert: false,
      proximity_is_local_alert: false,
      local_alert_source: "NWS point-filtered alerts",
    },
  };
}
