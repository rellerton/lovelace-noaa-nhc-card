export interface HomeAssistant {
  callWS<T>(message: Record<string, unknown>): Promise<T>;
}

export interface CardConfig {
  type: string;
  title?: string;
  basins?: Array<"al" | "ep" | "cp">;
  show_images?: boolean;
  show_local_alerts?: boolean;
  show_outlook_images?: boolean;
  storm_image_position?: "top" | "bottom";
  wind_speed_unit?: "knots" | "mph";
  refresh_seconds?: number;
}

export type SourceStatus = "fresh" | "stale" | "unavailable";

export interface BasinPresentation {
  id: string;
  name: string;
  active_count: number;
  has_activity: boolean;
  nearest_storm_id: string | null;
  outlook: {
    source_status: SourceStatus;
    area_count: number;
    has_potential: boolean;
    issued_at: string | null;
    official_url: string | null;
    image: {
      url: string;
      cached_at: string | null;
      stale: boolean;
    } | null;
    areas: Array<{
      id: string;
      probability_7d: number | null;
      risk_level: string | null;
      location: string | null;
    }>;
  };
}

export interface StormPresentation {
  id: string;
  basin: string;
  name: string;
  classification: {
    code: string;
    label: string;
    severity: "danger" | "warning" | "watch" | "neutral";
  };
  wind_kt: number | null;
  pressure_hpa: number | null;
  distance_km: number | null;
  bearing_degrees: number | null;
  movement: {
    direction_degrees: number | null;
    speed_mph: number | null;
  };
  advisory: {
    number: string | null;
    issued_at: string | null;
    age_seconds: number | null;
    links: {
      public_advisory: string | null;
      forecast_discussion: string | null;
      forecast_graphics: string | null;
    };
  };
  image: {
    type: string;
    url: string;
    cached_at: string | null;
    stale: boolean;
  } | null;
}

export interface LocalAlert {
  identifier: string;
  event: string;
  severity: string | null;
  effective: string | null;
  expires: string | null;
  url: string | null;
  affected_area: string | null;
}

export interface PresentationContract {
  contract_version: number;
  integration_version: string;
  generated_at: string;
  freshness: {
    storm_source_status: SourceStatus;
    storm_data_age_seconds: number | null;
    storm_last_attempt: string | null;
    storm_last_success: string | null;
    source_updated_at: string | null;
    alert_source_status: SourceStatus;
    alert_last_success: string | null;
  };
  basins: BasinPresentation[];
  storms: StormPresentation[];
  local_alerts: {
    state: "active" | "clear" | "stale" | "unavailable";
    count: number;
    types: string[];
    alerts: LocalAlert[];
  };
  semantics: {
    basin_activity_is_local_alert: false;
    proximity_is_local_alert: false;
    potential_area_is_active_storm: false;
    local_alert_source: string;
  };
}
