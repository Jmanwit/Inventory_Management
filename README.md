# Shack Out Back

**A household moving-box inventory for recording what is packed, where
it belongs, where it is now, and how it must be handled.**

Shack Out Back is a mobile-first web app being developed for use during
household packing and moving. It is hosted from the
`Jmanwit/inventory_management` GitHub repository using GitHub Pages.

> **Current status:** Working prototype, version 0.2-era workflow
> milestone. QR generation, label preview, QR-to-box navigation, box
> records, reusable handling instructions, one-off handling notes, and
> in-form room creation have been tested on real devices. Shared
> synchronization, an in-app QR scanner, and direct NIIMBOT Bluetooth
> printing are not implemented yet.

## Project goals

-   Make creating and finding box records quick while packing.
-   Give every box a stable ID and QR code.
-   Make labels useful without requiring a scan.
-   Keep destination room separate from current physical location.
-   Make common handling instructions selectable with a tap.
-   Allow rooms and physical locations to be added without leaving the
    box form.
-   Keep the project portable, understandable, and free of required
    runtime QR-generation services.
-   Eventually support shared inventory access from multiple household
    devices and useful offline operation.

## Current functionality

### Box records

The app supports creating, viewing, editing, searching, relocating, and
deleting box records. A record includes a stable internal record ID,
human-readable box ID, destination room, current physical location,
description, contents, notes/handling information, packing status, and
timestamps as supported by the current implementation.

The human-readable ID uses a room prefix and sequence, for example
`KIT-001`. Existing box IDs should not be changed when a room is renamed
or a box is edited. The internal record ID is the stable identity used
by the QR code.

### Destination and current location

These are different concepts:

-   **Destination room:** where the box ultimately belongs.
-   **Current location:** where the box physically is right now.

For example, a box destined for the Workshop may move from Garage to
Moving Truck and then to Workshop. Relocation is an explicit action;
scanning a QR code does not itself move the box.

### Handling instructions

The New Box workflow includes tap-to-select common handling
instructions, including options such as Fragile, Keep Upright, Heavy,
and Do Not Stack. Selected instructions are shown prominently on the
label.

Custom instructions can be entered as one-off text or saved for reuse.
Testing confirmed that a custom instruction saved for reuse (for
example, "Stinky") was available on a subsequent box, while an
instruction entered as one-off text (for example, "Obese") did not
become a reusable option.

The general notes/handling information is also visible on the box detail
view.

### Rooms and locations

Rooms and physical locations can be added from the box-creation workflow
rather than requiring the user to leave the form and visit the
management tab. A newly created destination room can have a custom ID
prefix and becomes available for later boxes. Room and location
management remains available in its dedicated area as well.

### QR codes and labels

The app generates QR codes locally using a bundled QR library. A QR code
encodes a stable reference to the box record, not the box contents, so
editing the description, contents, destination, or location should not
change the box's identity.

The QR URL accounts for the GitHub Pages project path:

`https://jmanwit.github.io/inventory_management/`

The label preview includes: - Human-readable box ID - QR code -
Destination room - Brief description - Handling instructions

The QR code was tested by displaying the label preview on the S23 Ultra,
photographing it with a tablet, and scanning the photograph with the
phone camera. The link opened the specific box record on the same device
where that record existed.

### Search, export, and printing

The current prototype includes inventory search, JSON export/import
functionality as implemented, a printable label preview, label-copy
quantity selection, and browser-based printing. Confirm the current UI
and export contents before relying on any backup or restore for critical
data.

## Important limitations

These are known limitations, not promised features:

1.  **Local-only records:** Inventory records are stored in the browser
    on the device. The S23 Ultra and the wife's S25 Ultra do not yet
    share a live inventory.
2.  **No in-app QR scanner yet:** At present, use the phone camera or
    another QR reader to scan a label. A dedicated Scan Box camera view
    is planned.
3.  **No direct NIIMBOT B21S printing:** Label printing currently uses
    the browser's print dialog. Direct Bluetooth printing has not been
    implemented or verified.
4.  **Offline support is limited:** The service worker provides
    starter-level app-shell caching. Reliable offline record access,
    queued edits, synchronization, and conflict handling are not
    complete.
5.  **Prototype, not production-hardened:** Test changes with disposable
    records and keep backups. Do not rely on the app as the only copy of
    important inventory information.
