-- Run after deploying `sync-earnings`.
-- Replace the placeholders with your Supabase project URL and anon key.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-company-earnings-daily',
  '0 0 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-earnings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
    ),
    body := jsonb_build_object('companyCode', company_code)
  )
  from unnest(array['toyota', 'ntt']) as companies(company_code);
  $$
);
