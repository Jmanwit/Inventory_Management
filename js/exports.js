export function downloadJson(data, filename = "shack-out-back-backup.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function renderPrintableInventory(state) {
  const root = document.createElement("div");
  root.id = "print-root";
  root.className = "print-inventory";
  const title = document.createElement("h1"); title.textContent = "Shack Out Back — Inventory";
  const date = document.createElement("p"); date.textContent = `Printed ${new Date().toLocaleString()}`;
  root.append(title, date);
  const sorted = [...state.boxes].sort((a,b) => a.boxId.localeCompare(b.boxId));
  for (const box of sorted) {
    const section = document.createElement("section");
    const h = document.createElement("h2"); h.textContent = `${box.boxId} — ${box.description}`;
    const meta = document.createElement("p"); meta.textContent = `Destination: ${box.destination} | Current location: ${box.currentLocation} | Status: ${box.status}`;
    const items = document.createElement("p"); items.textContent = `Contents: ${(box.items || []).join(", ") || "No contents listed"}`;
    const notes = document.createElement("p"); notes.textContent = `Notes: ${box.notes || "—"}`;
    section.append(h, meta, items, notes); root.append(section);
  }
  return root;
}
