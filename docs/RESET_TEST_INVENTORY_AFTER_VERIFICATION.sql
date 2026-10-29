-- OPTIONAL CLEAN-SLATE RESET for Shack Out Back test data.
-- DO NOT RUN until the multi-ledger version has been deployed and tested.
-- This resets every ledger's test boxes and retired box codes, resets room
-- counters, and clears custom handling-instruction templates.
-- It preserves user accounts, ledger records, ledger memberships, rooms,
-- physical locations, and the invitation-only setup.
-- Deleting boxes also deletes their child box items if ON DELETE CASCADE is configured.

begin;

delete from public.boxes;
delete from public.retired_box_codes;
delete from public.handling_instruction_templates;
update public.rooms set next_number = 1;

commit;
