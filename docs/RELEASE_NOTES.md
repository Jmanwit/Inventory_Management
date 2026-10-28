# Release Notes

## 0.1.0 — Starter scaffold

- Establishes Shack Out Back identity and visual design.
- Adds local-only box CRUD, rooms, locations, item search, relocation, label dialog, JSON export/import, and printable inventory.
- Adds a modular structure for QR generation, printing, persistence, and search.
- Adds initial PWA and Supabase schema scaffolding.
- Clearly documents unimplemented QR library bundling, cloud synchronization, offline conflict handling, and direct NIIMBOT printing.


## In-app QR scanner (pending device verification)

- Added a Scan QR control to the Inventory screen.
- Uses the browser's native QR BarcodeDetector and rear camera; no third-party runtime service or database changes.
- Recognizes the existing `#box=<stable-id>` label URL and refreshes the shared inventory before opening the record.
- Scanner closes the camera stream on success, cancellation, and dialog close.
- Bumped service-worker cache to v7 so updated files can deploy together.
- Device testing is still required; browser support for native QR detection varies.
