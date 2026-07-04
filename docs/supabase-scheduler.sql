-- Supabase Scheduler setup for Chicken Stock.
--
-- Prerequisites:
-- 1. Enable the pg_cron and pg_net extensions in Supabase.
-- 2. Store these secrets in Supabase Vault:
--    - chicken_stock_app_url: https://chicken-stock-app.vercel.app
--    - chicken_stock_cron_secret: same value as Vercel CRON_SECRET or AGENT_INTERNAL_TOKEN
--
-- This script is safe to re-run. Existing jobs with the same names are removed
-- before the replacement schedules are created.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  perform cron.unschedule('chicken-stock-run-agent-trade');
exception
  when others then null;
end $$;

do $$
begin
  perform cron.unschedule('chicken-stock-match-pending');
exception
  when others then null;
end $$;

do $$
begin
  perform cron.unschedule('chicken-stock-match-pending-kr-open');
exception
  when others then null;
end $$;

do $$
begin
  perform cron.unschedule('chicken-stock-match-pending-us-open-dst');
exception
  when others then null;
end $$;

do $$
begin
  perform cron.unschedule('chicken-stock-match-pending-us-open-standard');
exception
  when others then null;
end $$;

do $$
begin
  perform cron.unschedule('chicken-stock-ensure-daily-candles');
exception
  when others then null;
end $$;

select cron.schedule(
  'chicken-stock-run-agent-trade',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'chicken_stock_app_url'
    ) || '/api/internal/agents/run-trade?source=scheduler&limit=5&stockLimit=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'chicken_stock_cron_secret'
      )
    ),
    body := jsonb_build_object('scheduler', 'supabase-pg-cron'),
    timeout_milliseconds := 120000
  );
  $$
);

select cron.schedule(
  'chicken-stock-ensure-daily-candles',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'chicken_stock_app_url'
    ) || '/api/internal/agents/ensure-daily-candles?source=scheduler&lookbackDays=7',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'chicken_stock_cron_secret'
      )
    ),
    body := jsonb_build_object('scheduler', 'supabase-pg-cron'),
    timeout_milliseconds := 120000
  );
  $$
);

select cron.schedule(
  'chicken-stock-match-pending',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'chicken_stock_app_url'
    ) || '/api/internal/agents/match-pending?source=scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'chicken_stock_cron_secret'
      )
    ),
    body := jsonb_build_object('scheduler', 'supabase-pg-cron'),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'chicken-stock-match-pending-kr-open',
  '0 0 * * 1-5',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'chicken_stock_app_url'
    ) || '/api/internal/agents/match-pending?source=scheduler&limit=100&marketOpenCountry=KR',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'chicken_stock_cron_secret'
      )
    ),
    body := jsonb_build_object(
      'market', 'KR',
      'scheduler', 'supabase-pg-cron',
      'trigger', 'market-open'
    ),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'chicken-stock-match-pending-us-open-dst',
  '30 13 * * 1-5',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'chicken_stock_app_url'
    ) || '/api/internal/agents/match-pending?source=scheduler&limit=100&marketOpenCountry=US',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'chicken_stock_cron_secret'
      )
    ),
    body := jsonb_build_object(
      'market', 'US',
      'scheduler', 'supabase-pg-cron',
      'trigger', 'market-open-dst'
    ),
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'chicken-stock-match-pending-us-open-standard',
  '30 14 * * 1-5',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'chicken_stock_app_url'
    ) || '/api/internal/agents/match-pending?source=scheduler&limit=100&marketOpenCountry=US',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'chicken_stock_cron_secret'
      )
    ),
    body := jsonb_build_object(
      'market', 'US',
      'scheduler', 'supabase-pg-cron',
      'trigger', 'market-open-standard'
    ),
    timeout_milliseconds := 30000
  );
  $$
);
