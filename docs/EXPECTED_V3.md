# Pre-Registered Expectations Matrix (V3)

**Status**: Pre-Registered Expectations (V3)  
**Date**: 2026-11-10  
**Repository**: `hypercybers99/drift-watch-genlayer`  
**Fixtures Repository**: `https://github.com/hypercybers99/drift-watch-fixtures`  
**Fixtures Commit**: `c8ff0f0cf8b5e406a44baad04867cb793c52d328`  
**Network**: GenLayer Studionet (Chain ID 61999)  

---

## 1. On-Chain Evaluation Expectations (Acme Notes Terms)

All test cases are evaluated against Acme Notes red lines:
1. "Must not allow sharing of identifiable or non-anonymized user data with third parties."
2. "Must not keep deleted user data for more than 90 days."
3. "Must keep the right of users to export or delete their data."
4. "Must not permit selling personal data."

### Fixture Matrix & Expected Outputs

| Fixture File | Description | Expected Gate | Expected Changes | Expected Redline Hits | Expected Verdict | Expected Consensus Outcome |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `terms-v0.md` | Initial baseline terms | N/A (`set_baseline`) | 0 | 0 | `ACTIVE` | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v0.md` | Re-fetch unchanged terms | `UNCHANGED` | 0 | 0 | `UNCHANGED` | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v1-cosmetic.html` | Markdown to HTML, clause reordering | `COSMETIC` | 0 | 0 | `COSMETIC` | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v2-subtle.md` | Drops 'anonymized' qualification | `""` (Evaluated) | 1 (`MODIFIED`) | RL1 `HIT` | `MATERIAL` | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v3-obvious.md` | Adds mandatory binding arbitration & removes 30-day notice | `""` (Evaluated) | 2 (`MODIFIED`) | RL1 `HIT` / general | `MATERIAL` | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v4-injection.md` | Adversarial injection ordering cosmetic label | `""` (Evaluated) | 4 (`MODIFIED`) | Tripwire `True` | `MATERIAL` (or `REVIEW` floor) | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v5-harmless.md` | Clarifies support response time SLA (24h to 48h) | `""` (Evaluated) | 1 (`MODIFIED`) | None (`CLEAR`) | `NONE` | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v6-salami1.md` | Salami Step 1: increases retention from 30 to 60 days | `""` (Evaluated) | 1 (`MODIFIED`) | None (`CLEAR`, <= 90d) | `MINOR` | `ACCEPTED`, `MAJORITY_AGREE` |
| `terms-v7-salami2.md` | Salami Step 2: increases retention from 60 to 120 days | `""` (Evaluated) | 2 (cumulative vs baseline) | RL2 `HIT` (> 90d) | `MATERIAL` | `ACCEPTED`, `MAJORITY_AGREE` |

---

## 2. Expected Gate & Defensive UserError Reverts

| Test Case | Method | Trigger Condition | Expected Revert Reason |
| :--- | :--- | :--- | :--- |
| Duplicate observation | `check(wid)` | Calling `check` twice on the exact same page state | `duplicate observation: already recorded in check <id>` |
| Host mismatch | `update_source(wid, url)` | Attempting to switch host (e.g. github.com to evil.com) | `host mismatch: new URL host must match existing host` |
| 404 Not Found | `set_baseline(wid)` | Source returns HTTP 404 | `HTTP status not 200: 404` (or `source unreachable`) |
| Unchanged accept | `accept_change(wid, cid)` | Attempting to advance baseline on `UNCHANGED` check | `cannot accept UNCHANGED check as baseline` |
| Non-owner write | `accept_change(wid, cid)` | Caller is not watch owner | `not owner` |
| Mismatched snapshot hash | `accept_change(wid, cid)` | Snapshot clauses do not match recorded `norm_hash` | `check snapshot does not match its recorded hash` |
| Mismatched proposal data | `set_baseline` / `check` | Proposal data inconsistent with recomputed values | `baseline state inconsistent` |

---

## 3. DriftGuard Consumer Invariant Expectations

| Step | Method | Guard State Before | Call Arguments | Expected Guard State After |
| :--- | :--- | :--- | :--- | :--- |
| Pin baseline | `pin(wid)` | Not pinned | `[wid]` | `pinned_baseline_norm_hash` bound |
| Safe check | `is_safe(pinner, wid)` | Pinned at v0 | N/A | `{"safe": "true", "reason": "OK"}` |
| Material drift alarm | `check(wid)` (v2) | `is_safe == true` | N/A | `{"safe": "false", "reason": "ALARM", "latest_verdict": "MATERIAL"}` |
| Synchronous check | `is_safe_for(...)` | Alarm active | Matching hashes | `false` |
| Synchronous check | `is_safe_for(...)` | Alarm active | Altered baseline hash | `false` |
| Acknowledge | `acknowledge(wid, cid)` | Alarm active | `[wid, cid]` | `acknowledged_check_id = cid` |
| Safe after ack | `is_safe(pinner, wid)` | Acknowledged | N/A | `{"safe": "true", "reason": "ACKNOWLEDGED"}` |
| Synchronous check after ack | `is_safe_for(...)` | Acknowledged | Matching hashes | `true` |
| Repin after accept | `repin(wid)` | Old baseline pinned | `[wid]` | `pinned_baseline_seq` updated, `acknowledged_check_id = "0"` |
