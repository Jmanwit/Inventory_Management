import { QRCode, QRErrorCorrectLevel } from "../vendor/qrcode.bundle.js";

export function boxQrPayload(box) {
  // Use the currently deployed base path (including GitHub Pages' repository path).
  // The payload contains only a stable record ID, never the box contents.
  const base = new URL("./", window.location.href);
  base.hash = "";
  return `${base.href}#box=${encodeURIComponent(box.id)}`;
}

export function renderQr(container, box) {
  container.replaceChildren();
  const payload = boxQrPayload(box);
  try {
    const qr = new QRCode(0, QRErrorCorrectLevel.M);
    qr.addData(payload);
    qr.make();
    const count = qr.getModuleCount();
    const quiet = 4;
    const total = count + quiet * 2;
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${total} ${total}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `QR code for box ${box.boxId}`);
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.setAttribute("class", "generated-qr");
    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("width", String(total));
    bg.setAttribute("height", String(total));
    bg.setAttribute("fill", "#fff");
    svg.append(bg);
    let path = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) path += `M${col + quiet} ${row + quiet}h1v1h-1z`;
      }
    }
    const cells = document.createElementNS(ns, "path");
    cells.setAttribute("d", path);
    cells.setAttribute("fill", "#142c22");
    svg.append(cells);
    container.append(svg);
    container.setAttribute("data-qr-payload", payload);
    container.setAttribute("data-qr-status", "generated");
    return true;
  } catch (error) {
    const note = document.createElement("div");
    note.className = "qr-unavailable";
    note.textContent = "QR code could not be generated. Try again or check the box ID.";
    container.append(note);
    container.setAttribute("data-qr-status", "error");
    console.error("QR generation failed", error);
    return false;
  }
}
