# Test Plan

## Local core workflow

- [ ] App opens without console errors.
- [ ] Create a box with destination, description, items, notes, status, and current location.
- [ ] Save occurs before the label dialog opens.
- [ ] Canceling a draft consumes no box number.
- [ ] New box IDs increment per room.
- [ ] A custom room can be created with a unique prefix.
- [ ] Duplicate room names and prefixes are rejected.
- [ ] Add a reusable physical location.
- [ ] Search by item name returns the correct box.
- [ ] Search by box ID, description, room, location, and notes works.
- [ ] Detail view clearly distinguishes destination and current location.
- [ ] Relocation requires explicit confirmation.
- [ ] Relocation updates search and location summaries.
- [ ] Editing a box preserves its ID.
- [ ] Deleting a box asks for confirmation and does not reuse its ID.
- [ ] Any existing box can open the label dialog.
- [ ] Label copy selector stays between 1 and 20.
- [ ] JSON export produces a valid file.
- [ ] JSON import warns that it replaces local data.
- [ ] Printable inventory contains box IDs, contents, destinations, and locations.

## QR and printing

- [ ] QR library is bundled locally; no CDN or external QR API is used.
- [ ] QR payload remains stable when contents/location change.
- [ ] QR code scans after printing on the actual label stock.
- [ ] Label is legible at the printer's actual resolution.
- [ ] Print quantity produces the requested number of labels.
- [ ] Printer failure does not delete the box record.
- [ ] Direct B21S printing tested on both Android phones, or fallback documented.

## Shared database (future)

- [ ] Only authorized users can access the household inventory.
- [ ] Two phones see the same records after synchronization.
- [ ] Concurrent box creation cannot duplicate a box ID.
- [ ] Failed writes are reported honestly.
- [ ] Offline edits are marked pending until accepted by the server.
- [ ] Import/restore does not silently overwrite newer records.
- [ ] RLS policies are tested using real non-owner accounts.

## PWA/offline (future)

- [ ] HTTPS deployment works.
- [ ] PWA can be installed on both Android phones.
- [ ] App shell loads after a prior online visit when offline.
- [ ] Offline limitations are clearly communicated.
- [ ] QR links work from the deployed base path.
