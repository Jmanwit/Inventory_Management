import { store, signIn, signUp, signOut, currentUser, authChanges, refreshInventory } from "./store.js";
import { searchBoxes } from "./search.js";
import { setupPrinting } from "./printing.js";
import { downloadJson, renderPrintableInventory, downloadBlob } from "./exports.js";

const $ = id => document.getElementById(id);
const state = { activeView: "inventory", detailBoxId: null, labelBoxId: null, selectedHandling: [] };
const STANDARD_HANDLING = ["Fragile", "Keep Upright", "Heavy", "Do Not Stack", "This Side Up", "Keep Dry", "Handle With Care", "Two-Person Lift", "Keep Accessible", "Sharp Objects", "Temperature Sensitive", "Do Not Crush"];
// Cloud auth initializes below; do not show local-only data before sign-in.


const labelDialog = $("label-dialog");
const printer = setupPrinting({
  host: $("label-preview-host"), quantityOutput: $("label-quantity"),
  minusButton: $("quantity-minus"), plusButton: $("quantity-plus"),
  printButton: $("print-labels"), onToast: toast
});

function toast(message) {
  const node = $("toast"); node.textContent = message; node.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 3200);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function showView(name) {
  state.activeView = name;
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  if (name === "create") resetForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function populateSelect(select, options, selectedId = null) {
  const previous = selectedId ?? select.value;
  select.replaceChildren();
  for (const item of options) {
    const option = document.createElement("option");
    option.value = item.id; option.textContent = item.name;
    select.append(option);
  }
  if (previous && options.some(item => item.id === previous)) select.value = previous;
}
function render() {
  const s = store.snapshot();
  const boxes = s.boxes;
  $("result-count").textContent = `${boxes.length} box${boxes.length === 1 ? "" : "es"}`;
  $("summary-grid").innerHTML = `
    <div class="summary-card"><strong>${s.boxes.length}</strong><span>Total boxes</span></div>
    <div class="summary-card"><strong>${s.boxes.reduce((n,b) => n + (b.items?.length || 0), 0)}</strong><span>Items cataloged</span></div>
    <div class="summary-card"><strong>${s.locations.length}</strong><span>Locations</span></div>`;
  $("box-list").replaceChildren();
  for (const box of [...boxes].sort((a,b) => b.createdAt.localeCompare(a.createdAt))) {
    const button = document.createElement("button");
    button.type = "button"; button.className = "box-card";
    button.innerHTML = `<span class="box-id-badge">${escapeHtml(box.boxId)}</span><span class="box-card-copy"><strong>${escapeHtml(box.description)}</strong><small>${escapeHtml(box.destination)} · ${box.items.length} item${box.items.length === 1 ? "" : "s"}</small><span class="location-chip">Current location: ${escapeHtml(box.currentLocation)}</span></span><span aria-hidden="true">›</span>`;
    button.addEventListener("click", () => openDetail(box.id));
    $("box-list").append(button);
  }
  $("empty-state").classList.toggle("hidden", s.boxes.length > 0);
  renderRoomsAndLocations(s);
  const ledgerName = $("settings-ledger-name");
  if (ledgerName) ledgerName.textContent = s.inventoryName || "Household Inventory";
  const ledgerId = $("settings-ledger-id");
  if (ledgerId) ledgerId.textContent = s.inventoryId || "—";
  const accountEmail = $("settings-account-email");
  if (accountEmail) accountEmail.textContent = store.user?.email || "Signed-in account";
  populateSelect($("box-room"), s.rooms.map(r => ({id:r.id,name:`${r.name} (${r.prefix})`})));
  populateSelect($("box-location"), s.locations);
  populateSelect($("relocate-location"), s.locations);
  renderHandlingOptions(s);
}
function renderHandlingOptions(s) {
  const host = $("handling-presets");
  if (!host) return;
  const all = [...new Set([...STANDARD_HANDLING, ...(s.customHandlingInstructions || [])])];
  host.replaceChildren();
  for (const instruction of all) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `handling-chip${state.selectedHandling.includes(instruction) ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(state.selectedHandling.includes(instruction)));
    button.textContent = instruction;
    button.addEventListener("click", () => {
      state.selectedHandling = state.selectedHandling.includes(instruction)
        ? state.selectedHandling.filter(v => v !== instruction)
        : [...state.selectedHandling, instruction];
      renderHandlingOptions(store.snapshot());
    });
    host.append(button);
  }
  const selected = $("selected-handling");
  selected.replaceChildren();
  if (!state.selectedHandling.length) {
    const empty = document.createElement("p"); empty.className = "muted small"; empty.textContent = "No quick instructions selected."; selected.append(empty); return;
  }
  for (const instruction of state.selectedHandling) {
    const chip = document.createElement("button"); chip.type = "button"; chip.className = "selected-handling-chip";
    chip.textContent = `× ${instruction}`; chip.setAttribute("aria-label", `Remove ${instruction}`);
    chip.addEventListener("click", () => { state.selectedHandling = state.selectedHandling.filter(v => v !== instruction); renderHandlingOptions(store.snapshot()); });
    selected.append(chip);
  }
}
function renderRoomsAndLocations(s) {
  $("room-list").replaceChildren();
  for (const room of s.rooms) {
    const row = document.createElement("div"); row.className = "settings-row";
    row.innerHTML = `<span><strong>${escapeHtml(room.name)}</strong><small>Prefix: ${escapeHtml(room.prefix)}</small></span>`;
    $("room-list").append(row);
  }
  $("location-list").replaceChildren();
  for (const loc of s.locations) {
    const count = s.boxes.filter(b => b.locationId === loc.id).length;
    const row = document.createElement("div"); row.className = "settings-row";
    row.innerHTML = `<span><strong>${escapeHtml(loc.name)}</strong><small>${count} box${count === 1 ? "" : "es"} currently here</small></span>`;
    $("location-list").append(row);
  }
}
function resetForm() {
  $("box-form").reset(); $("box-internal-id").value = ""; state.selectedHandling = [];
  $("form-title").textContent = "Create a box"; $("cancel-edit").classList.add("hidden");
  $("form-error").textContent = "";
  const s = store.snapshot();
  populateSelect($("box-room"), s.rooms.map(r => ({id:r.id,name:`${r.name} (${r.prefix})`})));
  populateSelect($("box-location"), s.locations);
}
function editBox(box) {
  showView("create");
  $("form-title").textContent = `Edit ${box.boxId}`;
  $("box-internal-id").value = box.id;
  $("box-room").value = box.roomId;
  $("box-description").value = box.description;
  $("box-location").value = box.locationId;
  $("box-status").value = box.status || "Packed";
  $("box-items").value = (box.items || []).join("\n");
  $("box-notes").value = box.notes || "";
  state.selectedHandling = Array.isArray(box.handlingInstructions) ? [...box.handlingInstructions] : [];
  renderHandlingOptions(store.snapshot());
  $("cancel-edit").classList.remove("hidden");
}
function openDetail(id) {
  const box = store.getBox(id); if (!box) return;
  state.detailBoxId = id;
  const dialog = $("detail-dialog");
  $("detail-content").innerHTML = `
    <div class="dialog-inner">
      <div class="dialog-head"><div><p class="eyebrow">${escapeHtml(box.boxId)}</p><h2>${escapeHtml(box.description)}</h2><p class="muted">Destination: ${escapeHtml(box.destination)}</p></div><button class="icon-button" data-close-dialog="detail-dialog" type="button" aria-label="Close">×</button></div>
      <div class="detail-meta">
        <div class="meta-card"><span>DESTINATION</span><strong>${escapeHtml(box.destination)}</strong></div>
        <div class="meta-card"><span>CURRENT LOCATION</span><strong>${escapeHtml(box.currentLocation)}</strong></div>
        <div class="meta-card"><span>STATUS</span><strong>${escapeHtml(box.status)}</strong></div>
        <div class="meta-card"><span>LAST UPDATED</span><strong>${new Date(box.updatedAt).toLocaleString()}</strong></div>
      </div>
      <div class="detail-section"><h3>Contents (${box.items.length})</h3>${box.items.length ? `<ul class="item-list">${box.items.map(i=>`<li>${escapeHtml(i)}</li>`).join("")}</ul>` : '<p class="muted">No individual contents recorded.</p>'}</div>
      <div class="detail-section"><h3>Handling instructions</h3>${(box.handlingInstructions || []).length ? `<p class="detail-handling-tags">${box.handlingInstructions.map(i=>`<span>${escapeHtml(i)}</span>`).join("")}</p>` : ""}<p>${escapeHtml(box.notes || "No additional notes.")}</p></div>
      <div class="detail-actions">
        <button class="button button-primary" data-relocate="${escapeHtml(box.id)}" type="button">Relocate Box</button>
        <button class="button button-secondary" data-reprint="${escapeHtml(box.id)}" type="button">Reprint Label</button>
        <button class="button button-secondary" data-edit="${escapeHtml(box.id)}" type="button">Edit Box</button>
        <button class="button button-secondary danger-button" data-delete="${escapeHtml(box.id)}" type="button">Delete Box</button>
      </div>
      <p class="help-text">QR code identifies this box by its stable record ID. Scanning opens this record on this device when it exists in local inventory.</p>
    </div>`;
  dialog.showModal();
}
function openRelocate(id) {
  const box = store.getBox(id); if (!box) return;
  $("relocate-box-label").textContent = `${box.boxId} — ${box.description}. Current location: ${box.currentLocation}`;
  $("relocate-location").value = box.locationId;
  $("relocate-new-location").value = "";
  $("relocate-error").textContent = "";
  $("relocate-dialog").dataset.boxId = id;
  $("detail-dialog").close();
  $("relocate-dialog").showModal();
}
function openLabel(id) {
  const box = store.getBox(id); if (!box) return;
  state.labelBoxId = id; printer.show(box); labelDialog.showModal();
}
function setFieldError(id, message) { $(id).textContent = message; }
document.addEventListener("click", async event => {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.view) showView(target.dataset.view);
  if (target.dataset.action === "new-box") showView("create");
  if (target.dataset.closeDialog) $(target.dataset.closeDialog).close();
  if (target.dataset.relocate) openRelocate(target.dataset.relocate);
  if (target.dataset.reprint) openLabel(target.dataset.reprint);
  if (target.dataset.edit) { const box = store.getBox(target.dataset.edit); $("detail-dialog").close(); if (box) editBox(box); }
  if (target.dataset.delete) {
    const box = store.getBox(target.dataset.delete);
    if (box && confirm(`Permanently delete ${box.boxId} — ${box.description}?\n\nIts ID will not be reused.`)) {
      await store.deleteBox(box.id); $("detail-dialog").close(); render(); toast(`${box.boxId} deleted. Its ID will not be reused.`);
    }
  }
});
function highlightMatch(value, query) {
  const text = String(value ?? "");
  const q = query.trim();
  if (!q) return escapeHtml(text);
  const lower = text.toLocaleLowerCase();
  const needle = q.toLocaleLowerCase();
  let result = "", from = 0, index;
  while ((index = lower.indexOf(needle, from)) !== -1) {
    result += escapeHtml(text.slice(from, index));
    result += `<mark class="search-highlight">${escapeHtml(text.slice(index, index + q.length))}</mark>`;
    from = index + q.length;
  }
  return result + escapeHtml(text.slice(from));
}

function openSearchResults(query) {
  const q = query.trim();
  if (!q) { toast("Enter an item, box name, ID, room, or location to search."); $("search-input").focus(); return; }
  const matches = searchBoxes(store.snapshot().boxes, q).sort((a, b) => a.boxId.localeCompare(b.boxId, undefined, { numeric: true }));
  $("search-results-title").textContent = `Results for “${q}”`;
  $("search-results-summary").textContent = `${matches.length} matching box${matches.length === 1 ? "" : "es"}. Choose a box to view its full record.`;
  const host = $("search-results-list"); host.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement("div"); empty.className = "search-no-results";
    empty.innerHTML = `<h3>No matching boxes</h3><p>Nothing matched <strong>${escapeHtml(q)}</strong>. Try a shorter term or a different spelling.</p>`;
    host.append(empty);
  }
  for (const box of matches) {
    const button = document.createElement("button"); button.type = "button"; button.className = "search-result-card";
    const matchingItems = (box.items || []).filter(item => item.toLocaleLowerCase().includes(q.toLocaleLowerCase()));
    const matchingFields = [];
    if (box.description.toLocaleLowerCase().includes(q.toLocaleLowerCase())) matchingFields.push(`<p class="search-match-line"><span>BOX NAME</span> ${highlightMatch(box.description, q)}</p>`);
    if (matchingItems.length) matchingFields.push(`<p class="search-match-line"><span>MATCHING CONTENT${matchingItems.length === 1 ? "" : "S"}</span> ${matchingItems.map(item => highlightMatch(item, q)).join(" · ")}</p>`);
    if (box.boxId.toLocaleLowerCase().includes(q.toLocaleLowerCase())) matchingFields.push(`<p class="search-match-line"><span>BOX ID</span> ${highlightMatch(box.boxId, q)}</p>`);
    if (box.destination.toLocaleLowerCase().includes(q.toLocaleLowerCase())) matchingFields.push(`<p class="search-match-line"><span>DESTINATION</span> ${highlightMatch(box.destination, q)}</p>`);
    if (box.currentLocation.toLocaleLowerCase().includes(q.toLocaleLowerCase())) matchingFields.push(`<p class="search-match-line"><span>CURRENT LOCATION</span> ${highlightMatch(box.currentLocation, q)}</p>`);
    if (!matchingFields.length) matchingFields.push(`<p class="search-match-line">Contains “${escapeHtml(q)}” in notes or other box details.</p>`);
    button.innerHTML = `<span class="box-id-badge">${escapeHtml(box.boxId)}</span><span class="search-result-copy"><strong>${highlightMatch(box.description, q)}</strong><small>${escapeHtml(box.destination)} · ${box.items.length} item${box.items.length === 1 ? "" : "s"}</small>${matchingFields.join("")}<span class="location-chip">Current location: ${escapeHtml(box.currentLocation)}</span></span><span class="search-result-arrow" aria-hidden="true">›</span>`;
    button.addEventListener("click", () => { $("search-results-dialog").close(); openDetail(box.id); });
    host.append(button);
  }
  $("search-results-dialog").showModal();
}

$("search-form").addEventListener("submit", event => { event.preventDefault(); openSearchResults($("search-input").value); });
$("search-results-close").addEventListener("click", () => $("search-results-dialog").close());
$("search-results-dialog").addEventListener("close", () => { if (state.activeView === "inventory") $("search-input").focus({ preventScroll: true }); });
$("box-form").addEventListener("submit", async event => {
  event.preventDefault(); setFieldError("form-error", "");
  try {
    const input = {
      id: $("box-internal-id").value || null,
      roomId: $("box-room").value, locationId: $("box-location").value,
      description: $("box-description").value,
      items: $("box-items").value.split(/\r?\n/),
      notes: $("box-notes").value, status: $("box-status").value,
      handlingInstructions: [...state.selectedHandling]
    };
    const isNew = !input.id;
    const box = await store.saveBox(input);
    render(); showView("inventory"); toast(`${box.boxId} saved.`);
    if (isNew) openLabel(box.id);
    else openDetail(box.id);
  } catch (error) { setFieldError("form-error", error.message); }
});
$("cancel-edit").addEventListener("click", () => { resetForm(); showView("inventory"); });
$("quick-add-room").addEventListener("click", async () => {
  setFieldError("quick-room-error", "");
  try {
    const name = $("quick-room-name").value;
    const prefix = $("quick-room-prefix").value;
    await store.addRoom(name, prefix);
    const room = store.rooms().find(r => r.name.toLowerCase() === name.trim().toLowerCase());
    render(); if (room) $("box-room").value = room.id;
    $("quick-room-name").value = ""; $("quick-room-prefix").value = "";
    $("quick-room-name").closest("details").open = false;
    toast(`Room ${room?.name || name} added and selected.`);
  } catch (error) { setFieldError("quick-room-error", error.message); }
});
$("quick-add-location").addEventListener("click", async () => {
  setFieldError("quick-location-error", "");
  try {
    const name = $("quick-location-name").value;
    const location = await store.addLocation(name);
    render(); $("box-location").value = location.id;
    $("quick-location-name").value = "";
    $("quick-location-name").closest("details").open = false;
    toast(`Location ${location.name} added and selected.`);
  } catch (error) { setFieldError("quick-location-error", error.message); }
});
$("add-custom-instruction").addEventListener("click", async () => {
  setFieldError("handling-error", "");
  const value = $("custom-instruction-text").value.trim();
  if (!value) { setFieldError("handling-error", "Type an instruction first."); return; }
  try {
    let instruction = value;
    if ($("save-custom-instruction").checked) instruction = await store.addHandlingInstruction(value);
    if (!state.selectedHandling.some(v => v.toLowerCase() === instruction.toLowerCase())) state.selectedHandling.push(instruction);
    $("custom-instruction-text").value = "";
    renderHandlingOptions(store.snapshot());
    toast($("save-custom-instruction").checked ? "Instruction saved for reuse and selected." : "One-off instruction selected.");
  } catch (error) { setFieldError("handling-error", error.message); }
});
$("room-form").addEventListener("submit", async event => {
  event.preventDefault(); setFieldError("room-error", "");
  try {
    await store.addRoom($("new-room-name").value, $("new-room-prefix").value);
    $("room-form").reset(); render(); toast("Room added.");
  } catch (error) { setFieldError("room-error", error.message); }
});
$("location-form").addEventListener("submit", async event => {
  event.preventDefault(); setFieldError("location-error", "");
  try {
    await store.addLocation($("new-location-name").value);
    $("location-form").reset(); render(); toast("Location added.");
  } catch (error) { setFieldError("location-error", error.message); }
});
$("relocate-form").addEventListener("submit", async event => {
  event.preventDefault(); setFieldError("relocate-error", "");
  try {
    const typed = $("relocate-new-location").value.trim();
    const chosen = $("relocate-location").selectedOptions[0]?.textContent || "";
    const destination = typed || chosen;
    const result = await store.relocateBox($("relocate-dialog").dataset.boxId, destination);
    $("relocate-dialog").close(); render();
    toast(`${result.box.boxId} relocated: ${result.previousLocation} → ${result.box.currentLocation}`);
  } catch (error) { setFieldError("relocate-error", error.message); }
});
$("menu-export").addEventListener("click", () => {
  const choice = prompt("Type EXPORT to download a JSON backup, PRINT to print the inventory, or IMPORT to restore a JSON backup.");
  if (!choice) return;
  if (choice.toUpperCase() === "EXPORT") downloadJson(store.exportData());
  else if (choice.toUpperCase() === "PRINT") {
    const root = renderPrintableInventory(store.snapshot());
    document.getElementById("print-root")?.remove(); document.body.append(root); window.print(); root.remove();
  } else if (choice.toUpperCase() === "IMPORT") { $("import-error").textContent = ""; $("import-dialog").showModal(); }
});
$("import-form").addEventListener("submit", async event => {
  event.preventDefault(); setFieldError("import-error", "");
  try {
    const file = $("import-file").files[0]; if (!file) throw new Error("Choose a JSON file.");
    const parsed = JSON.parse(await file.text());
    if (!confirm("Cloud restore is not enabled in this first sync build. The file will NOT be imported. Continue to see the current restore status?")) return;
    await store.importReplace(parsed);
  } catch (error) { setFieldError("import-error", error.message); }
});
document.addEventListener("change", event => {
  if (event.target.matches("#box-room")) {
    const room = store.rooms().find(r => r.id === event.target.value);
    if (room && !$("box-description").value) $("box-description").placeholder = `e.g. ${room.name} supplies`;
  }
});

// In-app QR scanning uses the browser's native BarcodeDetector API. This keeps
// the scanner local/offline-capable without loading camera or QR services from a CDN.
const scannerDialog = $("scanner-dialog");
const scannerVideo = $("scanner-video");
const scannerStatus = $("scanner-status");
let scannerStream = null;
let scannerFrame = null;
let scannerRunning = false;
let scannerDetector = null;

function stopScanner() {
  scannerRunning = false;
  if (scannerFrame !== null) cancelAnimationFrame(scannerFrame);
  scannerFrame = null;
  if (scannerStream) scannerStream.getTracks().forEach(track => track.stop());
  scannerStream = null;
  if (scannerVideo) scannerVideo.srcObject = null;
}
function scannedBoxId(rawValue) {
  try {
    const parsed = new URL(rawValue, window.location.href);
    const match = parsed.hash.match(/(?:^#|[&#])box=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {}
  // Also accept a bare stable UUID if a future label format uses one.
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(rawValue).trim())) return String(rawValue).trim();
  return null;
}
async function handleScannedValue(rawValue) {
  const id = scannedBoxId(rawValue);
  if (!id) {
    scannerStatus.textContent = "That QR code isn't a Shack Out Back box label. Keep scanning or try another code.";
    return false;
  }
  stopScanner();
  scannerStatus.textContent = "QR recognized. Looking up the box in your shared inventory…";
  try {
    await refreshInventory();
    const box = store.getBox(id);
    scannerDialog.close();
    if (!box) {
      toast("That box wasn't found in the current shared inventory.");
      return true;
    }
    showView("inventory");
    openDetail(box.id);
    toast(`Found ${box.boxId}.`);
  } catch (error) {
    scannerStatus.textContent = `Couldn't look up this box: ${error.message}`;
    if (!scannerDialog.open) scannerDialog.showModal();
  }
  return true;
}
async function scanFrame() {
  if (!scannerRunning || !scannerDetector || !scannerVideo) return;
  try {
    if (scannerVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const codes = await scannerDetector.detect(scannerVideo);
      if (codes.length) {
        const found = await handleScannedValue(codes[0].rawValue);
        if (found) return;
      }
    }
  } catch (error) {
    console.warn("QR scan frame failed", error);
  }
  if (scannerRunning) scannerFrame = requestAnimationFrame(scanFrame);
}
$("scan-box-button").addEventListener("click", () => {
  scannerStatus.textContent = "Ready to start the camera.";
  $("scanner-start").classList.remove("hidden");
  scannerDialog.showModal();
});
$("scanner-close").addEventListener("click", () => {
  stopScanner();
  scannerDialog.close();
});
scannerDialog.addEventListener("cancel", stopScanner);
scannerDialog.addEventListener("close", stopScanner);
$("scanner-start").addEventListener("click", async () => {
  scannerStatus.textContent = "";
  if (!("BarcodeDetector" in window)) {
    scannerStatus.textContent = "QR scanning isn't supported by this browser. Try the latest Chrome on Android, then reopen Shack Out Back.";
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    scannerStatus.textContent = "Camera access isn't available. Open Shack Out Back from its HTTPS GitHub Pages address.";
    return;
  }
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats?.();
    if (supported && !supported.includes("qr_code")) {
      scannerStatus.textContent = "This browser's camera scanner doesn't support QR codes.";
      return;
    }
    scannerDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    scannerStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    scannerVideo.srcObject = scannerStream;
    await scannerVideo.play();
    scannerRunning = true;
    $("scanner-start").classList.add("hidden");
    scannerStatus.textContent = "Camera is on. Hold the QR code inside the frame.";
    scannerFrame = requestAnimationFrame(scanFrame);
  } catch (error) {
    stopScanner();
    scannerStatus.textContent = error.name === "NotAllowedError"
      ? "Camera permission was denied. Allow camera access in your browser's site settings, then try again."
      : `Couldn't start the camera: ${error.message || error.name}. Check camera permission and close other camera apps.`;
    $("scanner-start").classList.remove("hidden");
  }
});

