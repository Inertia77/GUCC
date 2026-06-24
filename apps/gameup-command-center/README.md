# GameUp Command Center v5

This package is for the stage **after your Supabase database has already been imported**.

Architecture:

```text
GitHub Pages static frontend
  -> Supabase Auth login
  -> Supabase Edge Function: gameup-api
  -> PostgreSQL JSONB RPC functions
```

## Main steps

1. Run `sql/01_check_schema.sql` in Supabase SQL Editor.
2. Run `sql/02_app_backend_jsonb_rpc.sql` in Supabase SQL Editor.
3. Create/sign up your Supabase Auth user.
4. Edit and run `sql/03_register_owner_template.sql`.
5. Deploy `supabase/functions/gameup-api/index.ts` as an Edge Function.
6. Set Edge Function secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`.
7. Edit `src/config.js` with Supabase URL and anon key.
8. Test locally with `python -m http.server 8000`.
9. Push to GitHub and enable GitHub Pages from branch `main`, folder `/root`.

Open `docs/setup_guide.html` for the full babysitting-level guide.
