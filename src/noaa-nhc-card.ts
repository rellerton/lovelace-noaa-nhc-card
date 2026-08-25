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
    return Math.max(3, (this._data?.storms.length ?? 0) * 3);
  }

  static getStubConfig(): CardConfig {
    return { type: "custom:noaa-nhc-card", show_images: true, show_local_alerts: true };
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
      const basins = this._data.basins.map((basin) => this.renderBasin(basin)).join("");
      const stale = this._data.freshness.storm_source_status !== "fresh";
      body = `${alert}${stale ? '<div class="status stale">Storm data is stale; showing the last successful NHC update.</div>' : ""}<div class="basins">${basins}</div>`;
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
    return `<section class="basin"><div class="basin-head"><h2>${escapeHtml(basin.name)}</h2><span class="count">${basin.active_count} active</span></div>${contents}</section>`;
  }

  private renderStorm(storm: StormPresentation): string {
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
    const imageUrl = officialUrl(storm.image?.url ?? null);
    const image =
      this._config.show_images === false || !imageUrl
        ? ""
        : `<div class="image"><img loading="lazy" src="${escapeHtml(imageUrl)}" alt="Official ${escapeHtml(storm.image?.type)} graphic for ${escapeHtml(storm.name)}"></div>`;
    return `<article class="storm ${escapeHtml(storm.classification.severity)}">${image}<div class="storm-main"><div class="storm-title"><div><h3>${escapeHtml(storm.name)}</h3><span class="muted">${escapeHtml(storm.id.toUpperCase())} · ${escapeHtml(storm.basin.toUpperCase())}</span></div><span class="classification">${escapeHtml(storm.classification.label)}</span></div><div class="muted">Advisory ${escapeHtml(storm.advisory.number ?? "—")} · ${escapeHtml(age(storm.advisory.age_seconds))}</div><div class="facts"><div class="fact"><span class="label">Maximum wind</span><span class="value">${number(storm.wind_kt)} kn</span></div><div class="fact"><span class="label">Pressure</span><span class="value">${number(storm.pressure_hpa)} hPa</span></div><div class="fact"><span class="label">Distance / bearing</span><span class="value">${number(storm.distance_km)} km · ${number(storm.bearing_degrees)}°</span></div><div class="fact"><span class="label">Movement</span><span class="value">${number(storm.movement.direction_degrees)}° · ${number(storm.movement.speed_mph)} mph</span></div></div><div class="links">${links}</div>${storm.image?.stale ? '<div class="stale">Image is last-good cached data.</div>' : ""}</div></article>`;
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
