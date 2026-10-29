# NIIMBOT B21S Printing

## Current implementation

- Direct browser-to-printer Bluetooth printing uses the `niimbot-web-bluetooth` 2.6.0 browser driver loaded from jsDelivr. The project is open source and the B21S is not listed as a fully validated model; the user has successfully printed a 50 x 30 mm test label from its live demo using the B1 task. Treat B21S support as promising but still hardware-validation-in-progress.
- The SOB print workflow uses the B1/203 dpi protocol family with open Bluetooth discovery (`name_prefixes: []`) and a 384 x 640 px PNG, representing a 50 x 80 mm roll within the printer's approximately 48 mm printable width. The existing landscape design is rotated 90 degrees for the portrait stock/feed direction. The label is rasterized from SVG to PNG before the print button is enabled, avoiding direct SVG decoding by the printer driver.
- Copy count defaults to 1 and persists locally per browser/device. Changing +/− updates that device's future default.
- No inventory records or Supabase schema are changed by printing.

## Important test notes

1. Use Chrome/Edge/Opera/Samsung Internet on Android, over HTTPS, with Bluetooth enabled. Android may also require Location services enabled for BLE discovery.
2. On the first print, choose the B21S in the browser Bluetooth picker. The printer may need to be disconnected from the NIIMBOT app first.
3. Verify the printed label fills the 50 x 80 mm stock correctly and is not clipped or upside down. The PNG is 384 x 640 pixels at 203 dpi with a small vertical offset; adjust only after measuring an actual label.
4. Scan the printed QR from both household devices and verify it opens the exact box record.
5. Test one copy, then three copies. Confirm the browser reports success only after the driver confirms printing.
6. Test connection drop/reconnect and repeat on both household Android devices.

## Known limitations

- The upstream driver has validated other NIIMBOT models, but not the B21S specifically. The B21S test with the demo printed successfully under the B1 protocol, but the integrated 50 x 80 mm design still needs validation on real paper.
- The driver is loaded from a pinned CDN URL, so the initial app load needs internet access to retrieve it. If it fails to load, SOB shows an explicit message instead of silently opening Android's Letter-sized print dialog.
- Browser direct printing requires Web Bluetooth. Unsupported browsers cannot use this direct route.


### Label readability refinement

The handling-instruction content is rendered in a larger, heavier 27 px type size, with tighter wrapping so up to three lines remain readable. The “HANDLING INSTRUCTIONS” heading is unchanged. Service-worker cache version is bumped to v11 so deployed clients fetch the updated printing module.
