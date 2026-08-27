import { age, escapeHtml, number, officialUrl } from "./format";
import type {
  BasinPresentation,
  CardConfig,
  HomeAssistant,
  LocalAlert,
  PresentationContract,
  StormPresentation,
} from "./types";

const CONTRACT_VERSION = 1;

const styles = `
  :host { display:block; }
  ha-card { padding:16px; color:var(--primary-text-color); }
  h1 { font-size:1.35rem; margin:0 0 12px; }
  .status { border-radius:10px; padding:10px 12px; margin-bottom:14px; background:var(--secondary-background-color); }
  .status.active { border-left:5px solid var(--error-color,#db4437); }
  .status.stale { border-left:5px solid var(--warning-color,#f4b400); }
  .status.clear { border-left:5px solid var(--success-color,#0f9d58); }
  .status.unavailable { border-left:5px solid var(--disabled-text-color,#9e9e9e); }
  .basins { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr)); gap:14px; }
  .basin { border:1px solid var(--divider-color); border-radius:12px; padding:12px; min-width:0; }
  .basin-head { display:flex; justify-content:space-between; gap:8px; align-items:baseline; margin-bottom:10px; }
  .basin h2 { font-size:1.08rem; margin:0; }
  .count,.muted { color:var(--secondary-text-color); }
  .counts { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:4px 9px; }
  .outlook { border-radius:9px; margin-bottom:10px; overflow:hidden; background:color-mix(in srgb,var(--warning-color,#f4b400) 13%,transparent); border:1px solid color-mix(in srgb,var(--warning-color,#f4b400) 32%,transparent); }
  .outlook.unavailable { background:var(--secondary-background-color); color:var(--secondary-text-color); }
  .outlook-main { padding:9px; }
  .outlook-title { display:flex; justify-content:space-between; gap:8px; margin-bottom:5px; }
  .outlook-area { font-size:.84rem; margin-top:4px; }
  .quiet { padding:18px 8px; text-align:center; color:var(--secondary-text-color); }
  .storm { overflow:hidden; border-radius:10px; background:var(--secondary-background-color); margin-top:10px; border-top:4px solid var(--divider-color); }
  .storm.danger { border-top-color:var(--error-color,#db4437); }
  .storm.warning { border-top-color:#f57c00; }
  .storm.watch { border-top-color:#fbc02d; }
  .storm-main { padding:12px; }
  .storm-title { display:flex; justify-content:space-between; gap:8px; align-items:start; }
  .storm h3 { margin:0; font-size:1.05rem; }
  .classification { font-size:.88rem; font-weight:600; }
  .facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin:12px 0; }
  .fact { min-width:0; }
  .label { display:block; font-size:.75rem; color:var(--secondary-text-color); }
  .value { font-weight:600; }
  .links { display:flex; flex-wrap:wrap; gap:10px; }
  a { color:var(--primary-color); }
  a.image-link { display:block; }
  a.image-link:focus-visible { outline:3px solid var(--primary-color); outline-offset:-3px; }
  a.image-link img { cursor:pointer; }
  img { display:block; width:100%; height:auto; max-height:460px; object-fit:contain; background:#fff; }
  .stale { color:var(--warning-color,#f4b400); font-weight:600; }
  .alert { margin-top:7px; }
  .footer { margin-top:14px; font-size:.78rem; color:var(--secondary-text-color); }
  .error { color:var(--error-color); }
  @media (max-width:480px) { ha-card { padding:12px; } .facts { grid-template-columns:1fr; } }
`;

