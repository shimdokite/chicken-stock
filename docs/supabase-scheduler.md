# Supabase Scheduler

Vercel Hobby cron is limited to daily schedules, so production scheduling is handled by Supabase `pg_cron` and `pg_net`.

## Runtime Flow

```text
Supabase pg_cron
  -> pg_net HTTP POST
  -> Vercel Next.js API route
  -> agent trade / pending order job
```

The scheduler only wakes the API routes. The application still enforces the ADK window and market-session checks:

- ADK decisions run only during the configured ADK window in `app/(backend)/lib/market-hours.ts`.
- Rule-based execution is filtered by KR/US market-session status.
- Scheduler-triggered trade runs prefilter stocks to currently open KR/US markets and cap the stock candidate count.
- Pending order matching runs independently every 10 minutes, plus dedicated market-open wakeups.
- Daily candle maintenance fills missing `LISTED` stock candles for completed KR/US market days.

## Setup

1. In Vercel, set `CRON_SECRET` or `AGENT_INTERNAL_TOKEN`.
2. In Supabase, enable the `pg_cron` and `pg_net` extensions.
3. In Supabase Vault, create:
   - `chicken_stock_app_url`: `https://chicken-stock-app.vercel.app`
   - `chicken_stock_cron_secret`: the same value as Vercel `CRON_SECRET` or `AGENT_INTERNAL_TOKEN`
4. Run `docs/supabase-scheduler.sql` in the Supabase SQL editor.

## Schedules

- `chicken-stock-run-agent-trade`: every 10 minutes, max 5 executable intents and 30 open-market stocks per run
- `chicken-stock-match-pending`: every 10 minutes, default 5 pending orders per scheduler run
- `chicken-stock-match-pending-kr-open`: weekdays at 00:00 UTC / 09:00 KST, limit 100, guarded by `marketOpenCountry=KR`
- `chicken-stock-match-pending-us-open-dst`: weekdays at 13:30 UTC / 09:30 America/New_York during daylight saving time, limit 100, guarded by `marketOpenCountry=US`
- `chicken-stock-match-pending-us-open-standard`: weekdays at 14:30 UTC / 09:30 America/New_York during standard time, limit 100, guarded by `marketOpenCountry=US`
- `chicken-stock-ensure-daily-candles`: every 30 minutes, backfills missing `LISTED` daily candles for the last 7 completed market days

The US open wakeups are split because Supabase `pg_cron` schedules are UTC-based while New York market open shifts with daylight saving time. The `marketOpenCountry` guard only runs matching during the first 5 minutes after that market's configured open time, so the inactive seasonal wakeup becomes a no-op.

To inspect jobs:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname like 'chicken-stock-%'
order by jobname;
```

To remove jobs:

```sql
select cron.unschedule('chicken-stock-run-agent-trade');
select cron.unschedule('chicken-stock-match-pending');
select cron.unschedule('chicken-stock-match-pending-kr-open');
select cron.unschedule('chicken-stock-match-pending-us-open-dst');
select cron.unschedule('chicken-stock-match-pending-us-open-standard');
select cron.unschedule('chicken-stock-ensure-daily-candles');
```
