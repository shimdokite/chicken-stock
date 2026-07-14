# Vercel 서울 리전 Preview 검증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vercel Functions를 Supabase와 같은 서울 리전(`icn1`)에서 실행하는 Preview를 만들고, Production 대비 페이지·캔들·호가 응답 시간을 안전하게 비교한다.

**Architecture:** 프로젝트 수준의 `vercel.json` 지역 설정 하나만 변경해 모든 Node.js Functions를 `icn1`에 배치한다. Preview와 Production이 같은 서울 Supabase를 사용하는지 먼저 확인한 뒤, GET 요청만으로 동일 엔드포인트의 cold/warm, cache MISS/HIT, API 계약을 비교한다.

**Tech Stack:** Next.js 16.2.6, Vercel Functions/CLI, Prisma 6.19.3, Supabase PostgreSQL, Node.js 24, curl

## Global Constraints

- Production 배포 또는 Production alias 변경을 하지 않는다.
- React 컴포넌트, CSS, 레이아웃, 문구를 수정하지 않는다.
- 인증, cookie, 주문, React Query, polling, realtime 코드를 수정하지 않는다.
- DB migration, seed, 주문 생성 또는 다른 데이터 쓰기를 실행하지 않는다.
- Preview/Production 환경변수 원문을 출력하거나 저장소에 기록하지 않는다.
- 성능 검증은 GET 요청만 사용하고 각 요청에 최대 20초 제한을 둔다.
- 로그인·비로그인 API 계약을 모두 고려하되 Preview OAuth/cookie 설정은 변경하지 않는다.
- 각 Task 완료 후 결과를 검토하고, Production 배포나 다음 최적화 단계 전에는 반드시 사용자 승인을 받는다.

---

### Task 1: 격리 작업공간과 비교 기준 준비

**Files:**
- Read: `.gitignore`
- Read: `.env.local`
- Read: `.vercel/project.json`
- Read: `docs/superpowers/specs/2026-07-15-vercel-icn1-preview-design.md`
- Create outside repository: `/private/tmp/chicken-stock-production.env`
- Create outside repository: `/private/tmp/chicken-stock-preview.env`

**Interfaces:**
- Consumes: Vercel project link and Production/Preview `DATABASE_URL` environment variables
- Produces: isolated branch/worktree, matching sanitized DB connection metadata, Production timing baseline

- [ ] **Step 1: Create an isolated worktree**

Invoke `superpowers:using-git-worktrees` and obtain user consent to use the external temporary path so `.gitignore` does not need to change. Then run from the main checkout:

```bash
git worktree list
git branch --list 'codex/vercel-icn1-preview'
git worktree add /private/tmp/chicken-stock-vercel-icn1-preview -b codex/vercel-icn1-preview
```

Do not edit the main checkout after entering the worktree.

Expected: the implementation runs at `/private/tmp/chicken-stock-vercel-icn1-preview` on `codex/vercel-icn1-preview`.

- [ ] **Step 2: Install dependencies and restore ignored local configuration**

Run:

```bash
ln -s /Users/doyeon/Downloads/chicken-stock/.env.local /private/tmp/chicken-stock-vercel-icn1-preview/.env.local
ln -s /Users/doyeon/Downloads/chicken-stock/.vercel /private/tmp/chicken-stock-vercel-icn1-preview/.vercel
cd /private/tmp/chicken-stock-vercel-icn1-preview
npm install
```

Make `.env.local` and `.vercel/project.json` available in the isolated worktree using the original checkout's existing files without printing their contents.

Expected: dependencies are installed, the Vercel project is linked, and production build commands can resolve required environment variables.

- [ ] **Step 3: Verify the clean baseline build**

Run in the isolated worktree before changing configuration:

```bash
npm run build
git status --short
```

Expected: Prisma generation and Next.js build succeed and the worktree remains clean. If the baseline build fails, stop and ask whether to investigate or proceed.

- [ ] **Step 4: Pull scoped Vercel environments into temporary files**

Run:

```bash
vercel env pull /private/tmp/chicken-stock-production.env --environment=production --yes
vercel env pull /private/tmp/chicken-stock-preview.env --environment=preview --yes
```

Expected: both commands succeed without printing secret values.

- [ ] **Step 5: Compare only sanitized database connection metadata**

Run:

```bash
node -e "const fs=require('node:fs'); const dotenv=require('dotenv'); for (const name of ['production','preview']) { const values=dotenv.parse(fs.readFileSync('/private/tmp/chicken-stock-'+name+'.env')); const url=new URL(values.DATABASE_URL); console.log(JSON.stringify({environment:name,hostname:url.hostname,port:url.port||'default',pooler:url.hostname.endsWith('.pooler.supabase.com')})); }"
```

Expected for both environments:

```text
hostname=aws-1-ap-northeast-2.pooler.supabase.com
port=5432 or 6543
pooler=true
```

If hostnames differ or either hostname is not in `ap-northeast-2`, stop without changing `vercel.json` and report the mismatch.

- [ ] **Step 6: Remove temporary environment files**

