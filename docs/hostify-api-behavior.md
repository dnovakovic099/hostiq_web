# Hostify API Behavior Log

> Living document recording every confirmed quirk, failure mode, and workaround.
> Updated every time a new issue is discovered during development or production.
> This is the canonical reference for any developer touching the Hostify integration.

---

## Known Issues

### 2026-02-15 /reservations Limit Parameter Ignored
**Observed**: Passing `?limit=50` or `?limit=100` to `/reservations` endpoint always returns ~20 records per page.
**Expected**: The `limit` parameter should control page size.
**Workaround**: Paginator ignores `limit` and uses `page` as the only control. Terminates on empty page, duplicate records, or safety ceiling.
**Test**: `test/hostify/pagination-stress.test.ts`

### 2026-02-15 /reservations Date Filters Broken
**Observed**: `filters[checkOut]=YYYY-MM-DD`, `check_out_gte`, `check_in_lte` parameters are silently ignored. API returns unfiltered data regardless.
**Expected**: Date filters should narrow the result set.
**Workaround**: Fetch all records (using `listing_id` scope if possible) and filter client-side in Postgres.
**Test**: `test/hostify/filter-reliability.test.ts`

### 2026-02-15 /reservations Status Filter Unreliable
**Observed**: `?status=canceled` does not return expected results. Some cancelled reservations appear, others don't.
**Expected**: Status filter should return all reservations matching the given status.
**Workaround**: Derive reservation status from raw payload fields and event history locally. Never trust Hostify status filter.
**Test**: `test/hostify/filter-reliability.test.ts`

### 2026-02-15 /inbox reservation_id Filter Unreliable
**Observed**: `?reservation_id=X` on the `/inbox` endpoint returns inconsistent results.
**Expected**: Should return threads linked to the given reservation.
**Workaround**: Use `?listing_id=X` and correlate threads to reservations by matching listing, time window, and guest name.
**Test**: `test/hostify/filter-reliability.test.ts`

### 2026-02-15 /listings listing_id is Only Reliable Filter
**Observed**: `listing_id` is the only query parameter that consistently narrows result sets across all endpoints.
**Expected**: All documented filters should work.
**Workaround**: Use `listing_id` as the primary scope for all scoped queries. Fall back to full pagination for cross-listing queries.
**Test**: `test/hostify/completeness.test.ts`

### 2026-02-15 Auth Header Casing Ambiguity
**Observed**: Documentation shows `X-API-Key` but live testing sometimes requires lowercase `x-api-key`.
**Expected**: HTTP headers are case-insensitive per spec, but Hostify's server implementation may be case-sensitive.
**Workaround**: Try `x-api-key` first, fall back to `X-API-Key`, cache whichever works.
**Test**: `test/hostify/auth-header.test.ts`

### 2026-02-15 Webhooks are Amazon SNS
**Observed**: Hostify webhooks use Amazon SNS, not simple HTTP POST. Requires SubscriptionConfirmation flow.
**Expected**: Standard webhook POST.
**Workaround**: Implement SNS message parsing, SubscriptionConfirmation auto-confirmation via GET to SubscribeURL, and SNS signature validation.
**Test**: `test/hostify/webhook-sns.test.ts`

---

## Confirmed Working

| Endpoint | Status | Notes |
|---|---|---|
| `GET /listings` | Working | Returns all 361 listings. Pagination works with `page`. |
| `GET /listings/{id}` | Working | Returns single listing detail. |
| `GET /reservations?listing_id=X` | Working | Reliable filter. Use this as primary path. |
| `GET /reservations?page=X` | Working | Pagination works, but `limit` is ignored. |
| `GET /inbox?listing_id=X` | Working | Reliable filter for thread scope. |
| `GET /inbox/{thread_id}` | Working | Returns thread with messages. |
| `GET /reviews` | Working | Returns all reviews. |
| `GET /reviews?listing_id=X` | Working | Scoped reviews by listing. |
| `GET /calendar/{listing_id}` | Working | Returns availability calendar. |
| `PUT /calendar/{listing_id}/prices` | Needs Testing | Write-read round-trip not yet verified. |
| `GET /reservations/{id}/financials` | Working | Returns financial data per reservation. |
| `GET /payouts` | Working | Returns payout reports. |

---

## Template for New Entries

```
### [Date] [Endpoint] [Issue]
**Observed**: What happened
**Expected**: What should have happened
**Workaround**: What we did
**Test**: Which test covers this
```
