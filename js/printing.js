import { renderQr } from "./qr.js";
import { MAX_LABEL_COPIES } from "./config.js";

const QUANTITY_KEY = "sob:label-print-quantity:v1";
const PRINTER_MODEL = {
  // Open discovery: B21S may advertise a name that is not in the demo's tested list.
  // The driver auto-identifies known models and does not reject unregistered IDs.
  name_prefixes: [],
  task: "b1",
  dpi: 203,
  density: 3,
  label_type: 1,
  speed: 1
};
// B21S printhead is 384 px wide at 203 dpi. The 80 mm feed direction is 640 px.
// The current horizontal SOB label is rotated 90° to fit the 50 x 80 mm stock.
const LABEL_SIZE = { w_px: 384, h_px: 640, offset_y_px: 4 };

let currentBox = null;
let preparedImageUrl = null;
let preparationToken = 0;
let quantity = readQuantity();
let printing = false;

function readQuantity() {
  try {
    const stored = Number(localStorage.getItem(QUANTITY_KEY));
    if (Number.isInteger(stored) && stored >= 1 && stored <= MAX_LABEL_COPIES) return stored;
  } catch (_) {}
  return 1;
}
function saveQuantity() {
  try { localStorage.setItem(QUANTITY_KEY, String(quantity)); } catch (_) {}
}

export function setupPrinting({ host, quantityOutput, minusButton, plusButton, printButton, onToast }) {
  const status = document.getElementById("print-status");
  function updateQuantity() {
    quantityOutput.value = String(quantity);
    quantityOutput.textContent = String(quantity);
    printButton.textContent = `PRINT ${quantity} LABEL${quantity === 1 ? "" : "S"}`;
    minusButton.disabled = quantity <= 1 || printing;
    plusButton.disabled = quantity >= MAX_LABEL_COPIES || printing;
    printButton.disabled = printing || !preparedImageUrl;
  }
  minusButton.addEventListener("click", () => {
    quantity = Math.max(1, quantity - 1); saveQuantity(); updateQuantity();
  });
  plusButton.addEventListener("click", () => {
    quantity = Math.min(MAX_LABEL_COPIES, quantity + 1); saveQuantity(); updateQuantity();
  });
  printButton.addEventListener("click", async () => {
    if (!currentBox || printing) return;
    if (!window.Niimbot || typeof window.Niimbot.printImage !== "function") {
      const message = "Direct printer driver did not load. Check your internet connection, then reload Shack Out Back.";
      if (status) status.textContent = message;
      onToast?.(message);
      return;
    }
    if (!window.Niimbot.isSupported()) {
      const message = "Direct Bluetooth printing requires Chrome, Edge, Opera, or Samsung Internet on a supported device.";
      if (status) status.textContent = message;
      onToast?.(message);
      return;
    }
    if (!preparedImageUrl) {
      if (status) status.textContent = "The label image is still being prepared. Please wait a moment and try again.";
      return;
    }
    printing = true;
    updateQuantity();
    if (status) status.textContent = "Connecting to NIIMBOT printer and sending label… Keep this screen open.";
    try {
      // The PNG is prepared before this click, so Web Bluetooth's chooser is invoked
      // directly within the user's gesture. Keep the URL alive for repeat prints.
      const printPromise = window.Niimbot.printImage(preparedImageUrl, {
        model: PRINTER_MODEL,
        size: LABEL_SIZE,
        copies: quantity,
        density: 3
      });
      await printPromise;
      const printedQuantity = quantity;
      if (status) status.textContent = `Printer confirmed ${printedQuantity} label${printedQuantity === 1 ? "" : "s"}.`;
      onToast?.(`Sent ${printedQuantity} label${printedQuantity === 1 ? "" : "s"} to the NIIMBOT printer.`);
    } catch (error) {
      console.error("NIIMBOT direct print failed", error);
      const message = error?.message || "Could not print to the NIIMBOT printer.";
      if (status) status.textContent = `Printing failed: ${message}`;
      onToast?.(`Printing failed: ${message}`);
    } finally {
      printing = false;
      updateQuantity();
    }
  });
  updateQuantity();

  function show(box) {
    currentBox = box;
    const token = ++preparationToken;
    if (preparedImageUrl) URL.revokeObjectURL(preparedImageUrl);
    preparedImageUrl = null;
    host.replaceChildren();
    host.append(makeLabel(box, true));
    if (status) status.textContent = "Preparing the label image for the printer…";
    updateQuantity();
    preparePrintImageUrl(box).then(imageUrl => {
      if (token !== preparationToken || currentBox !== box) {
        URL.revokeObjectURL(imageUrl);
        return;
      }
      preparedImageUrl = imageUrl;
      if (status) status.textContent = "Label ready. Tap Print Label; choose the B21S if the Bluetooth picker appears.";
      updateQuantity();
    }).catch(error => {
      console.error("Could not prepare NIIMBOT label image", error);
      if (token !== preparationToken) return;
      if (status) status.textContent = `Could not prepare label image: ${error?.message || "image conversion failed"}`;
      updateQuantity();
    });
  }
  return { show };
}

