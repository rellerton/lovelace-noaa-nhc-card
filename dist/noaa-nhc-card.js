function t(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function l(s, a = 0) {
  return s === null || !Number.isFinite(s) ? "—" : s.toFixed(a);
}
function g(s) {
  return s === null || s < 0 ? "Unknown" : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
}
function p(s) {
  if (!s) return null;
  try {
    const a = new URL(s, window.location.origin);
    if (a.protocol === "https:" || a.origin === window.location.origin)
      return a.href;
  } catch {
    return null;
  }
  return null;
}
const v = 1, _ = `
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
class b extends HTMLElement {
  _hass;
  _config = { type: "custom:noaa-nhc-card" };
  _data;
  _error;
  _loading = !1;
  _lastFetch = 0;
  _timer;
  constructor() {
    super(), this.attachShadow({ mode: "open" });
  }
  setConfig(a) {
    if (a?.type !== "custom:noaa-nhc-card")
      throw new Error("NOAA NHC Card requires type: custom:noaa-nhc-card");
    if (a.basins !== void 0 && (!Array.isArray(a.basins) || a.basins.length === 0 || a.basins.some((e) => !["al", "ep", "cp"].includes(e))))
      throw new Error("basins must be a non-empty list containing al, ep, or cp");
    if (a.storm_image_position !== void 0 && !["top", "bottom"].includes(a.storm_image_position))
      throw new Error("storm_image_position must be top or bottom");
    this._config = { ...a }, this.render();
  }
  set hass(a) {
    this._hass = a;
    const e = Math.max(15, this._config.refresh_seconds ?? 60) * 1e3;
    Date.now() - this._lastFetch >= e && this.refresh();
  }
  connectedCallback() {
    const a = Math.max(15, this._config.refresh_seconds ?? 60);
    this._timer = window.setInterval(() => {
      this.refresh();
    }, a * 1e3), this._hass && this.refresh();
  }
  disconnectedCallback() {
    this._timer !== void 0 && window.clearInterval(this._timer);
  }
  getCardSize() {
    const a = this._data?.storms.filter(
      (e) => !this._config.basins || this._config.basins.includes(e.basin)
    );
    return Math.max(3, (a?.length ?? 0) * 3);
  }
  static getStubConfig() {
    return {
      type: "custom:noaa-nhc-card",
      show_images: !0,
      show_outlook_images: !0,
      show_local_alerts: !0,
      storm_image_position: "bottom",
      wind_speed_unit: "knots"
    };
  }
  async refresh() {
    if (!(!this._hass || this._loading)) {
      this._loading = !0;
      try {
        const a = await this._hass.callWS({
          type: "noaa_nhc/presentation"
        });
        if (a.contract_version !== v)
          throw new Error(`Unsupported presentation contract ${a.contract_version}`);
        this._data = a, this._error = void 0, this._lastFetch = Date.now();
      } catch (a) {
        this._error = a instanceof Error ? a.message : "Unable to load NOAA NHC data";
      } finally {
        this._loading = !1, this.render();
      }
    }
  }
  render() {
    if (!this.shadowRoot) return;
    const a = t(this._config.title ?? "Tropical Cyclones");
    let e = '<div class="muted">Waiting for NOAA NHC data…</div>';
    if (this._error) e = `<div class="error">${t(this._error)}</div>`;
    else if (this._data) {
      const i = this._config.show_local_alerts === !1 ? "" : this.renderAlerts(this._data), o = this._config.basins ? this._data.basins.filter(
        (c) => this._config.basins?.includes(c.id)
      ) : this._data.basins, n = o.map((c) => this.renderBasin(c)).join(""), r = this._data.freshness.storm_source_status !== "fresh", d = o.length === 0 ? '<div class="error">None of this card’s selected basins are configured in the integration.</div>' : "";
      e = `${i}${r ? '<div class="status stale">Storm data is stale; showing the last successful NHC update.</div>' : ""}${d}<div class="basins">${n}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${_}</style><ha-card><h1>${a}</h1>${e}<div class="footer">Basin activity and storm proximity do not mean your location is under an official watch or warning.</div></ha-card>`;
    for (const i of this.shadowRoot.querySelectorAll("img"))
      i.addEventListener("error", () => i.closest(".image")?.remove(), { once: !0 });
  }
  renderAlerts(a) {
    const e = a.local_alerts.state, i = {
      active: "Official tropical watch/warning affects the reference location",
      clear: "No matching point-filtered tropical watch/warning",
      stale: "Local alert source is stale; showing the last successful result",
      unavailable: "Local tropical alert source is unavailable"
    }[e], o = a.local_alerts.alerts.map((n) => this.renderAlert(n)).join("");
    return `<section class="status ${e}"><strong>${t(i)}</strong>${o}</section>`;
  }
  renderAlert(a) {
    const e = p(a.url);
    return `<div class="alert">${e ? `<a href="${t(e)}" target="_blank" rel="noopener noreferrer">${t(a.event)}</a>` : t(a.event)}${a.severity ? ` · ${t(a.severity)}` : ""}${a.expires ? ` · expires ${t(new Date(a.expires).toLocaleString())}` : ""}${a.affected_area ? `<div class="muted">${t(a.affected_area)}</div>` : ""}</div>`;
  }
  renderBasin(a) {
    const e = (this._data?.storms ?? []).filter((o) => o.basin === a.id), i = e.length ? e.map((o) => this.renderStorm(o)).join("") : '<div class="quiet">No active storms in this configured basin.</div>';
    return `<section class="basin"><div class="basin-head"><h2>${t(a.name)}</h2><span class="counts"><span class="count">${a.active_count} active</span><span class="count">${a.outlook.area_count} potential</span></span></div>${this.renderOutlook(a)}${i}</section>`;
  }
  renderOutlook(a) {
    const e = a.outlook;
    if (e.source_status === "unavailable")
      return '<div class="outlook unavailable"><div class="outlook-main">Seven-day development outlook unavailable.</div></div>';
    if (!e.has_potential && e.source_status === "fresh") return "";
    const i = e.areas.map(
      (r) => `<div class="outlook-area"><strong>${t(r.location ?? `Area ${r.id}`)}</strong> · ${l(r.probability_7d)}% in 7 days${r.risk_level ? ` · ${t(r.risk_level)}` : ""}</div>`
    ).join(""), o = this._config.show_outlook_images === !1 || !e.has_potential ? "" : this.renderImage(
      e.image?.url ?? null,
      e.official_url,
      `Official seven-day tropical weather outlook for ${a.name}`
    ), n = e.source_status === "stale" ? '<div class="stale">Outlook data is stale; showing the last successful result.</div>' : "";
    return `<section class="outlook ${t(e.source_status)}"><div class="outlook-main"><div class="outlook-title"><strong>${e.area_count} potential development ${e.area_count === 1 ? "area" : "areas"}</strong><span class="muted">7-day outlook</span></div>${i}${n}</div>${o}</section>`;
  }
  renderStorm(a) {
    const e = this._config.wind_speed_unit === "mph", i = a.wind_kt === null ? null : e ? a.wind_kt * 1.150779 : a.wind_kt, o = e ? "mph" : "kn", r = [
      ["Advisory", a.advisory.links.public_advisory],
      ["Discussion", a.advisory.links.forecast_discussion],
      ["Graphics", a.advisory.links.forecast_graphics]
    ].map(([f, m]) => {
      const u = p(m);
      return u ? `<a href="${t(u)}" target="_blank" rel="noopener noreferrer">${f}</a>` : "";
    }).join(""), d = this._config.show_images === !1 ? "" : this.renderImage(
      a.image?.url ?? null,
      a.advisory.links.forecast_graphics,
      `Official ${a.image?.type} graphic for ${a.name}`
    ), c = `<div class="storm-main"><div class="storm-title"><div><h3>${t(a.name)}</h3><span class="muted">${t(a.id.toUpperCase())} · ${t(a.basin.toUpperCase())}</span></div><span class="classification">${t(a.classification.label)}</span></div><div class="muted">Advisory ${t(a.advisory.number ?? "—")} · ${t(g(a.advisory.age_seconds))}</div><div class="facts"><div class="fact"><span class="label">Maximum wind</span><span class="value">${l(i)} ${o}</span></div><div class="fact"><span class="label">Pressure</span><span class="value">${l(a.pressure_hpa)} hPa</span></div><div class="fact"><span class="label">Distance / bearing</span><span class="value">${l(a.distance_km)} km · ${l(a.bearing_degrees)}°</span></div><div class="fact"><span class="label">Movement</span><span class="value">${l(a.movement.direction_degrees)}° · ${l(a.movement.speed_mph)} mph</span></div></div><div class="links">${r}</div>${a.image?.stale ? '<div class="stale">Image is last-good cached data.</div>' : ""}</div>`, h = this._config.storm_image_position === "top" ? `${d}${c}` : `${c}${d}`;
    return `<article class="storm ${t(a.classification.severity)}">${h}</article>`;
  }
  renderImage(a, e, i) {
    const o = p(a);
    if (!o) return "";
    const n = `<img loading="lazy" src="${t(o)}" alt="${t(i)}">`, r = p(e);
    return `<div class="image">${r ? `<a class="image-link" href="${t(r)}" target="_blank" rel="noopener noreferrer" aria-label="${t(`Open ${i} on the NOAA National Hurricane Center website`)}">${n}</a>` : n}</div>`;
  }
}
customElements.get("noaa-nhc-card") || customElements.define("noaa-nhc-card", b);
window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "noaa-nhc-card",
  name: "NOAA NHC Card",
  description: "Dynamic configured-basin and active-storm presentation",
  preview: !0
});
export {
  b as NoaaNhcCard
};
