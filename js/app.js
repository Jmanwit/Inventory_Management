import { store } from "./store.js";
import { searchBoxes } from "./search.js";
import { setupPrinting } from "./printing.js";
import { downloadJson, renderPrintableInventory, downloadBlob } from "./exports.js";

const $ = id => document.getElementById(id);
const state = { activeView: "inventory", detailBoxId: null, labelBoxId: null, selectedHandling: [] };
const STANDARD_HANDLING = ["Fragile", "Keep Upright", "Heavy", "Do Not Stack", "This Side Up", "Keep Dry", "Handle With Care", "Two-Person Lift", "Keep Accessible", "Sharp Objects", "Temperature Sensitive", "Do Not Crush"];
store.init();

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
  const boxes = searchBoxes(s.boxes, $("search-input").value);
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
  $("empty-state").classList.toggle("hidden", s.boxes.length > 0 || $("search-input").value.trim().length > 0);
  if (s.boxes.length && boxes.length === 0) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    empty.innerHTML = "<h3>No matching boxes</h3><p>Try another item, box ID, room, or location.</p>";
    $("box-list").append(empty);
  }
  renderRoomsAndLocations(s);
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
document.addEventListener("click", event => {
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
      store.deleteBox(box.id); $("detail-dialog").close(); render(); toast(`${box.boxId} deleted. Its ID will not be reused.`);
    }
  }
});
$("search-input").addEventListener("input", render);
$("box-form").addEventListener("submit", event => {
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
    const box = store.saveBox(input);
    render(); showView("inventory"); toast(`${box.boxId} saved.`);
    if (isNew) openLabel(box.id);
    else openDetail(box.id);
  } catch (error) { setFieldError("form-error", error.message); }
});
$("cancel-edit").addEventListener("click", () => { resetForm(); showView("inventory"); });
$("quick-add-room").addEventListener("click", () => {
  setFieldError("quick-room-error", "");
  try {
    const name = $("quick-room-name").value;
    const prefix = $("quick-room-prefix").value;
    store.addRoom(name, prefix);
    const room = store.rooms().find(r => r.name.toLowerCase() === name.trim().toLowerCase());
    render(); if (room) $("box-room").value = room.id;
    $("quick-room-name").value = ""; $("quick-room-prefix").value = "";
    $("quick-room-name").closest("details").open = false;
    toast(`Room ${room?.name || name} added and selected.`);
  } catch (error) { setFieldError("quick-room-error", error.message); }
});
$("quick-add-location").addEventListener("click", () => {
  setFieldError("quick-location-error", "");
  try {
    const name = $("quick-location-name").value;
    const location = store.addLocation(name);
    render(); $("box-location").value = location.id;
    $("quick-location-name").value = "";
    $("quick-location-name").closest("details").open = false;
    toast(`Location ${location.name} added and selected.`);
  } catch (error) { setFieldError("quick-location-error", error.message); }
});
$("add-custom-instruction").addEventListener("click", () => {
  setFieldError("handling-error", "");
  const value = $("custom-instruction-text").value.trim();
  if (!value) { setFieldError("handling-error", "Type an instruction first."); return; }
  try {
    let instruction = value;
    if ($("save-custom-instruction").checked) instruction = store.addHandlingInstruction(value);
    if (!state.selectedHandling.some(v => v.toLowerCase() === instruction.toLowerCase())) state.selectedHandling.push(instruction);
    $("custom-instruction-text").value = "";
    renderHandlingOptions(store.snapshot());
    toast($("save-custom-instruction").checked ? "Instruction saved for reuse and selected." : "One-off instruction selected.");
  } catch (error) { setFieldError("handling-error", error.message); }
});
$("room-form").addEventListener("submit", event => {
  event.preventDefault(); setFieldError("room-error", "");
  try {
    store.addRoom($("new-room-name").value, $("new-room-prefix").value);
    $("room-form").reset(); render(); toast("Room added.");
  } catch (error) { setFieldError("room-error", error.message); }
});
$("location-form").addEventListener("submit", event => {
  event.preventDefault(); setFieldError("location-error", "");
  try {
    store.addLocation($("new-location-name").value);
    $("location-form").reset(); render(); toast("Location added.");
  } catch (error) { setFieldError("location-error", error.message); }
});
$("relocate-form").addEventListener("submit", event => {
  event.preventDefault(); setFieldError("relocate-error", "");
  try {
    const typed = $("relocate-new-location").value.trim();
    const chosen = $("relocate-location").selectedOptions[0]?.textContent || "";
    const destination = typed || chosen;
    const result = store.relocateBox($("relocate-dialog").dataset.boxId, destination);
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
    if (!confirm("This replaces the local inventory on this device. Export a backup first. Continue?")) return;
    store.importReplace(parsed); $("import-dialog").close(); render(); toast("Local inventory imported.");
  } catch (error) { setFieldError("import-error", error.message); }
});
document.addEventListener("change", event => {
  if (event.target.matches("#box-room")) {
    const room = store.rooms().find(r => r.id === event.target.value);
    if (room && !$("box-description").value) $("box-description").placeholder = `e.g. ${room.name} supplies`;
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
render();
function handleBoxHash() {
  const match = location.hash.match(/box=([^&]+)/);
  if (!match) return;
  const id = decodeURIComponent(match[1]);
  if (store.getBox(id)) openDetail(id);
  else toast("This box is not in the local inventory on this device.");
}
if (location.hash.includes("box=")) handleBoxHash();
