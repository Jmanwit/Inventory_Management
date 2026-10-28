# NIIMBOT B21S Printing Investigation

## Target

NIIMBOT B21S, thermal, 203 DPI, nominal maximum print width around 48 mm. Confirm the exact roll dimensions before finalizing label CSS.

## Current status

The starter only offers the browser print dialog. Direct Bluetooth printing is not implemented or verified. QR rendering is also awaiting a bundled local QR library.

## Test sequence

1. Identify the exact label-roll dimensions and printable width.
2. Print a calibration label from a browser and measure it.
3. Bundle a QR library locally and confirm printed QR scans from both phones.
4. Test a simple label from the NIIMBOT Android app.
5. Investigate whether the B21S exposes a supported browser Bluetooth interface and whether the printer protocol is compatible.
6. Test repeated prints without reselecting the printer.
7. Test disconnect/reconnect and retry behavior.
8. Test the same workflow from the S23 Ultra and S25 Ultra.
9. Document a fallback if direct printing is not reliable.

Do not claim direct Bluetooth support until tested on the actual hardware. A generic Bluetooth printer listing does not prove protocol compatibility.
