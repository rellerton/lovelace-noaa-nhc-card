# NOAA NHC Card

An optional dynamic Lovelace card for the independent **NOAA NHC Sensor
Suite** Home Assistant custom integration.

> [!WARNING]
> This is an unofficial community project. It is not affiliated with, endorsed
> by, or operated by NOAA, NHC, CPHC, NWS, or the United States government. Do
> not use Home Assistant or this card for life-safety decisions. Always consult
> official forecasts and instructions from local authorities.

## Status

This repository is local-only development software and has not been published.
It has no Git remote or release. The card requires NOAA NHC Sensor Suite
`0.2.0` or newer and presentation contract version `1`.

The backend integration remains fully useful without this card. The card does
not inspect entity IDs or the entity registry. It requests a compact,
authenticated `noaa_nhc/presentation` WebSocket contract and dynamically
renders:

- every configured basin, including a clear quiet-basin state;
- every current official storm ID without dashboard edits;
- classification severity, advisory age, wind, pressure, distance, bearing,
  movement, and compact official links;
- stale source indications;
- optional signed official imagery supplied on demand by the integration; and
- point-filtered local NWS tropical watch/warning state, explicitly separated
  from basin activity and geographic proximity.

## Lovelace configuration

```yaml
type: custom:noaa-nhc-card
title: Tropical Cyclones
show_images: true
show_local_alerts: true
refresh_seconds: 60
```

The responsive layout uses one column on narrow/mobile screens and as many
basin columns as fit on desktop.

## Development

```powershell
npm install
npm run check
npm run test
npm run build
```

The reproducible build writes `dist/noaa-nhc-card.js` without a source map.

## Future publication checklist

- Create the GitHub repository and remote only after explicit approval.
- Cross-link the published integration README and this card README.
- Publish `dist/noaa-nhc-card.js` as the HACS plugin/release artifact.
- Replace screenshot placeholders with real mobile, desktop, quiet-basin,
  multi-storm, stale-source, and local-alert screenshots.
- Add final HACS installation examples and verify the minimum integration
  version before the first release.

## License

[MIT](LICENSE)