6.  **Public hosting:** The GitHub repository and published site are
    public. Do not store sensitive personal information in the
    repository. Box data is currently local to each browser, but anyone
    with access to that device/browser profile may be able to access it.

## Repository layout

``` text
inventory_management/
├── index.html
├── README.md
├── manifest.webmanifest
├── service-worker.js
├── .nojekyll
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── config.js
│   ├── store.js
│   ├── search.js
│   ├── qr.js
│   ├── printing.js
│   └── exports.js
├── vendor/
│   ├── README.md
│   └── [locally bundled third-party libraries]
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRINTER.md
│   ├── TEST_PLAN.md
│   └── RELEASE_NOTES.md
└── supabase/
    └── schema.sql
```

The precise set of files may evolve. `vendor/` is reserved for
third-party libraries that are bundled locally so the app does not have
to fetch them from a third-party CDN at runtime.

## Run and publish

The current app is a static web application.

-   The main page is `index.html` at the repository root.
-   CSS lives under `css/`.
-   Application JavaScript lives under `js/`.
-   Third-party libraries belong under `vendor/`.
-   The service worker stays at the repository root so it can control
    the app's other directories.
-   GitHub Pages should publish from the `main` branch and `/(root)`.

Published URL:

`https://jmanwit.github.io/inventory_management/`

After committing changes, wait for GitHub Pages to finish deployment. If
an old version appears, reload the page and consider the browser's
cached site data/service-worker cache; avoid clearing site data while
relying on locally stored inventory records unless they have been
exported first.

## Backups and data portability

Keep separate backups of **the code** and **the inventory data**:

-   **Code backup:** In GitHub, use **Code → Download ZIP** to download
    a snapshot of the repository.
-   **Inventory backup:** Use the app's Export function and save the
    resulting JSON file.

A repository ZIP does not include records stored in browser local
storage. Conversely, an inventory JSON export does not include the
application source code. Do not clear browser storage or site data
before exporting records you need to preserve.

Import/restore behavior should be tested with a disposable backup before
using it to restore important records.

## Development roadmap

The current agreed order is:

1.  **Completed:** Core box inventory, QR generation, label preview, QR
    URL routing to the correct local record, quick-select handling
    instructions, reusable and one-off custom instructions, and adding
    rooms/locations from the box workflow.
2.  **Next:** Build an in-app QR scanner with rear-camera preference,
    camera permission handling, duplicate-scan prevention, clear
    handling of unknown box IDs, and a flashlight option where
    supported.
3.  **After scanner:** Shared inventory synchronization between
    household devices, with authentication, database access controls,
    safe box-ID allocation, and conflict handling.
4.  **Later:** Stronger offline data access and sync, reliable
    backup/restore, standalone searchable HTML inventory export, and
    direct NIIMBOT B21S Bluetooth printing investigation/implementation.

Future possibilities such as item-level records, photographs/documents,
receipts, warranties, purchase/current values, serial numbers, and
insurance reports are deliberately deferred until the core moving
workflow is dependable.

## Working principles

-   Preserve the last known working version before significant changes.
-   Make incremental updates and test them on the published GitHub Pages
    site.
-   Never claim a feature is complete until it has been tested.
-   Keep the QR identity stable when box details change.
-   Never silently renumber existing boxes.
-   Scanning must not silently relocate a box.
-   Keep handling instructions readable on the physical label.
-   Be clear about local-only storage, offline status, and
    unsynchronized data.
-   Prefer local dependencies and portable exports over unnecessary
    external services.

## Current test baseline

As of **2026-10-27**, the following workflow was tested on the published
site using an S23 Ultra and a tablet:

-   Create and save boxes.
-   Generate a QR code in the label preview.
-   Photograph the QR on the phone screen using the tablet.
-   Scan the photograph with the phone camera and open the matching box
    record.
-   Display the box ID, destination, description, and handling
    instructions on the label.
-   Select multiple handling presets and deselect a preset.
-   Enter a one-off handling instruction that does not become a reusable
    option.
-   Save a custom instruction for reuse and select it on a subsequent
    box.
-   Add a room with a custom prefix from the box workflow and see it
    available afterward.

This is a tested prototype baseline, not a production release. Save a
GitHub repository ZIP and export the inventory JSON before beginning the
next major change.