Run:

```bash
rm -f /private/tmp/chicken-stock-production.env /private/tmp/chicken-stock-preview.env
```

Expected: both temporary files no longer exist.

- [ ] **Step 7: Record a fresh Production baseline**

Run each endpoint five times with a 20-second limit:

```bash
for path in '/stock/67/order' '/api/stocks/67/candles?interval=DAY' '/api/stocks/67/order-book'; do
  for run in 1 2 3 4 5; do
    curl --max-time 20 -sS -o /dev/null -w "production path=$path run=$run status=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n" "https://chicken-stock-app.vercel.app$path"
  done
done
```

Then inspect cache and region headers once per endpoint:

```bash
curl --max-time 20 -sS -D - -o /dev/null 'https://chicken-stock-app.vercel.app/stock/67/order'
curl --max-time 20 -sS -D - -o /dev/null 'https://chicken-stock-app.vercel.app/api/stocks/67/candles?interval=DAY'
curl --max-time 20 -sS -D - -o /dev/null 'https://chicken-stock-app.vercel.app/api/stocks/67/order-book'
```

Expected: all three return `200`; serverless MISS responses identify `iad1` as the function execution region.

### Task 2: 서울 리전 설정을 테스트 주도로 추가

**Files:**
- Modify: `vercel.json:1`

**Interfaces:**
- Consumes: confirmed Seoul Production/Preview database metadata from Task 1
- Produces: project-level Vercel configuration `{ "regions": ["icn1"] }`

- [ ] **Step 1: Run the configuration assertion before editing**

Run:

```bash
node -e "const fs=require('node:fs'); const config=JSON.parse(fs.readFileSync('vercel.json','utf8')); if (JSON.stringify(config.regions)!==JSON.stringify(['icn1'])) { console.error('Expected regions=[icn1]'); process.exit(1); }"
```

Expected: FAIL with `Expected regions=[icn1]` because the current file is `{}`.

- [ ] **Step 2: Add the minimal project-level region configuration**

Change `vercel.json` to exactly:

```json
{
  "regions": ["icn1"]
}
```

Do not add route-level region declarations or change any application file.

- [ ] **Step 3: Re-run the configuration assertion**

Run the same Node assertion from Step 1.

Expected: exit code `0` with no output.

- [ ] **Step 4: Validate JSON and diff scope**

Run:

```bash
node -e "JSON.parse(require('node:fs').readFileSync('vercel.json','utf8')); console.log('vercel.json valid')"
git diff --check
git status --short
```

Expected: valid JSON, no whitespace errors, and `vercel.json` is the only application/configuration file modified.

- [ ] **Step 5: Commit the region configuration**

Run:

```bash
git add vercel.json
git commit -m "Perf: Vercel 함수를 서울 리전에 배치"
```

Expected: one commit containing only `vercel.json`.

### Task 3: 로컬 회귀 검증

**Files:**
- Read: `package.json`
- Read: build output
- Test: entire Next.js production build

**Interfaces:**
- Consumes: `regions: ["icn1"]` from Task 2
- Produces: evidence that the configuration does not change TypeScript, rendering, authentication, or build behavior

- [ ] **Step 1: Run the production build**

Run:

```bash
npm run build
```

Expected: Prisma generation and Next.js build complete successfully with exit code `0`.

- [ ] **Step 2: Verify UI and authentication files are untouched**

Run:

```bash
git diff HEAD~1 --name-only
git show --stat --oneline HEAD
git status --short
```

Expected: the implementation commit contains only `vercel.json`; no file under `app/` is changed; the worktree is clean.

If the build fails for a pre-existing or environment-specific reason, stop and report the exact failure before deploying.

### Task 4: Preview 배포와 리전 확인

**Files:**
- No repository file changes
- External state: one Vercel Preview deployment

**Interfaces:**
- Consumes: clean, build-passing commit from Task 3
- Produces: Preview deployment URL and deployment ID running in `icn1`

- [ ] **Step 1: Create a Preview deployment**

Run without `--prod` and persist only the emitted Preview URL in `/private/tmp`:

```bash
vercel deploy --yes | tail -n 1 | tee /private/tmp/chicken-stock-preview-url
```

Expected: a Preview URL is returned and `chicken-stock-app.vercel.app` remains assigned to the existing Production deployment.

- [ ] **Step 2: Inspect the Preview deployment**

Run:

```bash
PREVIEW_URL="$(tr -d '\n' < /private/tmp/chicken-stock-preview-url)"
vercel inspect "$PREVIEW_URL"
```

Expected: deployment target is Preview, status is `Ready`, and serverless function build entries show `[icn1]`.

If the deployment is not Ready or functions remain in `iad1`, stop before performance measurement and report the deployment details.

### Task 5: Production–Preview 성능 및 계약 비교

**Files:**
- No repository file changes
- Read: Production and Preview HTTP responses

**Interfaces:**
- Consumes: Production baseline from Task 1 and `icn1` Preview URL from Task 4
- Produces: cold/warm timing comparison, cache/region evidence, anonymous and authenticated-contract risk assessment

