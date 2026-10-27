/*
 * QR adapter.
 *
 * This module intentionally does not fetch a QR library from a CDN.
 * Before relying on labels, bundle a vetted QR-code implementation in
 * vendor/ and adapt this function to it. The project specification requires
 * local generation and forbids external QR APIs/CDNs at runtime.
 */
import { APP_BASE_URL } from "./config.js";

export function boxQrPayload(box) {
  const base = APP_BASE_URL || new URL("../", import.meta.url).href;
  const route = `#box=${encodeURIComponent(box.id)}`;
  return `${base.replace(/#.*$/, "").replace(/\/?$/, "/")}${route}`;
}

export function renderQr(container, box) {
  container.replaceChildren();
  const note = document.createElement("div");
  note.className = "qr-unavailable";
  note.textContent = "QR library not bundled yet";
  container.append(note);
  container.setAttribute("data-qr-payload", boxQrPayload(box));
  return false;
}
