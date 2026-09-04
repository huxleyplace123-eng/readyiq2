# Level 0 — running the loop by hand

Who: one credit-repair operator, one or two loan officers, one ReadyIQ operator (you).
Goal: prove that an LO acts on a readiness summary. No portal needed.

## Weekly cadence (operator, 15 minutes)
1. Open your own monitoring dashboard (you already pull this monthly). For each ReadyIQ client, note ONLY:
   disputes open / resolved, whether a round finished, verified rent months, which blockers cleared.
   Never enter a score, a balance, or anything from the report itself — the importer rejects those columns.
2. Fill one row per client in `level-0-template.csv` (consumer_ref is the `c_<id>` ReadyIQ gave you).
3. Send the CSV to ReadyIQ as the raw request body: `curl --data-binary @level-0.csv -H "content-type: text/csv" "http://<rail>/v1/inbound/csv?tenant=<tenant>"` (or hand the file to the ReadyIQ operator, who runs the same command against the local rail started with `npm run rail`).
4. ReadyIQ recomputes each client's stage. Anyone who crosses into **Approaching ready** triggers a
   "recommend soft tri-merge" event to the LO of record.

## When a client is approaching ready
5. Operator presses **Send to mortgage partner** (or, at L0, asks ReadyIQ to `POST /v1/referrals`).
   Client consent is captured first — the checkbox text is `consent.text_version v1`.
   Pick one or MORE loan officers. Never one by default.
6. The LO receives the readiness summary (stage, floors met, DTI in range, rent months, disputes) — no score, no report.
7. The LO requests the formal pull through their normal vendor and records the result:
   `POST /v1/referrals/<id>/outcome?tenant=<tenant> {"outcome":"qualified"|"short"}`.

## What we measure
- Precision: qualified ÷ (qualified + short) from `GET /v1/precision?tenant=<tenant>`. Below ~0.7, widen the buffer.
- Recovered opportunities: referrals with outcome `qualified`. Not logins.

## What we never do at any level
- Pay or receive anything for a referral. Pricing is flat per seat.
- Send a score, a report, income, or account data across the seam.
- Route to a single "preferred" LO.
