function a(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function d(s, t = 0) {
  return s === null || !Number.isFinite(s) ? "—" : s.toFixed(t);
}
function b(s) {
  return s === null || s < 0 ? "Unknown" : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`;
}
function w(s) {
  if (!s) return null;
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(t);
}
function p(s) {
  if (!s) return null;
  try {
    const t = new URL(s, window.location.origin);
    if (t.protocol === "https:" || t.origin === window.location.origin)
      return t.href;
  } catch {
    return null;
  }
  return null;
}
const $ = 1, x = `
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
  .basin-head { display:flex; justify-content:space-between; gap:8px; align-items:flex-start; margin-bottom:10px; }
  .basin h2 { font-size:1.08rem; margin:0; }
  .season { color:var(--secondary-text-color); font-size:.78rem; margin-top:3px; }
  .count,.muted { color:var(--secondary-text-color); }
  .counts { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:4px 9px; }
  .outlook { border-radius:9px; margin-bottom:10px; overflow:hidden; background:color-mix(in srgb,var(--warning-color,#f4b400) 13%,transparent); border:1px solid color-mix(in srgb,var(--warning-color,#f4b400) 32%,transparent); }
  .outlook.unavailable { background:var(--secondary-background-color); color:var(--secondary-text-color); }
  .outlook-main { padding:9px; }
  .outlook-title { display:flex; justify-content:space-between; gap:8px; margin-bottom:5px; }
  .outlook-issued { color:var(--secondary-text-color); font-size:.78rem; margin-bottom:5px; }
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
class y extends HTMLElement {
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
  setConfig(t) {
    if (t?.type !== "custom:noaa-nhc-card")
      throw new Error("NOAA NHC Card requires type: custom:noaa-nhc-card");
    if (t.basins !== void 0 && (!Array.isArray(t.basins) || t.basins.length === 0 || t.basins.some((e) => !["al", "ep", "cp"].includes(e))))
      throw new Error("basins must be a non-empty list containing al, ep, or cp");
    if (t.storm_image_position !== void 0 && !["top", "bottom"].includes(t.storm_image_position))
      throw new Error("storm_image_position must be top or bottom");
    if (t.distance_unit !== void 0 && !["km", "miles"].includes(t.distance_unit))
      throw new Error("distance_unit must be km or miles");
    this._config = { ...t }, this.render();
  }
  set hass(t) {
    this._hass = t;
    const e = Math.max(15, this._config.refresh_seconds ?? 60) * 1e3;
    Date.now() - this._lastFetch >= e && this.refresh();
  }
  connectedCallback() {
    const t = Math.max(15, this._config.refresh_seconds ?? 60);
    this._timer = window.setInterval(() => {
      this.refresh();
    }, t * 1e3), this._hass && this.refresh();
  }
  disconnectedCallback() {
    this._timer !== void 0 && window.clearInterval(this._timer);
  }
  getCardSize() {
    const t = this._data?.storms.filter(
      (e) => !this._config.basins || this._config.basins.includes(e.basin)
    );
    return Math.max(3, (t?.length ?? 0) * 3);
  }
  static getStubConfig() {
    return {
      type: "custom:noaa-nhc-card",
      show_images: !0,
      show_outlook_images: !0,
      show_local_alerts: !0,
      storm_image_position: "bottom",
      wind_speed_unit: "knots",
      distance_unit: "km"
    };
  }
  async refresh() {
    if (!(!this._hass || this._loading)) {
      this._loading = !0;
      try {
        const t = await this._hass.callWS({
          type: "noaa_nhc/presentation"
        });
        if (t.contract_version !== $)
          throw new Error(`Unsupported presentation contract ${t.contract_version}`);
        this._data = t, this._error = void 0, this._lastFetch = Date.now();
      } catch (t) {
        this._error = t instanceof Error ? t.message : "Unable to load NOAA NHC data";
      } finally {
        this._loading = !1, this.render();
      }
    }
  }
  render() {
    if (!this.shadowRoot) return;
    const t = a(this._config.title ?? "Tropical Cyclones");
    let e = '<div class="muted">Waiting for NOAA NHC data…</div>';
    if (this._error) e = `<div class="error">${a(this._error)}</div>`;
    else if (this._data) {
      const o = this._config.show_local_alerts === !1 ? "" : this.renderAlerts(this._data), r = this._config.basins ? this._data.basins.filter(
        (u) => this._config.basins?.includes(u.id)
      ) : this._data.basins, i = r.map((u) => this.renderBasin(u)).join(""), n = this._data.freshness.storm_source_status !== "fresh", l = r.length === 0 ? '<div class="error">None of this card’s selected basins are configured in the integration.</div>' : "";
      e = `${o}${n ? '<div class="status stale">Storm data is stale; showing the last successful NHC update.</div>' : ""}${l}<div class="basins">${i}</div>`;
    }
    this.shadowRoot.innerHTML = `<style>${x}</style><ha-card><h1>${t}</h1>${e}<div class="footer">Basin activity and storm proximity do not mean your location is under an official watch or warning.</div></ha-card>`;
    for (const o of this.shadowRoot.querySelectorAll("img"))
      o.addEventListener("error", () => o.closest(".image")?.remove(), { once: !0 });
  }
  renderAlerts(t) {
    const e = t.local_alerts.state, o = {
      active: "Official tropical watch/warning affects the reference location",
      clear: "No matching point-filtered tropical watch/warning",
      stale: "Local alert source is stale; showing the last successful result",
      unavailable: "Local tropical alert source is unavailable"
    }[e], r = t.local_alerts.alerts.map((i) => this.renderAlert(i)).join("");
    return `<section class="status ${e}"><strong>${a(o)}</strong>${r}</section>`;
  }
  renderAlert(t) {
    const e = p(t.url);
    return `<div class="alert">${e ? `<a href="${a(e)}" target="_blank" rel="noopener noreferrer">${a(t.event)}</a>` : a(t.event)}${t.severity ? ` · ${a(t.severity)}` : ""}${t.expires ? ` · expires ${a(new Date(t.expires).toLocaleString())}` : ""}${t.affected_area ? `<div class="muted">${a(t.affected_area)}</div>` : ""}</div>`;
  }
  renderBasin(t) {
    const e = (this._data?.storms ?? []).filter((i) => i.basin === t.id), o = e.length ? e.map((i) => this.renderStorm(i)).join("") : '<div class="quiet">No active storms in this configured basin.</div>', r = t.season ? `<div class="season">Official season: ${this.formatSeasonDate(t.season.start)}–${this.formatSeasonDate(t.season.end)} · ${t.season.in_season ? "In season" : `Off season · starts ${this.formatSeasonDate(t.season.start)}`}</div>` : "";
    return `<section class="basin"><div class="basin-head"><div><h2>${a(t.name)}</h2>${r}</div><span class="counts"><span class="count">${t.active_count} active</span><span class="count">${t.outlook.area_count} potential</span></span></div>${this.renderOutlook(t)}${o}</section>`;
  }
  formatSeasonDate(t) {
    const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (!e) return a(t);
    const o = Number(e[2]), r = Number(e[3]);
    return `${[
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ][o - 1] ?? ""} ${r}`.trim();
  }
  renderOutlook(t) {
    const e = t.outlook;
    if (e.source_status === "unavailable")
      return '<div class="outlook unavailable"><div class="outlook-main">Seven-day development outlook unavailable.</div></div>';
    const o = this._config.show_outlook_images !== !1 && e.image?.url !== void 0;
    if (!e.has_potential && e.source_status === "fresh" && !o) return "";
    const r = e.areas.map(
      (c) => `<div class="outlook-area"><strong>${a(c.location ?? `Area ${c.id}`)}</strong> · ${d(c.probability_7d)}% in 7 days${c.risk_level ? ` · ${a(c.risk_level)}` : ""}</div>`
    ).join(""), i = o ? this.renderImage(
      e.image?.url ?? null,
      e.official_url,
      `Official seven-day tropical weather outlook for ${t.name}`
    ) : "", n = e.source_status === "stale" ? '<div class="stale">Outlook data is stale; showing the last successful result.</div>' : "", l = w(e.issued_at), u = l ? `<div class="outlook-issued">Published ${a(l)}</div>` : "";
    return `<section class="outlook ${a(e.source_status)}"><div class="outlook-main"><div class="outlook-title"><strong>${e.area_count} potential development ${e.area_count === 1 ? "area" : "areas"}</strong><span class="muted">7-day outlook</span></div>${u}${r}${n}</div>${i}</section>`;
  }
  renderStorm(t) {
    const e = this._config.wind_speed_unit === "mph", o = t.wind_kt === null ? null : e ? t.wind_kt * 1.150779 : t.wind_kt, r = e ? "mph" : "kn", i = this._config.distance_unit === "miles", n = t.distance_km === null ? null : i ? t.distance_km * 0.6213711922 : t.distance_km, l = i ? "mi" : "km", c = [
      ["Advisory", t.advisory.links.public_advisory],
      ["Discussion", t.advisory.links.forecast_discussion],
      ["Graphics", t.advisory.links.forecast_graphics]
    ].map(([v, _]) => {
      const f = p(_);
      return f ? `<a href="${a(f)}" target="_blank" rel="noopener noreferrer">${v}</a>` : "";
    }).join(""), m = this._config.show_images === !1 ? "" : this.renderImage(
      t.image?.url ?? null,
      t.advisory.links.forecast_graphics,
      `Official ${t.image?.type} graphic for ${t.name}`
    ), h = `<div class="storm-main"><div class="storm-title"><div><h3>${a(t.name)}</h3><span class="muted">${a(t.id.toUpperCase())} · ${a(t.basin.toUpperCase())}</span></div><span class="classification">${a(t.classification.label)}</span></div><div class="muted">Advisory ${a(t.advisory.number ?? "—")} · ${a(b(t.advisory.age_seconds))}</div><div class="facts"><div class="fact"><span class="label">Maximum wind</span><span class="value">${d(o)} ${r}</span></div><div class="fact"><span class="label">Pressure</span><span class="value">${d(t.pressure_hpa)} hPa</span></div><div class="fact"><span class="label">Distance / bearing</span><span class="value">${d(n)} ${l} · ${d(t.bearing_degrees)}°</span></div><div class="fact"><span class="label">Movement</span><span class="value">${d(t.movement.direction_degrees)}° · ${d(t.movement.speed_mph)} mph</span></div></div><div class="links">${c}</div>${t.image?.stale ? '<div class="stale">Image is last-good cached data.</div>' : ""}</div>`, g = this._config.storm_image_position === "top" ? `${m}${h}` : `${h}${m}`;
    return `<article class="storm ${a(t.classification.severity)}">${g}</article>`;
  }
  renderImage(t, e, o) {
    const r = p(t);
    if (!r) return "";
    const i = `<img loading="lazy" src="${a(r)}" alt="${a(o)}">`, n = p(e);
    return `<div class="image">${n ? `<a class="image-link" href="${a(n)}" target="_blank" rel="noopener noreferrer" aria-label="${a(`Open ${o} on the NOAA National Hurricane Center website`)}">${i}</a>` : i}</div>`;
  }
}
customElements.get("noaa-nhc-card") || customElements.define("noaa-nhc-card", y);
window.customCards = window.customCards ?? [];
window.customCards.push({
  type: "noaa-nhc-card",
  name: "NOAA NHC Card",
  description: "Dynamic configured-basin and active-storm presentation",
  preview: !0
});
export {
  y as NoaaNhcCard
};
