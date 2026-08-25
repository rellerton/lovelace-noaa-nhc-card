# NOAA NHC Lovelace Card repository rules

## Purpose

This repository contains the optional Lovelace companion card for the
independent NOAA NHC Sensor Suite custom integration. The backend integration
must remain fully useful without this card.

## Repository and publication boundaries

- Keep this repository and Git history independent from the backend
  `noaa-nhc-sensor-suite` repository and Home Assistant configuration repos.
- Build for HACS Dashboard/plugin installation with a committed
  browser-ready `dist/noaa-nhc-card.js` artifact.
- Use MIT licensing and clearly state that the project is unofficial, is not
  affiliated with or endorsed by NOAA/NHC/NWS, and is not for life-safety use.
- Do not use NOAA/NHC logos or imply official branding.

## Contract and privacy invariants

- Require the versioned `noaa_nhc/presentation` WebSocket contract; do not
  discover data through user-renamable entity IDs, device names, or registry
  scraping.
- Reject unsupported contract versions clearly and document the minimum
  integration version.
- Render every configured basin and active official storm ID dynamically. Never
  hard-code current storm IDs, NHC bin slots, or dashboard entity IDs.
- Treat basin activity, distance/proximity, and an official point-filtered local
  alert as separate concepts in labels and styling.
- Do not expose, log, persist, or transmit private coordinates, credentials,
  tokens, entity registries, raw CurrentStorms payloads, or large GIS data.
- Use only signed/authenticated image URLs supplied by the integration. Hide an
  unavailable image without hiding the storm.

## Quality and validation boundaries

- Keep source TypeScript linted and unit-tested; commit a reproducible minified
  distribution build and verify it contains no source maps or secrets.
- Test no storms, multiple basins, simultaneous storms, new/disappearing storms,
  stale/unavailable sources, local alerts, missing fields/links/images, and
  responsive rendering.
- Never deploy to or change a contributor's production Home Assistant instance
  as part of development or validation.
- Keep the README, screenshots, tests, built distribution, and release metadata
  in sync with user-visible behavior.
