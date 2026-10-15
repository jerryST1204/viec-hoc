# Test results

## Environment and safety

- Target: dedicated Supabase test project configured in the local environment.
- Test accounts: separate A and B accounts; credentials are read locally and are not written here or printed by the test script.
- Data safety: the integration script creates a uniquely named test task and removes it afterward.
- Browser-only checks require manual interaction and are not claimed as passed by the API integration script.

## Results

Executed on 2026-10-16 against the local app at `http://localhost:3000`. The API/RLS integration run passed at 00:57 and 00:58. The latest Playwright Chromium suite passed (5 passed, 0 failed). No user credentials or tokens are recorded here.

| ID | Check | Expected | Actual |
|---|---|---|---|
| T01 | Open `/tasks` while signed out | Redirect to `/login`, no task data | **PASS** — redirected to `/login`; dashboard heading and task data were absent |
| T02 | Wrong then correct sign-in | Wrong credentials show an error; correct account reaches the list | **PARTIAL** — invalid credentials remained on `/login` and showed the Vietnamese error. Playwright signed in A through the UI and reached `/tasks`; a valid-credentials browser assertion now passes |
| T03 | Create, update, complete, and reload | Persisted API data remains correct after GET reload | **PASS (API + UI)** — API integration verified database persistence; Playwright signed in through the UI, created a unique task, reloaded and found it, edited it, completed it, then deleted it |
| T04 | Empty, whitespace-only, and 121-character titles | API returns 400 without creating rows | **PASS (API validation)** — all three POST requests returned 400 before inserting |
| T05 | Cancel task-delete confirmation | Row remains | Not run in this test session |
| T06 | 390 px viewport and keyboard Tab | No horizontal overflow; controls usable | **PARTIAL** — on `/login`, viewport was 390 px, scroll width was 390 px, and Tab focused an input. Authenticated task-screen controls were not checked |
| T07 | Disconnect network and create a task | Error shown; no false success | Not run in this test session |
| T08 | Missing or invalid bearer token | API returns 401 | **PASS** — GET, POST, PATCH, DELETE each returned 401 for both missing and invalid bearer tokens; response was JSON with `Cache-Control: no-store` |
| T09 | A creates; B lists | B cannot see A's task | **PASS** — B's API list did not contain A's test task |
| T10 | B PATCH/DELETE A's task ID | Both return 404; A's row remains unchanged | **PASS** — B received 404 for PATCH and DELETE; A read back the unchanged task afterward |
| T11 | B directly accesses A's row and attempts owner spoofing | RLS blocks SELECT/UPDATE/DELETE and insert with A's `user_id` | **PASS** — using B's publishable-key client and user token, SELECT returned no A row, UPDATE/DELETE affected no rows, and insert claiming A's `user_id` produced no row |
| T12 | Sign out, then Back/reload | Signed-out task data is not shown | Not run in this test session |

## Running API and RLS integration checks

The API and RLS integration script completed successfully against the configured test project. It signed in the two local test accounts, ran API validation, ownership-isolation, and direct RLS checks, and cleaned up its generated rows. These credentials are stored only in ignored local environment files and are not recorded here:

```dotenv
TEST_USER_A_EMAIL=
TEST_USER_A_PASSWORD=
TEST_USER_B_EMAIL=
TEST_USER_B_PASSWORD=
TEST_BASE_URL=http://localhost:3000
```

With the app running using `npm run dev`, run `npm run test:task-security` to repeat the checks. The script uses the publishable key and A/B access tokens for direct RLS checks; it never uses a service-role key. It fails on any unexpected status or accessible cross-user row and cleans up its uniquely named test rows.

The script checks authenticated API CRUD, reload persistence, invalid titles, invalid-token rejection, cross-user API isolation, and direct RLS behavior. It does not automate browser-only checks T01, T02, T05, T06, T07, or T12.

## Playwright UI/API tests

- Added `TEST_EMAIL_A` and `TEST_PASSWORD_A` to the ignored `.env.local` using the configured test account A values; values are intentionally omitted from this report.
- Run `npx playwright test --project=chromium`.
- Latest result: **5 passed, 0 failed**. The task test signed in through the UI, created a uniquely named database row, reloaded, edited, completed, and deleted it. `afterEach` removes only the unique row ID created by that test if it remains.
- The API tests confirmed missing-token `401` and authenticated invalid-title `400`.
- Browser-only T05 (cancel confirmation), T06 at 390 px on the authenticated task screen, T07 (offline behavior), and T12 (Back/reload after sign-out) are still not covered by this suite.
