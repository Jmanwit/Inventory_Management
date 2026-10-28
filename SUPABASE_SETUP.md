# Shack Out Back — Supabase sync beta

This beta connects the app to the Supabase project configured in `js/config.js`.

## Before publishing

1. Open `js/config.js` in a text editor.
2. Confirm `SUPABASE_URL` is `https://ygzmzhaomvbgepayhxki.supabase.co`.
3. Replace `YOUR_SUPABASE_PUBLISHABLE_KEY` with the project's **publishable key** (usually starts with `sb_publishable_`).
4. Never use a `service_role` or secret key in this file. This file is public in GitHub Pages; a publishable key is intended for browser use only when database RLS is configured correctly.
5. Do not change the existing Supabase SQL schema. It has already been installed in the project.

## Supabase Authentication settings

In Supabase Dashboard → Authentication → URL Configuration:

- Set **Site URL** to the actual GitHub Pages app URL, likely `https://jmanwit.github.io/inventory_management/`.
- Add that same URL to **Redirect URLs**.
- Confirm the URL matches the actual deployed app path exactly.

If email confirmation is enabled, account creation may require clicking a confirmation link before signing in. If confirmation redirects to a wrong page, fix Site URL/Redirect URLs in Supabase before retrying.

## First-use sequence

1. Deploy the updated app and open the GitHub Pages URL.
2. Create your account with your email and a strong password (at least 8 characters). Confirm the email if prompted, then sign in.
3. Click **Create Household Inventory** once. This creates the shared inventory and seeds the default rooms and physical locations.
4. On your wife's phone, open the same app URL and use **Create Account** with her own email and password. Confirm her email if prompted, then sign in once.
5. From the owner account, enter the exact email she registered with in **Add your wife's account** and tap **Add Household Member**.
6. Have her sign in again or refresh the app. Verify that the same room list and test box appear on both devices.
7. Test create, edit, relocate, delete, and QR links with disposable test data before migrating any real inventory.

## Current beta limits

- The app reads and writes the shared cloud inventory when signed in.
- The app refreshes shared data when it regains focus and after each write. Realtime push updates are not configured yet.
- JSON export works as a cloud data backup. Importing a JSON file into the cloud is deliberately disabled in this first sync beta to avoid accidental duplicate records or overwrites. Keep the old JSON backup safe until the guided migration/import flow is implemented and tested.
- The old localStorage data is not automatically merged into Supabase. Existing data remains in the old browser storage, and should be exported from the old version before replacing it.
- Use only the project's publishable key in `js/config.js`. Never commit a database password, access token, service-role key, or secret key.

## Recovery

If the app fails to load or authentication does not work, do not delete the existing repository or database. Restore the previous app files from your saved backup and check the browser console/Supabase logs. The new beta does not delete the old browser's localStorage data, but it does not display it either.