function makeLabel(box, preview = false) {
  const paper = document.createElement("div");
  paper.className = "label-paper";
  const qr = document.createElement("div");
  qr.className = "label-qr";
  renderQr(qr, box);
  const copy = document.createElement("div");
  copy.className = "label-copy";
  const id = document.createElement("div"); id.className = "label-id"; id.textContent = box.boxId;
  const room = document.createElement("div"); room.className = "label-room"; room.textContent = box.destination;
  const desc = document.createElement("div"); desc.className = "label-desc"; desc.textContent = box.description;
  const handling = document.createElement("div"); handling.className = "label-handling";
  const handlingTitle = document.createElement("div"); handlingTitle.className = "label-handling-title"; handlingTitle.textContent = "HANDLING INSTRUCTIONS";
  const handlingText = document.createElement("div"); handlingText.className = "label-handling-text";
  const handlingLines = [...new Set([...(box.handlingInstructions || []), ...(box.notes || "").split(/\r?\n/).map(v => v.trim()).filter(Boolean)])];
  handlingText.textContent = handlingLines.join(" · ") || "NO SPECIAL HANDLING";
  handling.append(handlingTitle, handlingText);
  copy.append(id, room, desc, handling);
  paper.append(qr, copy);
  if (preview) {
    const wrap = document.createElement("div"); wrap.className = "label-preview"; wrap.append(paper); return wrap;
  }
  return paper;
}

function xmlEscape(value) {
  return String(value ?? "").replace(/[&<>\"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
}
function splitLines(value, maxChars) {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= maxChars) line += " " + word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function makePrintSvgUrl(box) {
  const qrHost = document.createElement("div");
  if (!renderQr(qrHost, box)) throw new Error("Could not generate the box QR code.");
  const qrSvg = qrHost.querySelector("svg");
  if (!qrSvg) throw new Error("QR code renderer did not produce an image.");
  const qrViewBox = qrSvg.getAttribute("viewBox") || "0 0 33 33";
  const ns = "http://www.w3.org/2000/svg";
  const parts = [];
  // Layout is authored as a landscape label (80 x 48 mm), then rotated to the
  // printer's 50 mm head width x 80 mm feed direction. This preserves the familiar design.
  parts.push(`<svg xmlns="${ns}" width="384" height="640" viewBox="0 0 384 640"><rect width="384" height="640" fill="#fff"/><g transform="translate(384 0) rotate(90)">`);
  parts.push('<rect x="3" y="3" width="634" height="378" fill="#fff" stroke="#d0d0d0" stroke-width="2"/>');
  parts.push(`<svg x="22" y="70" width="230" height="230" viewBox="${qrViewBox}" shape-rendering="crispEdges">${qrSvg.innerHTML}</svg>`);
  const x = 280;
  parts.push(`<text x="${x}" y="88" font-family="Arial,Helvetica,sans-serif" font-size="47" font-weight="900" fill="#000">${xmlEscape(box.boxId)}</text>`);
  parts.push(`<text x="${x}" y="137" font-family="Arial,Helvetica,sans-serif" font-size="32" font-weight="700" fill="#000">${xmlEscape(box.destination)}</text>`);
  const descLines = splitLines(box.description, 25).slice(0, 2);
  descLines.forEach((line, i) => parts.push(`<text x="${x}" y="${190 + i * 31}" font-family="Arial,Helvetica,sans-serif" font-size="25" fill="#000">${xmlEscape(line)}</text>`));
  const ruleY = 224 + Math.max(0, descLines.length - 1) * 31;
  parts.push(`<line x1="${x}" y1="${ruleY}" x2="620" y2="${ruleY}" stroke="#222" stroke-width="3"/>`);
  parts.push(`<text x="${x}" y="${ruleY + 34}" font-family="Arial,Helvetica,sans-serif" font-size="18" font-weight="900" letter-spacing="1.5" fill="#000">HANDLING INSTRUCTIONS</text>`);
  const handlingLines = [...new Set([...(box.handlingInstructions || []), ...(box.notes || "").split(/\r?\n/).map(v => v.trim()).filter(Boolean)])];
  const handlingText = handlingLines.join(" · ") || "NO SPECIAL HANDLING";
  splitLines(handlingText.toUpperCase(), 27).slice(0, 3).forEach((line, i) => parts.push(`<text x="${x}" y="${ruleY + 72 + i * 25}" font-family="Arial,Helvetica,sans-serif" font-size="21" font-weight="900" fill="#000">${xmlEscape(line)}</text>`));
  parts.push('</g></svg>');
  const blob = new Blob([parts.join("")], { type: "image/svg+xml;charset=utf-8" });
  return URL.createObjectURL(blob);
}

// The NIIMBOT driver decodes its source image as a bitmap. Android Chrome can
// display our SVG preview but some image decoders reject SVG blobs directly, so
// rasterize it to a real PNG before the user presses Print.
async function preparePrintImageUrl(box) {
  const svgUrl = makePrintSvgUrl(box);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = svgUrl;
    if (typeof image.decode === "function") await image.decode();
    else await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("The label artwork could not be rendered."));
    });

    const canvas = document.createElement("canvas");
    canvas.width = LABEL_SIZE.w_px;
    canvas.height = LABEL_SIZE.h_px;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pngBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The browser could not encode the label as PNG.")), "image/png");
    });
    if (pngBlob.type !== "image/png") throw new Error("The browser did not create a PNG image.");
    return URL.createObjectURL(pngBlob);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