window.addEventListener("hashchange", () => {
  const match = location.hash.match(/box=([^&]+)/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    if (store.getBox(id)) openDetail(id);
    else toast("This box is not in the local inventory on this device.");
  }
});
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(err => console.warn("Service worker registration failed", err)));
}
store.subscribe(render);

function setWorkspaceVisible(visible) {
  $("workspace").classList.toggle("hidden", !visible);
  $("auth-panel").classList.toggle("hidden", visible);
}
async function updateAuthScreen(user) {
  const householdSetup = $("household-setup"), invite = $("household-invite"), tools = $("signed-in-tools");
  $("auth-error").textContent = ""; $("auth-message").textContent = "";
  if (!user) {
    setWorkspaceVisible(false); householdSetup.classList.add("hidden"); invite.classList.add("hidden"); tools.classList.add("hidden");
    $("auth-email").disabled = false; $("auth-password").disabled = false; return;
  }
  $("auth-email").disabled = true; $("auth-password").disabled = true;
  $("signed-in-label").textContent = `Signed in as ${user.email || user.id}`; tools.classList.remove("hidden");
  try {
    await refreshInventory();
    const hasInventory = !!store.snapshot().inventoryId;
    householdSetup.classList.toggle("hidden", hasInventory); invite.classList.toggle("hidden", !hasInventory);
    setWorkspaceVisible(hasInventory);
    if (hasInventory) { $("sync-status").textContent = "Connected to shared household inventory"; $("footer-status").textContent = "Shared inventory · connected"; render(); handleBoxHash(); }
    else { $("auth-message").textContent = "You're signed in, but this account isn't part of a household inventory yet."; }
  } catch (e) { setWorkspaceVisible(false); $("auth-error").textContent = `Could not load shared inventory: ${e.message}`; }
}
$("auth-form").addEventListener("submit", async event => {
  event.preventDefault(); $("auth-error").textContent = ""; $("auth-message").textContent = "";
  try { const user = await signIn($("auth-email").value.trim(), $("auth-password").value); await updateAuthScreen(user); }
  catch (e) { $("auth-error").textContent = e.message; }
});
$("auth-signup").addEventListener("click", async () => {
  $("auth-error").textContent = ""; $("auth-message").textContent = "";
  try { const result = await signUp($("auth-email").value.trim(), $("auth-password").value); if (result.session && result.user) await updateAuthScreen(result.user); else $("auth-message").textContent = "Account created if the email is accepted. Check your inbox for Supabase's confirmation email, then sign in here."; }
  catch (e) { $("auth-error").textContent = e.message; }
});
$("create-household").addEventListener("click", async () => {
  $("auth-error").textContent = "";
  try { await store.createHousehold($("household-name").value.trim() || "Shack Out Back Household"); toast("Household inventory created."); await updateAuthScreen(await currentUser()); }
  catch (e) { $("auth-error").textContent = e.message; }
});
$("invite-member").addEventListener("click", async () => {
  $("invite-message").textContent = ""; $("auth-error").textContent = "";
  try { const email=$("invite-email").value.trim(); if(!email) throw new Error("Enter the email address your wife used to register."); await store.inviteMember(email); $("invite-message").textContent = "Household membership added. Have her sign in on her phone and refresh the app."; toast("Household member added."); }
  catch(e) { $("auth-error").textContent = e.message; }
});
$("auth-signout").addEventListener("click", async () => { try { await signOut(); await updateAuthScreen(null); } catch(e) { $("auth-error").textContent=e.message; } });
$("copy-ledger-details")?.addEventListener("click", async () => {
  const s = store.snapshot();
  const details = `Shack Out Back ledger: ${s.inventoryName || "Household Inventory"}\nLedger ID: ${s.inventoryId || "—"}`;
  try { await navigator.clipboard.writeText(details); toast("Ledger name and ID copied."); }
  catch { prompt("Copy these ledger details:", details); }
});
$("settings-invite-member")?.addEventListener("click", async () => {
  $("settings-error").textContent = ""; $("settings-invite-message").textContent = "";
  try {
    const email = $("settings-invite-email").value.trim();
    if (!email) throw new Error("Enter the email address the member used to register.");
    await store.inviteMember(email);
    $("settings-invite-message").textContent = "Member added to this ledger. Have them sign in or refresh Shack Out Back.";
    $("settings-invite-email").value = "";
    toast("Household member added.");
  } catch (e) { $("settings-error").textContent = e.message; }
});
$("settings-signout")?.addEventListener("click", async () => { try { await signOut(); await updateAuthScreen(null); } catch(e) { $("settings-error").textContent = e.message; } });
authChanges(user => { updateAuthScreen(user); });
window.addEventListener("focus", async () => { if (store.user && store.snapshot().inventoryId) { try { await refreshInventory(); render(); } catch (e) { $("sync-status").textContent = `Sync issue: ${e.message}`; } } });
(async () => {
  try { const user = await currentUser(); await store.init(); await updateAuthScreen(user); }
  catch (e) { setWorkspaceVisible(false); $("auth-error").textContent = `Setup needed: ${e.message}`; }
})();
function handleBoxHash() {
  const match = location.hash.match(/box=([^&]+)/);
  if (!match) return;
  const id = decodeURIComponent(match[1]);
  if (store.getBox(id)) openDetail(id);
  else toast("This box is not in the local inventory on this device.");
}
if (location.hash.includes("box=")) handleBoxHash();
