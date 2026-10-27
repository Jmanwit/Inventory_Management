# Architecture Notes

## Current starter

This is a static web app with ES modules. The first prototype stores data in `localStorage` behind `js/store.js`. UI code should not write to localStorage directly.

## Target architecture

Keep these responsibilities separate:

- `store.js` / future repository adapter: CRUD and persistence.
- `search.js`: searchable fields and matching behavior.
- `qr.js`: stable QR payload and local QR renderer.
- `printing.js`: label layout, quantity selection, and print action.
- `exports.js`: JSON backup, import, printable report.
- `app.js`: UI wiring and view rendering.
- `supabase/schema.sql`: starting database schema, not production-ready security policy.

When adding cloud support, introduce a repository interface so the UI does not need to know whether data came from local storage or Supabase. Avoid a direct migration that lets local and server IDs drift.

## Identity and numbering

Use an immutable UUID as the internal record ID and a human-readable code such as `KIT-006` for labels. QR codes should point to the stable internal record ID or an opaque stable token, not to a row-specific database URL.

The local prototype's sequential allocator is only safe within one browser. Production numbering must be allocated transactionally by the database, with a unique constraint and no ID reuse.

## Location concepts

- Destination: the room where the box belongs.
- Current location: where the box physically is now.
- Item contents: individual searchable strings in this initial version.

The initial release does not model each item as a permanent independent asset. Advanced item records are intentionally deferred.

## Offline behavior

The service worker caches app-shell files. This is not equivalent to a fully offline-first sync engine. Before claiming offline edits are reliable, implement a queue, conflict policy, synchronization status, and recovery behavior.

## Security

GitHub Pages serves public client code. Never include service-role credentials or private inventory data in the repository. Backend authorization must be enforced in Supabase policies/functions.
