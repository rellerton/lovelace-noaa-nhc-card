function e(t) {
  return String(t ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function o(t, a = 0) {
  return t === null || !Number.isFinite(t) ? "—" : t.toFixed(a);
}
function h(t) {
  return t === null || t < 0 ? "Unknown" : t < 3600 ? `${Math.floor(t / 60)}m ago` : t < 86400 ? `${Math.floor(t / 3600)}h ago` : `${Math.floor(t / 86400)}d ago`;
}
function c(t) {
  if (!t) return null;
  try {
    const a = new URL(t, window.location.origin);
    if (a.protocol === "https:" || a.origin === window.location.origin)
      return a.href;
  } catch {
    return null;
  }
  return null;
}
const f = 1, u = `
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
class m extends HTMLElement {
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
    this._config = { ...a }, this.render();
  }
  set hass(a) {
    this._hass = a;
    const s = Math.max(15, this._config.refresh_seconds ?? 60) * 1e3;
    Date.now() - this._lastFetch >= s && this.refresh();
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
    return Math.max(3, (this._data?.storms.length ?? 0) * 3);
  }
  static getStubConfig() {
    return { type: "custom:noaa-nhc-card", show_images: !0, show_local_alerts: !0 };
  }
  async refresh() {
    if (!(!this._hass || this._loading)) {
      this._loading = !0;
      try {
        const a = await this._hass.callWS({
          type: "noaa_nhc/presentation"
        });
        if (a.contract_version !== f)
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
    const a = e(this._config.title ?? "Tropical Cyclones");
    let s = '<div class="muted">Waiting for NOAA NHC data…</div>';
    if (this._error) s = `<div class="error">${e(this._error)}</div>`;
    else if (this._data) {
      const r = this._config.show_local_alerts === !1 ? "" : this.renderAlerts(this._data), i = this._data.basins.map((l) => this.renderBasin(l)).join(""), n = this._data.freshness.storm_source_status !== "fresh";
      s = `${r}${n ? '<div class="status stale">Storm data is stale; showing the last successful NHC update.</div>' : ""}<div class="basins">${i}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${u}</style><ha-card><h1>${a}</h1>${s}<div class="footer">Basin activity and storm proximity do not mean your location is under an official watch or warning.</div></ha-card>`;
    for (const r of this.shadowRoot.querySelectorAll("img"))
      r.addEventListener("error", () => r.closest(".image")?.remove(), { once: !0 });
  }
  renderAlerts(a) {
    const s = a.local_alerts.state, r = {
      active: "Official tropical watch/warning affects the reference location",
      clear: "No matching point-filtered tropical watch/warning",
      stale: "Local alert source is stale; showing the last successful result",
      unavailable: "Local tropical alert source is unavailable"
    }[s], i = a.local_alerts.alerts.map((n) => this.renderAlert(n)).join("");
    return `<section class="status ${s}"><strong>${e(r)}</strong>${i}</section>`;
  }
  renderAlert(a) {
    const s = c(a.url);
    return `<div class="alert">${s ? `<a href="${e(s)}" target="_blank" rel="noopener noreferrer">${e(a.event)}</a>` : e(a.event)}${a.severity ? ` · ${e(a.severity)}` : ""}${a.expires ? ` · expires ${e(new Date(a.expires).toLocaleString())}` : ""}${a.affected_area ? `<div class="muted">${e(a.affected_area)}</div>` : ""}</div>`;
  }
  renderBasin(a) {
    const s = (this._data?.storms ?? []).filter((i) => i.basin === a.id), r = s.length ? s.map((i) => this.renderStorm(i)).join("") : '<div class="quiet">No active storms in this configured basin.</div>';
    return `<section class="basin"><div class="basin-head"><h2>${e(a.name)}</h2><span class="count">${a.active_count} active</span></div>${r}</section>`;
  }
  renderStorm(a) {
    const r = [
      ["Advisory", a.advisory.links.public_advisory],
      ["Discussion", a.advisory.links.forecast_discussion],
      ["Graphics", a.advisory.links.forecast_graphics]
    ].map(([l, p]) => {
      const d = c(p);
      return d ? `<a href="${e(d)}" target="_blank" rel="noopener noreferrer">${l}</a>` : "";
    }).join(""), i = c(a.image?.url ?? null), n = this._config.show_images === !1 || !i ? "" : `<div class="image"><img loading="lazy" src="${e(i)}" alt="Official ${e(a.image?.type)} graphic for ${e(a.name)}"></div>`;
    return `<article class="storm ${e(a.classification.severity)}">${n}<div class="storm-main"><div class="storm-title"><div><h3>${e(a.name)}</h3><span class="muted">${e(a.id.toUpperCase())} · ${e(a.basin.toUpperCase())}</span></div><span class="classification">${e(a.classification.label)}</span></div><div class="muted">Advisory ${e(a.advisory.number ?? "—")} · ${e(h(a.advisory.age_seconds))}</div><div class="facts"><div class="fact"><span class="label">Maximum wind</span><span class="value">${o(a.wind_kt)} kn</span></div><div class="fact"><span class="label">Pressure</span><span class="value">${o(a.pressure_hpa)} hPa</span></div><div class="fact"><span class="label">Distance / bearing</span><span class="value">${o(a.distance_km)} km · ${o(a.bearing_degrees)}°</span></div><div class="fact"><span class="label">Movement</span><span class="value">${o(a.movement.direction_degrees)}° · ${o(a.movement.speed_mph)} mph</span></div></div><div class="links">${r}</div>${a.image?.stale ? '<div class="stale">Image is last-good cached data.</div>' : ""}</div></article>`;
  }
}
customElements.get("noaa-nhc-card") || customElements.define("noaa-nhc-card", m);
window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "noaa-nhc-card",
  name: "NOAA NHC Card",
  description: "Dynamic configured-basin and active-storm presentation",
  preview: !0
});
export {
  m as NoaaNhcCard
};
