# Shack Out Back

**Know what you own. Know where it is.**

Shack Out Back is a mobile-first household inventory and moving-box application. It helps users catalog box contents, print QR labels, find belongings, and track boxes as they move through a household move—and later, permanent storage.

> **Status:** starter scaffold / early prototype. This ZIP establishes the project structure and a locally usable first pass. It is not a completed production release. Shared cloud synchronization, secure authentication, a bundled QR library, and direct NIIMBOT B21S printing still require implementation and testing.

## Project details

- **Application name:** Shack Out Back
- **Repository:** `Jmanwit/inventory_management`
- **Hosting target:** GitHub Pages
- **Primary devices:** Android phones
- **Primary printer:** NIIMBOT B21S
- **Design:** warm cream, forest green, walnut, restrained brass; heritage-library feel with a modern mobile-first interface.

The repository name and app name are independent. Keep the repository name as `inventory_management`; the interface and PWA use “Shack Out Back.”

## What's included

- Responsive single-page application shell.
- Box creation, editing, deletion, detail view, and individual contents.
- Room list with custom rooms and user-confirmed prefixes.
- Initial location required for each new box.
- Search across box IDs, descriptions, item names, rooms, locations, and notes.
- Relocation flow with reusable locations and confirmation.
- Label preview, quantity selection, browser print fallback, and reprint from saved box records.
- Stable box IDs that are not recycled within the local dataset.
- JSON export/import starter.
- Printable inventory view.
- PWA manifest and service-worker starter.
- Supabase schema starter with row-level security guidance.
- Modular JavaScript files to keep data, UI, search, QR, printing, and storage concerns separated.
- Architecture and testing notes in `docs/`.

## Important limitations in this starter

1. **Data is local to the current browser/device.** It does not yet synchronize between the S23 Ultra and S25 Ultra. Do not treat local browser storage as a shared backup.
2. **QR generation is deliberately isolated behind `js/qr.js`.** The ZIP does not include a third-party QR library binary because it could not be retrieved in this environment. The QR adapter currently explains the missing dependency rather than loading an external CDN. Add and bundle a vetted QR library locally before relying on QR labels.
3. **Printing uses the browser print dialog.** Direct Bluetooth printing to the NIIMBOT B21S is not implemented or verified.
4. **The starter is not production-hardened.** Validate imported JSON, test on actual phones, configure authentication/database policies, and test backups before using it for irreplaceable inventory.
5. **Offline support is an initial scaffold.** The service worker caches the app shell; reliable offline edits and conflict-safe synchronization are future work.

## Run locally

Because the app uses ES modules, open it through a local web server rather than `file://`.

For example, if Python 3 is installed:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in a browser from the project directory.

## Publish to GitHub Pages

1. Create or open `Jmanwit/inventory_management`.
2. Upload the **contents** of this ZIP to the repository root, so `index.html` is at the root.
3. Commit the files.
4. In GitHub, open **Settings → Pages**.
5. Choose deployment from the `main` branch and `/ (root)` (or the branch you use).
6. Save and wait for deployment.
7. Test the resulting HTTPS URL on both phones.

If the repository is a project site, the URL will usually resemble:

`https://jmanwit.github.io/inventory_management/`

Update `APP_BASE_URL` in `js/config.js` once the actual URL is known. QR codes must use stable box identifiers and the configured app route, not a database-specific URL.

## Suggested development order

1. Review this scaffold and deploy it.
2. Add a locally bundled QR-code library to `vendor/` and complete `js/qr.js`.
3. Test label sizing and QR readability.
4. Test the NIIMBOT B21S workflow; do not assume browser Bluetooth support.
5. Configure Supabase using `supabase/schema.sql`, authentication, and row-level security.
6. Replace local-only data operations with a repository/data adapter that supports cloud sync and safe ID allocation.
7. Add robust offline queueing and conflict handling.
8. Test the entire workflow on both Android phones.

See `docs/ARCHITECTURE.md`, `docs/PRINTER.md`, and `docs/TEST_PLAN.md`.

## Core design rules

- Box ID, destination, and current physical location are separate concepts.
- Save a box before printing its label.
- A printer failure must never discard the saved record.
- Existing IDs never change or get reused.
- A QR code identifies a stable box record, not its contents.
- Scanning a QR code does not itself change location.
- A user must explicitly choose and confirm relocation.
- Every saved box can be reprinted at any time.
- The application must not claim cloud synchronization until the server has confirmed it.
- Never commit secrets, private inventory exports, or privileged API keys to this public repository.

## Explicitly deferred

Purchase values, estimated current values, serial numbers, manufacturer/model records, warranties, receipts, maintenance schedules, item documents, insurance reports, and individual item QR labels are intentionally deferred until the core application is reliable.
