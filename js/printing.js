import { renderQr } from "./qr.js";
import { MAX_LABEL_COPIES } from "./config.js";

let currentBox = null;
let quantity = 1;

export function setupPrinting({ host, quantityOutput, minusButton, plusButton, printButton, onToast }) {
  function updateQuantity() {
    quantityOutput.value = String(quantity);
    quantityOutput.textContent = String(quantity);
    printButton.textContent = `PRINT ${quantity} LABEL${quantity === 1 ? "" : "S"}`;
    minusButton.disabled = quantity <= 1;
    plusButton.disabled = quantity >= MAX_LABEL_COPIES;
  }
  minusButton.addEventListener("click", () => { quantity = Math.max(1, quantity - 1); updateQuantity(); });
  plusButton.addEventListener("click", () => { quantity = Math.min(MAX_LABEL_COPIES, quantity + 1); updateQuantity(); });
  printButton.addEventListener("click", () => {
    if (!currentBox) return;
    const root = document.getElementById("print-root") || document.createElement("div");
    root.id = "print-root";
    root.className = "print-labels";
    root.replaceChildren();
    for (let i = 0; i < quantity; i++) {
      const label = document.createElement("div");
      label.className = "print-label";
      const paper = makeLabel(currentBox);
      label.append(paper);
      root.append(label);
    }
    if (!root.isConnected) document.body.append(root);
    window.print();
    onToast?.("Print dialog opened. Verify label size and QR library before production use.");
  });
  updateQuantity();

  function show(box) {
    currentBox = box;
    quantity = 1;
    host.replaceChildren();
    host.append(makeLabel(box, true));
    updateQuantity();
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
  copy.append(id, room, desc);
  paper.append(qr, copy);
  if (preview) {
    const wrap = document.createElement("div"); wrap.className = "label-preview"; wrap.append(paper); return wrap;
  }
  return paper;
}
