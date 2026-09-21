# Super System — Latest Vercel + Supabase Website

This version is prepared for the existing `computer-shop-website` GitHub repository. It keeps the old Supabase `products` table compatible while replacing the insecure Express/admin setup with Supabase Authentication and Row Level Security.

## Included

- Products shown first on the home page
- Product category filters and direct WhatsApp purchase messages
- Every service opens a direct WhatsApp booking message
- Scrolling ticker
- Admin product add/edit/delete/hide
- Admin Website Settings: site name, tagline, WhatsApp number, address, working hours and ticker
- Mobile/desktop responsive layout
- Vercel static build configuration

## Required setup

### 1. Configure Supabase connection

In `public/site-config.js`, replace only these values:

```js
supabaseUrl: "YOUR_SUPABASE_URL",
supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
```

Use the public anon key only. Never add the service-role key to GitHub.

### 2. Run the safe database migration

Open Supabase → SQL Editor and run the complete `supabase-migration.sql` file once. Existing products are preserved.

### 3. Create the admin

1. Supabase → Authentication → Users → Add user.
2. Create your admin email/password.
3. Run the final commented `insert into public.admin_users...` query from `supabase-migration.sql` after replacing the email.
4. Turn off public sign-ups in Supabase Authentication settings.

Admin URL: `/admin.html`

## Existing GitHub repository update

Recommended: clone the existing repository with GitHub Desktop, remove the old project contents (keep the hidden `.git` folder), paste this package's contents at repository root, commit, and push. Vercel will redeploy the existing project automatically.

Do not upload `node_modules`. The old `server.js`, `data` and tracked `node_modules` are no longer used and should be removed from the repository.

## Local preview without Node.js

Open `dist/index.html`, or right-click it in VS Code and select **Open with Live Server**. Admin preview is `dist/admin.html`.

## Build

With Node.js installed:

```bash
npm install
npm run build
```
