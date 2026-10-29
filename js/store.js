import { supabase } from "./supabase-client.js";

const now = () => new Date().toISOString();
let state = { schemaVersion: 1, inventoryId: null, inventoryName: null, ledgers: [], createdAt: now(), rooms: [], locations: [], boxes: [], retiredBoxIds: [], customHandlingInstructions: [] };
let user = null;
const listeners = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
function emit() { listeners.forEach(fn => fn(clone(state))); }
function err(e) { if (e?.message) throw new Error(e.message); }
function mapRoom(r) { return { id:r.id, name:r.name, prefix:r.prefix, nextNumber:r.next_number, createdAt:r.created_at }; }
function mapLocation(l) { return { id:l.id, name:l.name, createdAt:l.created_at }; }
function mapBox(b, rooms, locations) { const room=rooms.find(r=>r.id===b.room_id), loc=locations.find(l=>l.id===b.location_id); return { id:b.id, boxId:b.box_code, qrToken:b.qr_token, roomId:b.room_id, destination:room?.name || "Unknown", description:b.description, locationId:b.location_id, currentLocation:loc?.name || "Unknown", items:b.items || [], notes:b.notes || "", handlingInstructions:b.handling_instructions || [], status:b.status || "Packed", createdAt:b.created_at, updatedAt:b.updated_at }; }
function emptyState(ledgers = []) { return { schemaVersion:1, inventoryId:null, inventoryName:null, ledgers, createdAt:now(), rooms:[], locations:[], boxes:[], retiredBoxIds:[], customHandlingInstructions:[] }; }
function activeLedgerStorageKey() { return user?.id ? `sob-active-ledger:${user.id}` : null; }
async function getLedgers() {
  if (!user) return [];
  const {data: memberships, error: memberError} = await supabase.from("inventory_members").select("inventory_id,role,created_at").eq("user_id", user.id).order("created_at", {ascending:true});
  if (memberError) throw memberError;
  const ids = [...new Set((memberships || []).map(m => m.inventory_id))];
  if (!ids.length) return [];
  const {data: inventories, error} = await supabase.from("inventories").select("id,name,created_at").in("id", ids).order("created_at", {ascending:true});
  if (error) throw error;
  const roles = new Map((memberships || []).map(m => [m.inventory_id, m.role]));
  return (inventories || []).map(i => ({id:i.id, name:i.name || "Household Inventory", createdAt:i.created_at, role:roles.get(i.id) || "member"}));
}
async function refresh(requestedInventoryId = null) {
  if (!user) { state=emptyState(); emit(); return state; }
  const ledgers = await getLedgers();
  if (!ledgers.length) { state=emptyState(); emit(); return state; }
  const storageKey = activeLedgerStorageKey();
  let inventoryId = requestedInventoryId || (storageKey ? localStorage.getItem(storageKey) : null);
  if (!ledgers.some(l => l.id === inventoryId)) inventoryId = ledgers[0].id;
  if (storageKey && inventoryId) localStorage.setItem(storageKey, inventoryId);
  const selected = ledgers.find(l => l.id === inventoryId);
  const [rr,ll,bb,tt,ret] = await Promise.all([
    supabase.from("rooms").select("*").eq("inventory_id",inventoryId).order("name"),
    supabase.from("locations").select("*").eq("inventory_id",inventoryId).order("name"),
    supabase.from("boxes").select("*").eq("inventory_id",inventoryId).order("created_at",{ascending:false}),
    supabase.from("handling_instruction_templates").select("instruction").eq("inventory_id",inventoryId).order("instruction"),
    supabase.from("retired_box_codes").select("box_code").eq("inventory_id",inventoryId)
  ]);
  for (const q of [rr,ll,bb,tt,ret]) if(q.error) throw q.error;
  const rooms=(rr.data||[]).map(mapRoom), locations=(ll.data||[]).map(mapLocation);
  state={schemaVersion:1,inventoryId,inventoryName:selected?.name || "Household Inventory",ledgers,createdAt:now(),rooms,locations,boxes:(bb.data||[]).map(b=>mapBox(b,rooms,locations)),retiredBoxIds:(ret.data||[]).map(r=>r.box_code),customHandlingInstructions:(tt.data||[]).map(t=>t.instruction)};
  emit(); return clone(state);
}
export const store = {
  get user(){return user;},
  async init(){ const {data,error}=await supabase.auth.getUser(); if(error && error.name!=="AuthSessionMissingError") console.warn(error); user=data?.user||null; await refresh(); return clone(state); },
  snapshot(){return clone(state);}, subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}, rooms(){return this.snapshot().rooms;}, locations(){return this.snapshot().locations;}, boxes(){return this.snapshot().boxes;}, getBox(id){return this.snapshot().boxes.find(b=>b.id===id)||null;},
  async setUser(u){user=u; await refresh();},
  async switchLedger(inventoryId){if(!state.ledgers.some(l=>l.id===inventoryId))throw new Error("You are not a member of that ledger.");await refresh(inventoryId);return clone(state);},
  async createHousehold(name="Shack Out Back Household"){const clean=String(name||"").trim();if(!clean)throw new Error("Enter a name for the new ledger.");const before=new Set(state.ledgers.map(l=>l.id));const {data,error}=await supabase.rpc("create_household_inventory",{inventory_name:clean});if(error)throw error;const returnedId=typeof data==="string"?data:(data?.inventory_id||data?.id||data?.inventoryId||null);const ledgers=await getLedgers();const created=returnedId?ledgers.find(l=>l.id===returnedId):ledgers.find(l=>!before.has(l.id)&&l.name===clean);const id=created?.id||returnedId;await refresh(id);return data;},
  async inviteMember(email){const {error}=await supabase.rpc("add_household_member_by_email",{member_email:email}); if(error) throw error;},
  async inviteAppUser(email){const {data,error}=await supabase.functions.invoke("send-app-invitation",{body:{email}});if(error)throw error;if(data?.error)throw new Error(data.error);return data;},
  async addRoom(name,prefix){const cleanName=name.trim(), cleanPrefix=prefix.trim().toUpperCase(); if(!cleanName||!/^[A-Z0-9]{2,5}$/.test(cleanPrefix))throw new Error("Use a 2–5 character prefix containing only letters and numbers."); const {error}=await supabase.from("rooms").insert({inventory_id:state.inventoryId,name:cleanName,prefix:cleanPrefix}); if(error)throw error; await refresh();},
  async deleteRoom(id){const room=state.rooms.find(r=>r.id===id);if(!room)throw new Error("Room not found in the current ledger.");const {error}=await supabase.rpc("delete_inventory_room",{target_inventory:state.inventoryId,target_room:id});if(error)throw error;await refresh();},
  async addHandlingInstruction(name){const clean=String(name||"").trim();if(!clean)throw new Error("Enter an instruction.");if(clean.length>100)throw new Error("Instructions must be 100 characters or fewer.");if(state.customHandlingInstructions.some(v=>v.toLowerCase()===clean.toLowerCase()))return clean;const {error}=await supabase.from("handling_instruction_templates").insert({inventory_id:state.inventoryId,instruction:clean});if(error)throw error;await refresh();return clean;},
  async deleteHandlingInstruction(name){const clean=String(name||"").trim();if(!clean)throw new Error("Choose a saved instruction to delete.");const {error}=await supabase.from("handling_instruction_templates").delete().eq("inventory_id",state.inventoryId).eq("instruction",clean);if(error)throw error;await refresh();},
  async addLocation(name){const clean=name.trim();if(!clean)throw new Error("Enter a location name.");const {data,error}=await supabase.from("locations").insert({inventory_id:state.inventoryId,name:clean}).select("*").single();if(error)throw error;await refresh();return mapLocation(data);},
  async saveBox(input){const room=state.rooms.find(r=>r.id===input.roomId), location=state.locations.find(l=>l.id===input.locationId);if(!room)throw new Error("Choose a destination room.");if(!location)throw new Error("Choose a current physical location.");if(!input.description.trim())throw new Error("Enter a short box description.");const common={room_id:room.id,location_id:location.id,description:input.description.trim(),items:input.items.map(v=>v.trim()).filter(Boolean),notes:input.notes.trim(),handling_instructions:[...new Set((input.handlingInstructions||[]).map(v=>String(v).trim()).filter(Boolean))],status:input.status||"Packed"};let data,error;if(input.id){({data,error}=await supabase.from("boxes").update(common).eq("id",input.id).eq("inventory_id",state.inventoryId).select("*").single());}else{({data,error}=await supabase.rpc("create_box",{target_inventory:state.inventoryId,target_room:room.id,target_location:location.id,box_description:common.description,box_items:common.items,box_notes:common.notes,box_handling_instructions:common.handling_instructions,box_status:common.status}));}if(error)throw error;await refresh();return this.getBox(data.id);},
  async relocateBox(id,locationName){let location=state.locations.find(l=>l.name.toLowerCase()===locationName.trim().toLowerCase());if(!location){location=await this.addLocation(locationName);}const box=this.getBox(id);if(!box)throw new Error("Box not found.");const {error}=await supabase.from("boxes").update({location_id:location.id}).eq("id",id).eq("inventory_id",state.inventoryId);if(error)throw error;await refresh();return {box:this.getBox(id),previousLocation:box.currentLocation};},
  async deleteBox(id){const box=this.getBox(id);if(!box)return;const {error}=await supabase.from("boxes").delete().eq("id",id).eq("inventory_id",state.inventoryId);if(error)throw error;await refresh();},
  exportData(){const s=this.snapshot();return {app:"Shack Out Back",schemaVersion:s.schemaVersion,inventoryId:s.inventoryId,inventoryName:s.inventoryName,exportedAt:now(),rooms:s.rooms,locations:s.locations,boxes:s.boxes,retiredBoxIds:s.retiredBoxIds,customHandlingInstructions:s.customHandlingInstructions};},
  async importReplace(){throw new Error("Cloud restore is not enabled in this first sync build. Keep your JSON backup safe; we'll add a guided importer after two-account sync is tested.");}
};
export async function signIn(email,password){const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;await refresh();return data.user;}
export async function signOut(){const {error}=await supabase.auth.signOut();if(error)throw error;user=null;await refresh();}
export async function setPassword(password){const {data,error}=await supabase.auth.updateUser({password});if(error)throw error;user=data.user;return data.user;}
export async function requestPasswordReset(email){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:"https://jmanwit.github.io/Inventory_Management/?set-password=1"});if(error)throw error;}
export async function currentUser(){const {data,error}=await supabase.auth.getUser();if(error && error.name!=="AuthSessionMissingError")throw error;user=data?.user||null;return user;}
export function authChanges(callback){return supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;queueMicrotask(()=>callback(user));});}
export async function refreshInventory(){return refresh();}
