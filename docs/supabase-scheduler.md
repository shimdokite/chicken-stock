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
- Pending order matching runs independently every 10 minutes.

## Setup

1. In Vercel, set `CRON_SECRET` or `AGENT_INTERNAL_TOKEN`.
2. In Supabase, enable the `pg_cron` and `pg_net` extensions.
3. In Supabase Vault, create:
   - `chicken_stock_app_url`: `https://chicken-stock-app.vercel.app`
   - `chicken_stock_cron_secret`: the same value as Vercel `CRON_SECRET` or `AGENT_INTERNAL_TOKEN`
4. Run `docs/supabase-scheduler.sql` in the Supabase SQL editor.

## Schedules

- `chicken-stock-run-agent-trade`: every 10 minutes, max 5 executable intents and 30 open-market stocks per run
- `chicken-stock-match-pending`: every 10 minutes, default 10 pending orders per run

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
```
