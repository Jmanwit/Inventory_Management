import { supabase } from "./supabase-client.js";

const now = () => new Date().toISOString();
let state = { schemaVersion: 1, inventoryId: null, createdAt: now(), rooms: [], locations: [], boxes: [], retiredBoxIds: [], customHandlingInstructions: [] };
let user = null;
const listeners = new Set();
const clone = value => JSON.parse(JSON.stringify(value));
function emit() { listeners.forEach(fn => fn(clone(state))); }
function err(e) { if (e?.message) throw new Error(e.message); }
function mapRoom(r) { return { id:r.id, name:r.name, prefix:r.prefix, nextNumber:r.next_number, createdAt:r.created_at }; }
function mapLocation(l) { return { id:l.id, name:l.name, createdAt:l.created_at }; }
function mapBox(b, rooms, locations) { const room=rooms.find(r=>r.id===b.room_id), loc=locations.find(l=>l.id===b.location_id); return { id:b.id, boxId:b.box_code, qrToken:b.qr_token, roomId:b.room_id, destination:room?.name || "Unknown", description:b.description, locationId:b.location_id, currentLocation:loc?.name || "Unknown", items:b.items || [], notes:b.notes || "", handlingInstructions:b.handling_instructions || [], status:b.status || "Packed", createdAt:b.created_at, updatedAt:b.updated_at }; }
async function getInventoryId() { if (!user) throw new Error("Sign in first."); const {data,error}=await supabase.from("inventory_members").select("inventory_id").eq("user_id",user.id).limit(1).maybeSingle(); if(error) throw error; return data?.inventory_id || null; }
async function refresh() {
  if (!user) { state={ schemaVersion:1, inventoryId:null, createdAt:now(), rooms:[], locations:[], boxes:[], retiredBoxIds:[], customHandlingInstructions:[] }; emit(); return state; }
  const inventoryId=await getInventoryId();
  if (!inventoryId) { state={ schemaVersion:1, inventoryId:null, createdAt:now(), rooms:[], locations:[], boxes:[], retiredBoxIds:[], customHandlingInstructions:[] }; emit(); return state; }
  const [rr,ll,bb,tt,ret]=await Promise.all([
    supabase.from("rooms").select("*").eq("inventory_id",inventoryId).order("name"),
    supabase.from("locations").select("*").eq("inventory_id",inventoryId).order("name"),
    supabase.from("boxes").select("*").eq("inventory_id",inventoryId).order("created_at",{ascending:false}),
    supabase.from("handling_instruction_templates").select("instruction").eq("inventory_id",inventoryId).order("instruction"),
    supabase.from("retired_box_codes").select("box_code").eq("inventory_id",inventoryId)
  ]);
  for (const q of [rr,ll,bb,tt,ret]) if(q.error) throw q.error;
  const rooms=rr.data.map(mapRoom), locations=ll.data.map(mapLocation);
  state={schemaVersion:1,inventoryId,createdAt:now(),rooms,locations,boxes:bb.data.map(b=>mapBox(b,rooms,locations)),retiredBoxIds:ret.data.map(r=>r.box_code),customHandlingInstructions:tt.data.map(t=>t.instruction)}; emit(); return clone(state);
}
export const store = {
  get user(){return user;},
  async init(){ const {data,error}=await supabase.auth.getUser(); if(error && error.name!=="AuthSessionMissingError") console.warn(error); user=data?.user||null; await refresh(); return clone(state); },
  snapshot(){return clone(state);}, subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}, rooms(){return this.snapshot().rooms;}, locations(){return this.snapshot().locations;}, boxes(){return this.snapshot().boxes;}, getBox(id){return this.snapshot().boxes.find(b=>b.id===id)||null;},
  async setUser(u){user=u; await refresh();},
  async createHousehold(name="Shack Out Back Household"){const {data,error}=await supabase.rpc("create_household_inventory",{inventory_name:name}); if(error) throw error; await refresh(); return data;},
  async inviteMember(email){const {error}=await supabase.rpc("add_household_member_by_email",{member_email:email}); if(error) throw error;},
  async addRoom(name,prefix){const cleanName=name.trim(), cleanPrefix=prefix.trim().toUpperCase(); if(!cleanName||!/^[A-Z0-9]{2,5}$/.test(cleanPrefix))throw new Error("Use a 2–5 character prefix containing only letters and numbers."); const {error}=await supabase.from("rooms").insert({inventory_id:state.inventoryId,name:cleanName,prefix:cleanPrefix}); if(error)throw error; await refresh();},
  async addHandlingInstruction(name){const clean=String(name||"").trim();if(!clean)throw new Error("Enter an instruction.");if(clean.length>100)throw new Error("Instructions must be 100 characters or fewer.");if(state.customHandlingInstructions.some(v=>v.toLowerCase()===clean.toLowerCase()))return clean;const {error}=await supabase.from("handling_instruction_templates").insert({inventory_id:state.inventoryId,instruction:clean});if(error)throw error;await refresh();return clean;},
  async addLocation(name){const clean=name.trim();if(!clean)throw new Error("Enter a location name.");const {data,error}=await supabase.from("locations").insert({inventory_id:state.inventoryId,name:clean}).select("*").single();if(error)throw error;await refresh();return mapLocation(data);},
  async saveBox(input){const room=state.rooms.find(r=>r.id===input.roomId), location=state.locations.find(l=>l.id===input.locationId);if(!room)throw new Error("Choose a destination room.");if(!location)throw new Error("Choose a current physical location.");if(!input.description.trim())throw new Error("Enter a short box description.");const common={room_id:room.id,location_id:location.id,description:input.description.trim(),items:input.items.map(v=>v.trim()).filter(Boolean),notes:input.notes.trim(),handling_instructions:[...new Set((input.handlingInstructions||[]).map(v=>String(v).trim()).filter(Boolean))],status:input.status||"Packed"};let data,error;if(input.id){({data,error}=await supabase.from("boxes").update(common).eq("id",input.id).eq("inventory_id",state.inventoryId).select("*").single());}else{({data,error}=await supabase.rpc("create_box",{target_inventory:state.inventoryId,target_room:room.id,target_location:location.id,box_description:common.description,box_items:common.items,box_notes:common.notes,box_handling_instructions:common.handling_instructions,box_status:common.status}));}if(error)throw error;await refresh();return this.getBox(data.id);},
  async relocateBox(id,locationName){let location=state.locations.find(l=>l.name.toLowerCase()===locationName.trim().toLowerCase());if(!location){location=await this.addLocation(locationName);}const box=this.getBox(id);if(!box)throw new Error("Box not found.");const {error}=await supabase.from("boxes").update({location_id:location.id}).eq("id",id).eq("inventory_id",state.inventoryId);if(error)throw error;await refresh();return {box:this.getBox(id),previousLocation:box.currentLocation};},
  async deleteBox(id){const box=this.getBox(id);if(!box)return;const {error}=await supabase.from("boxes").delete().eq("id",id).eq("inventory_id",state.inventoryId);if(error)throw error;await refresh();},
  exportData(){const s=this.snapshot();return {app:"Shack Out Back",schemaVersion:s.schemaVersion,inventoryId:s.inventoryId,exportedAt:now(),rooms:s.rooms,locations:s.locations,boxes:s.boxes,retiredBoxIds:s.retiredBoxIds,customHandlingInstructions:s.customHandlingInstructions};},
  async importReplace(){throw new Error("Cloud restore is not enabled in this first sync build. Keep your JSON backup safe; we'll add a guided importer after two-account sync is tested.");}
};
export async function signIn(email,password){const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;user=data.user;await refresh();return data.user;}
export async function signUp(email,password){const {data,error}=await supabase.auth.signUp({email,password});if(error)throw error;if(data.user && data.session){user=data.user;await refresh();}return data;}
export async function signOut(){const {error}=await supabase.auth.signOut();if(error)throw error;user=null;await refresh();}
export async function currentUser(){const {data,error}=await supabase.auth.getUser();if(error && error.name!=="AuthSessionMissingError")throw error;user=data?.user||null;return user;}
export function authChanges(callback){return supabase.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;queueMicrotask(()=>callback(user));});}
export async function refreshInventory(){return refresh();}
