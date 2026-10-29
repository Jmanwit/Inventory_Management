-- Shack Out Back: multi-ledger support uses the existing many-to-many
-- inventory_members table. This migration adds safe room deletion.
-- It does not delete or alter existing inventory data.

create or replace function public.delete_inventory_room(
  target_inventory uuid,
  target_room uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before deleting a room.' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.inventory_members m
    where m.inventory_id = target_inventory
      and m.user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this ledger.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.rooms r
    where r.id = target_room and r.inventory_id = target_inventory
  ) then
    raise exception 'That room was not found in the current ledger.' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.boxes b
    where b.room_id = target_room and b.inventory_id = target_inventory
  ) then
    raise exception 'This room still has boxes assigned to it. Move those boxes to another room before deleting it.' using errcode = '23503';
  end if;

  delete from public.rooms
  where id = target_room and inventory_id = target_inventory;
end;
$$;

revoke all on function public.delete_inventory_room(uuid, uuid) from public;
grant execute on function public.delete_inventory_room(uuid, uuid) to authenticated;
