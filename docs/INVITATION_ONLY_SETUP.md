# Invitation-only beta setup

This change removes the public **Create Account** button and adds an administrator-only **Invite someone to Shack Out Back** panel in Settings. The Edge Function independently checks the signed-in caller against the `SOB_ADMIN_EMAIL` secret before using Supabase's admin invitation API. Application invitations create/activate an account; they do **not** add that person to any household ledger. The existing ledger-member workflow is separate.

## Important: do not disable public sign-ups until the invite flow is deployed and tested

The files alone do not change Supabase Auth settings. Follow these steps in order so existing accounts are not locked out.

## 1. Set the admin email in the app

Edit `js/config.js` and replace:

```js
export const APP_ADMIN_EMAIL = "REPLACE_WITH_YOUR_ADMIN_EMAIL";
```

with the exact email address used by your administrator account, in lowercase. This only controls whether the invitation panel is shown in the UI; it is **not** the security boundary.

## 2. Deploy the Edge Function

The new function is at `supabase/functions/send-app-invitation/index.ts`.

From a computer with the Supabase CLI and this repository checked out, run:

```sh
supabase login
supabase link --project-ref ygzmzhaomvbgepayhxki
supabase secrets set SOB_ADMIN_EMAIL=your-admin-email@example.com
supabase functions deploy send-app-invitation
```

Use the administrator's actual sign-in email in place of the example. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions in the hosted project. Never put the service-role key in `js/config.js` or any public file.

If you don't have the CLI available, deploy the function using the Supabase dashboard's Edge Functions workflow, and set the `SOB_ADMIN_EMAIL` function secret in the dashboard. Do not paste a service-role key into GitHub or this chat.

## 3. Verify email configuration

In Supabase Dashboard → Authentication → URL Configuration, ensure the allowed redirect URLs include:

`https://jmanwit.github.io/Inventory_Management/`

The project's email provider/rate limits must also permit sending invitations. If invite email delivery is not configured, finish that setup before turning off public sign-ups.

## 4. Test while public sign-ups are still enabled

1. Commit the app files and deploy the function.
2. Sign in with the configured administrator account and open **Settings & Household**. The app invitation panel should be visible.
3. Invite a test email address that has never registered.
4. Confirm the email arrives and the recipient can complete the invitation/acceptance flow.
5. Confirm the new account has **no access** to the administrator's ledger unless separately added through the existing ledger-member feature.
6. Confirm existing administrator and household-member logins still work, and test QR scanning and B21S printing.
7. Test the function with a non-admin account. It must return `403` and send no invitation.

## 5. Turn off unrestricted registration

Only after the invitation flow succeeds, open Supabase Dashboard → Authentication → Settings (the precise section label may vary) and disable **Allow new users to sign up** / public sign-ups. Existing accounts continue to sign in. Supabase's administrative `inviteUserByEmail` flow should remain available to the Edge Function; verify this against your project's current Auth settings before treating the rollout as complete.

After disabling public sign-ups, test one more invited registration and confirm that a direct attempt to sign up without an invitation is rejected by Supabase, not merely hidden by the interface.

## What this implementation does not do

- It does not alter existing household membership or inventory data.
- It does not automatically add app invitees to the inviter's ledger.
- It does not give ordinary household members the ability to send app invitations.
- The administrator email in `js/config.js` is only a UI convenience. The Edge Function's `SOB_ADMIN_EMAIL` check is the server-side authorization check.
- The function's CORS origin is limited to the published GitHub Pages origin. CORS is not authentication; the user-token and admin-email checks provide authorization.