export class NoaaNhcCard extends HTMLElement {
  private _hass?: HomeAssistant;
  private _config: CardConfig = { type: "custom:noaa-nhc-card" };
  private _data?: PresentationContract;
  private _error?: string;
  private _loading = false;
  private _lastFetch = 0;
  private _timer?: number;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config: CardConfig): void {
    if (config?.type !== "custom:noaa-nhc-card") {
      throw new Error("NOAA NHC Card requires type: custom:noaa-nhc-card");
    }
    if (
      config.basins !== undefined &&
      (!Array.isArray(config.basins) ||
        config.basins.length === 0 ||
        config.basins.some((basin) => !["al", "ep", "cp"].includes(basin)))
    ) {
      throw new Error("basins must be a non-empty list containing al, ep, or cp");
    }
    if (
      config.storm_image_position !== undefined &&
      !["top", "bottom"].includes(config.storm_image_position)
    ) {
      throw new Error("storm_image_position must be top or bottom");
    }
    if (config.distance_unit !== undefined && !["km", "miles"].includes(config.distance_unit)) {
      throw new Error("distance_unit must be km or miles");
    }
    this._config = { ...config };
    this.render();
  }

  set hass(value: HomeAssistant) {
    this._hass = value;
    const interval = Math.max(15, this._config.refresh_seconds ?? 60) * 1000;
    if (Date.now() - this._lastFetch >= interval) void this.refresh();
  }

  connectedCallback(): void {
    const seconds = Math.max(15, this._config.refresh_seconds ?? 60);
    this._timer = window.setInterval(() => void this.refresh(), seconds * 1000);
    if (this._hass) void this.refresh();
  }

  disconnectedCallback(): void {
    if (this._timer !== undefined) window.clearInterval(this._timer);
  }

  getCardSize(): number {
    const storms = this._data?.storms.filter(
      (storm) =>
        !this._config.basins || this._config.basins.includes(storm.basin as "al" | "ep" | "cp"),
    );
    return Math.max(3, (storms?.length ?? 0) * 3);
  }

  static getStubConfig(): CardConfig {
    return {
      type: "custom:noaa-nhc-card",
      show_images: true,
      show_outlook_images: true,
      show_local_alerts: true,
      storm_image_position: "bottom",
      wind_speed_unit: "knots",
      distance_unit: "km",
    };
  }

  async refresh(): Promise<void> {
    if (!this._hass || this._loading) return;
    this._loading = true;
    try {
      const data = await this._hass.callWS<PresentationContract>({
        type: "noaa_nhc/presentation",
      });
      if (data.contract_version !== CONTRACT_VERSION) {
        throw new Error(`Unsupported presentation contract ${data.contract_version}`);
      }
      this._data = data;
      this._error = undefined;
      this._lastFetch = Date.now();
    } catch (error) {
      this._error = error instanceof Error ? error.message : "Unable to load NOAA NHC data";
    } finally {
      this._loading = false;
      this.render();
    }
  }

  private render(): void {
    if (!this.shadowRoot) return;
    const title = escapeHtml(this._config.title ?? "Tropical Cyclones");
    let body = '<div class="muted">Waiting for NOAA NHC data…</div>';
    if (this._error) body = `<div class="error">${escapeHtml(this._error)}</div>`;
    else if (this._data) {
      const alert = this._config.show_local_alerts === false ? "" : this.renderAlerts(this._data);
      const visibleBasins = this._config.basins
        ? this._data.basins.filter((basin) =>
            this._config.basins?.includes(basin.id as "al" | "ep" | "cp"),
          )
        : this._data.basins;
      const basins = visibleBasins.map((basin) => this.renderBasin(basin)).join("");
      const stale = this._data.freshness.storm_source_status !== "fresh";
      const noBasins =
        visibleBasins.length === 0
          ? '<div class="error">None of this card’s selected basins are configured in the integration.</div>'
          : "";
      body = `${alert}${stale ? '<div class="status stale">Storm data is stale; showing the last successful NHC update.</div>' : ""}${noBasins}<div class="basins">${basins}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${styles}</style><ha-card><h1>${title}</h1>${body}<div class="footer">Basin activity and storm proximity do not mean your location is under an official watch or warning.</div></ha-card>`;
    for (const image of this.shadowRoot.querySelectorAll("img")) {
      image.addEventListener("error", () => image.closest(".image")?.remove(), { once: true });
    }
  }

  private renderAlerts(data: PresentationContract): string {
    const state = data.local_alerts.state;
    const heading = {
      active: "Official tropical watch/warning affects the reference location",
      clear: "No matching point-filtered tropical watch/warning",
      stale: "Local alert source is stale; showing the last successful result",
      unavailable: "Local tropical alert source is unavailable",
    }[state];
    const alerts = data.local_alerts.alerts.map((alert) => this.renderAlert(alert)).join("");
    return `<section class="status ${state}"><strong>${escapeHtml(heading)}</strong>${alerts}</section>`;
  }

  private renderAlert(alert: LocalAlert): string {
    const url = officialUrl(alert.url);
    const label = url
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(alert.event)}</a>`
      : escapeHtml(alert.event);
    return `<div class="alert">${label}${alert.severity ? ` · ${escapeHtml(alert.severity)}` : ""}${alert.expires ? ` · expires ${escapeHtml(new Date(alert.expires).toLocaleString())}` : ""}${alert.affected_area ? `<div class="muted">${escapeHtml(alert.affected_area)}</div>` : ""}</div>`;
  }

  private renderBasin(basin: BasinPresentation): string {
    const storms = (this._data?.storms ?? []).filter((storm) => storm.basin === basin.id);
    const contents = storms.length
      ? storms.map((storm) => this.renderStorm(storm)).join("")
      : '<div class="quiet">No active storms in this configured basin.</div>';
    return `<section class="basin"><div class="basin-head"><h2>${escapeHtml(basin.name)}</h2><span class="counts"><span class="count">${basin.active_count} active</span><span class="count">${basin.outlook.area_count} potential</span></span></div>${this.renderOutlook(basin)}${contents}</section>`;
  }

  private renderOutlook(basin: BasinPresentation): string {
    const outlook = basin.outlook;
    if (outlook.source_status === "unavailable") {
      return '<div class="outlook unavailable"><div class="outlook-main">Seven-day development outlook unavailable.</div></div>';
    }
    const canShowImage =
      this._config.show_outlook_images !== false && outlook.image?.url !== undefined;
    if (!outlook.has_potential && outlook.source_status === "fresh" && !canShowImage) return "";
    const areas = outlook.areas
      .map(
        (area) =>
          `<div class="outlook-area"><strong>${escapeHtml(area.location ?? `Area ${area.id}`)}</strong> · ${number(area.probability_7d)}% in 7 days${area.risk_level ? ` · ${escapeHtml(area.risk_level)}` : ""}</div>`,
      )
      .join("");
    const image = !canShowImage
      ? ""
      : this.renderImage(
          outlook.image?.url ?? null,
          outlook.official_url,
          `Official seven-day tropical weather outlook for ${basin.name}`,
        );
    const stale =
      outlook.source_status === "stale"
        ? '<div class="stale">Outlook data is stale; showing the last successful result.</div>'
        : "";
    return `<section class="outlook ${escapeHtml(outlook.source_status)}"><div class="outlook-main"><div class="outlook-title"><strong>${outlook.area_count} potential development ${outlook.area_count === 1 ? "area" : "areas"}</strong><span class="muted">7-day outlook</span></div>${areas}${stale}</div>${image}</section>`;
  }

  private renderStorm(storm: StormPresentation): string {
    const useMph = this._config.wind_speed_unit === "mph";
    const wind = storm.wind_kt === null ? null : useMph ? storm.wind_kt * 1.150779 : storm.wind_kt;
    const windUnit = useMph ? "mph" : "kn";
    const useMiles = this._config.distance_unit === "miles";
    const distance =
      storm.distance_km === null
        ? null
        : useMiles
          ? storm.distance_km * 0.6213711922
          : storm.distance_km;
    const distanceUnit = useMiles ? "mi" : "km";
    const linkDefinitions: Array<[string, string | null]> = [
      ["Advisory", storm.advisory.links.public_advisory],
      ["Discussion", storm.advisory.links.forecast_discussion],
      ["Graphics", storm.advisory.links.forecast_graphics],
    ];
    const links = linkDefinitions
      .map(([label, value]) => {
        const url = officialUrl(value);
        return url
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
          : "";
      })
      .join("");
    const image =
      this._config.show_images === false
        ? ""
        : this.renderImage(
            storm.image?.url ?? null,
            storm.advisory.links.forecast_graphics,
            `Official ${storm.image?.type} graphic for ${storm.name}`,
          );
    const main = `<div class="storm-main"><div class="storm-title"><div><h3>${escapeHtml(storm.name)}</h3><span class="muted">${escapeHtml(storm.id.toUpperCase())} · ${escapeHtml(storm.basin.toUpperCase())}</span></div><span class="classification">${escapeHtml(storm.classification.label)}</span></div><div class="muted">Advisory ${escapeHtml(storm.advisory.number ?? "—")} · ${escapeHtml(age(storm.advisory.age_seconds))}</div><div class="facts"><div class="fact"><span class="label">Maximum wind</span><span class="value">${number(wind)} ${windUnit}</span></div><div class="fact"><span class="label">Pressure</span><span class="value">${number(storm.pressure_hpa)} hPa</span></div><div class="fact"><span class="label">Distance / bearing</span><span class="value">${number(distance)} ${distanceUnit} · ${number(storm.bearing_degrees)}°</span></div><div class="fact"><span class="label">Movement</span><span class="value">${number(storm.movement.direction_degrees)}° · ${number(storm.movement.speed_mph)} mph</span></div></div><div class="links">${links}</div>${storm.image?.stale ? '<div class="stale">Image is last-good cached data.</div>' : ""}</div>`;
    const content =
      this._config.storm_image_position === "top" ? `${image}${main}` : `${main}${image}`;
    return `<article class="storm ${escapeHtml(storm.classification.severity)}">${content}</article>`;
  }

  private renderImage(imageValue: string | null, parentValue: string | null, alt: string): string {
    const imageUrl = officialUrl(imageValue);
    if (!imageUrl) return "";
    const image = `<img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(alt)}">`;
    const parentUrl = officialUrl(parentValue);
    const content = parentUrl
      ? `<a class="image-link" href="${escapeHtml(parentUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(`Open ${alt} on the NOAA National Hurricane Center website`)}">${image}</a>`
      : image;
    return `<div class="image">${content}</div>`;
  }
}

if (!customElements.get("noaa-nhc-card")) customElements.define("noaa-nhc-card", NoaaNhcCard);

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}

window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "noaa-nhc-card",
  name: "NOAA NHC Card",
  description: "Dynamic configured-basin and active-storm presentation",
  preview: true,
});