- [ ] **Step 1: Measure the Preview endpoints five times**

For an unprotected deployment, run:

```bash
PREVIEW_URL="$(tr -d '\n' < /private/tmp/chicken-stock-preview-url)"
for path in '/stock/67/order' '/api/stocks/67/candles?interval=DAY' '/api/stocks/67/order-book'; do
  for run in 1 2 3 4 5; do
    curl --max-time 20 -sS -o /dev/null -w "preview path=$path run=$run status=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n" "$PREVIEW_URL$path"
  done
done
```

If deployment protection returns `401`, use the linked-project CLI without changing protection settings:

```bash
PREVIEW_URL="$(tr -d '\n' < /private/tmp/chicken-stock-preview-url)"
vercel curl '/stock/67/order' --deployment "$PREVIEW_URL" -- --max-time 20 -sS -o /dev/null -w 'status=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n'
vercel curl '/api/stocks/67/candles?interval=DAY' --deployment "$PREVIEW_URL" -- --max-time 20 -sS -o /dev/null -w 'status=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n'
vercel curl '/api/stocks/67/order-book' --deployment "$PREVIEW_URL" -- --max-time 20 -sS -o /dev/null -w 'status=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n'
```

Repeat each protected request five times.

Expected: all page/public API responses return `200`; warm medians improve relative to Production, especially candles and cache-MISS order book responses.

- [ ] **Step 2: Confirm execution region and cache behavior**

Inspect headers for each Preview endpoint using `curl -D -` or `vercel curl ... -- -D -`.

Expected: `x-vercel-id` identifies `icn1` function execution for serverless MISS responses. Record `x-vercel-cache` separately for MISS and HIT comparisons.

- [ ] **Step 3: Compare public API contracts**

Run:

```bash
PREVIEW_URL="$(tr -d '\n' < /private/tmp/chicken-stock-preview-url)"
PREVIEW_URL="$PREVIEW_URL" node -e "const urls=['https://chicken-stock-app.vercel.app',process.env.PREVIEW_URL]; Promise.all(urls.flatMap(base=>['/api/stocks/67/candles?interval=DAY','/api/stocks/67/order-book'].map(async path=>{const response=await fetch(base+path); const body=await response.json(); return {base,path,status:response.status,ok:body.ok,dataKeys:Object.keys(body.data||{}).sort()};}))).then(rows=>console.log(JSON.stringify(rows,null,2)))"
```

For protected Preview deployments, fetch the same bodies with `vercel curl` and compare `status`, `ok`, and the sorted keys under `data` manually without persisting response data.

Expected: Production and Preview have the same status, `ok`, and top-level `data` keys.

- [ ] **Step 4: Verify anonymous order contract without retries or writes**

Run one GET against each environment:

```bash
PREVIEW_URL="$(tr -d '\n' < /private/tmp/chicken-stock-preview-url)"
curl --max-time 20 -sS -o /dev/null -w 'production-orders status=%{http_code}\n' 'https://chicken-stock-app.vercel.app/api/stocks/67/orders'
curl --max-time 20 -sS -o /dev/null -w 'preview-orders status=%{http_code}\n' "$PREVIEW_URL/api/stocks/67/orders"
```

For a protected Preview deployment, use `vercel curl` for the Preview request.

Expected: both application requests return `401` from the order API. Do not call refresh, POST, DELETE, or mutation endpoints.

- [ ] **Step 5: Assess logged-in behavior without changing Preview OAuth**

Review the final diff and deployment configuration.

Expected evidence:

- no authentication, cookie, query, order, React, or CSS file changed;
- all Node.js functions, including authenticated `/api/stocks/[stockId]/orders`, are deployed in `icn1`;
- Preview OAuth/cookie settings were not altered to manufacture a login session.

Record that actual logged-in `/orders` latency must be measured with the existing Production session only after separate Production deployment approval.

- [ ] **Step 6: Verify repository state**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: worktree clean; no measurement artifact or secret file is tracked.

### Task 6: 1단계 결과 보고 및 중단

**Files:**
- No repository file changes

**Interfaces:**
- Consumes: all evidence from Tasks 1–5
- Produces: user-facing cause/decision/result report and an explicit approval gate

- [ ] **Step 1: Report the cause and decision**

State the observed Production execution region, confirmed DB region, and why project-level `regions: ["icn1"]` was selected over Dashboard or route-level configuration.

- [ ] **Step 2: Report measured results**

Provide a table for page, candles, and order book showing Production and Preview cold/warm timings, median changes, cache status, and execution region. Separate measured facts from remaining hypotheses.

- [ ] **Step 3: Report regression and scope checks**

Explicitly state build status, API contract status, anonymous order status, logged-in validation limitation, design-change status, repository files changed, commit, and Preview URL.

- [ ] **Step 4: Stop and ask for approval**

Do not deploy to Production and do not begin dynamic import/query changes. Ask whether to promote the region change to Production. If the user declines, leave the Preview and branch intact unless asked to clean them up.
