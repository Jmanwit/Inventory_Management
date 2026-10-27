import { DEFAULT_ROOMS, DEFAULT_LOCATIONS } from "./config.js";

const STORAGE_KEY = "shack-out-back.v1";
const now = () => new Date().toISOString();
const makeId = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function initialState() {
  return {
    schemaVersion: 1,
    inventoryId: makeId(),
    createdAt: now(),
    rooms: DEFAULT_ROOMS.map(r => ({ id: makeId(), name: r.name, prefix: r.prefix, createdAt: now() })),
    locations: DEFAULT_LOCATIONS.map(name => ({ id: makeId(), name, createdAt: now() })),
    boxes: [],
    retiredBoxIds: []
  };
}

let state;
const listeners = new Set();

function normalizeState(value) {
  if (!value || !Array.isArray(value.boxes) || !Array.isArray(value.rooms) || !Array.isArray(value.locations)) {
    throw new Error("The selected file does not look like a Shack Out Back inventory backup.");
  }
  return {
    schemaVersion: Number(value.schemaVersion || 1),
    inventoryId: value.inventoryId || makeId(),
    createdAt: value.createdAt || now(),
    rooms: value.rooms,
    locations: value.locations,
    boxes: value.boxes,
    retiredBoxIds: Array.isArray(value.retiredBoxIds) ? value.retiredBoxIds : []
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? normalizeState(JSON.parse(raw)) : initialState();
  } catch (error) {
    console.error("Could not load local inventory; starting a fresh local inventory.", error);
    state = initialState();
  }
  persist();
}
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  listeners.forEach(fn => fn(state));
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }

export const store = {
  init() { if (!state) load(); return clone(state); },
  snapshot() { if (!state) load(); return clone(state); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  rooms() { return this.snapshot().rooms; },
  locations() { return this.snapshot().locations; },
  boxes() { return this.snapshot().boxes; },
  getBox(id) { return this.snapshot().boxes.find(b => b.id === id) || null; },
  addRoom(name, prefix) {
    const s = this.snapshot();
    const cleanName = name.trim();
    const cleanPrefix = prefix.trim().toUpperCase();
    if (!cleanName || !/^[A-Z0-9]{2,5}$/.test(cleanPrefix)) throw new Error("Use a 2–5 character prefix containing only letters and numbers.");
    if (s.rooms.some(r => r.prefix.toUpperCase() === cleanPrefix)) throw new Error(`The prefix ${cleanPrefix} is already in use.`);
    if (s.rooms.some(r => r.name.toLowerCase() === cleanName.toLowerCase())) throw new Error("A room with that name already exists.");
    s.rooms.push({ id: makeId(), name: cleanName, prefix: cleanPrefix, createdAt: now() });
    state = s; persist();
  },
  addLocation(name) {
    const s = this.snapshot();
    const clean = name.trim();
    if (!clean) throw new Error("Enter a location name.");
    if (s.locations.some(l => l.name.toLowerCase() === clean.toLowerCase())) throw new Error("That location already exists.");
    s.locations.push({ id: makeId(), name: clean, createdAt: now() });
    state = s; persist();
    return s.locations.find(l => l.name === clean);
  },
  saveBox(input) {
    const s = this.snapshot();
    const room = s.rooms.find(r => r.id === input.roomId);
    const location = s.locations.find(l => l.id === input.locationId);
    if (!room) throw new Error("Choose a destination room.");
    if (!location) throw new Error("Choose a current physical location.");
    if (!input.description.trim()) throw new Error("Enter a short box description.");
    const contents = input.items.map(v => v.trim()).filter(Boolean);
    let box;
    if (input.id) {
      box = s.boxes.find(b => b.id === input.id);
      if (!box) throw new Error("This box no longer exists.");
      box.roomId = room.id;
      box.destination = room.name;
      box.description = input.description.trim();
      box.locationId = location.id;
      box.currentLocation = location.name;
      box.items = contents;
      box.notes = input.notes.trim();
      box.status = input.status;
      box.updatedAt = now();
    } else {
      // Local prototype only: sequential allocation is safe on this one browser, not across devices.
      const used = s.boxes.filter(b => b.roomId === room.id).map(b => Number(b.boxId.match(/-(\d+)$/)?.[1] || 0));
      const retired = s.retiredBoxIds.filter(id => id.startsWith(`${room.prefix}-`)).map(id => Number(id.match(/-(\d+)$/)?.[1] || 0));
      const next = Math.max(0, ...used, ...retired) + 1;
      const boxId = `${room.prefix}-${String(next).padStart(3, "0")}`;
      box = {
        id: makeId(), boxId, qrToken: makeId(), roomId: room.id,
        destination: room.name, description: input.description.trim(),
        locationId: location.id, currentLocation: location.name,
        items: contents, notes: input.notes.trim(), status: input.status || "Packed",
        createdAt: now(), updatedAt: now()
      };
      s.boxes.push(box);
    }
    state = s; persist();
    return clone(box);
  },
  relocateBox(id, locationName) {
    const s = this.snapshot();
    const box = s.boxes.find(b => b.id === id);
    if (!box) throw new Error("Box not found.");
    let location = s.locations.find(l => l.name.toLowerCase() === locationName.trim().toLowerCase());
    if (!location) {
      const clean = locationName.trim();
      if (!clean) throw new Error("Choose or enter a location.");
      location = { id: makeId(), name: clean, createdAt: now() };
      s.locations.push(location);
    }
    const previous = box.currentLocation;
    box.locationId = location.id;
    box.currentLocation = location.name;
    box.updatedAt = now();
    state = s; persist();
    return { box: clone(box), previousLocation: previous };
  },
  deleteBox(id) {
    const s = this.snapshot();
    const index = s.boxes.findIndex(b => b.id === id);
    if (index < 0) return;
    const [box] = s.boxes.splice(index, 1);
    s.retiredBoxIds.push(box.boxId);
    state = s; persist();
  },
  exportData() {
    const s = this.snapshot();
    return {
      app: "Shack Out Back", schemaVersion: s.schemaVersion,
      inventoryId: s.inventoryId, exportedAt: now(),
      rooms: s.rooms, locations: s.locations, boxes: s.boxes,
      retiredBoxIds: s.retiredBoxIds
    };
  },
  importReplace(value) {
    state = normalizeState(value);
    persist();
  },
  replaceForTests(value) { state = normalizeState(value); persist(); }
};
