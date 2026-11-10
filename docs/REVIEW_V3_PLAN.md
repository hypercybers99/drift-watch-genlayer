# V3 Contract Redesign Plan: Validator State Binding & Defense-in-Depth

**Document Status**: Pre-Registered Plan (V3)  
**Date**: 2026-11-10  
**Baseline Git Commit**: `3c2a6c7` (derived from `88d1d80`)  
**Network**: GenLayer Studionet (Chain ID 61999)  
**Contract Pair**: DriftWatch V3 & DriftGuard V3  

---

## 1. Problem Statement & Motivation

During review of the Drift Watch submission, the Portal steward observed:
> "The contract's validators verify only the verdict and a short normalized-hash prefix, while trusting the leader's full hashes and clause snapshots. Those unverified fields are stored and can later become the accepted baseline, so materially different baseline state can pass the same validator check. Please have validators independently recompute and bind every state-bearing hash and clause snapshot before resubmitting."

In V2:
1. `set_baseline`: `validator_fetch` compared only `"BASELINE|" + norm_hash(norm_clauses)[:16]`. The leader's full `norm_hash`, `raw_hash`, and full `norm_clauses` list were stored directly without complete validator verification.
2. `check`: `validator_run` compared only `consensus_token = verdict + "|" + norm_hash[:16]`. The leader's full `norm_hash`, `raw_hash`, `gate`, `changes`, `snapshot_clauses`, and `tripwire` were recorded without complete validator verification.
3. `accept_change`: `chk["norm_hash"]` and `chk["snapshot_clauses"]` were copied into the baseline without checking that `norm_hash(snapshot_clauses) == chk["norm_hash"]`.

As demonstrated in `docs/review_v3/before/REPRODUCTION.md`, an altered leader output matching only the 16-hex prefix would be accepted by consensus and permanently recorded in storage.

---

## 2. Frozen Components (Invariants)

To ensure consistency with previous research and audit iterations, the following deterministic and semantic evaluation components are frozen and will NOT be modified:
- `page_text` (HTML/text stripping and normalization)
- `normalize_clause` (whitespace, punctuation, and case folding)
- `split_clauses` (regex-based clause boundary splitting)
- `norm_hash` (order-independent clause list SHA-256)
- `clause_diff` (multiset clause difference isolating modified/added/removed clauses)
- `parse_labels` (strict JSON schema parser)
- `decide` (deterministic precedence: HIT -> MATERIAL -> UNCLEAR -> MINOR/NONE with tripwire floor)
- `injection_tripwire` (heuristic adversarial prompt injection scanner)
- LLM prompt instructions (exact prompt template)

### Baseline SHA-256 Hashes of Frozen Components
- `page_text`: `8b39614a1bb0fc1a6fcc8749982f3f35c7b7c09e7882225ca882b5ad98e5328f`
- `normalize_clause`: `3c286745a08dee07c2b9054a293cc5b43f53810d5a039b2017ec4901836262ef`
- `split_clauses`: `c6d95786ce01519155c675b465168e5820cf036ecf18574b83e085df159b1ff9`
- `norm_hash`: `0a9416943358dd560bedb9c90a1cb405c1c98de265d8cf5d3d76e6f5d32798c7`
- `clause_diff`: `07799833970efe39796729c8e7d5888d479900081ba37e8dfe25ffa33a1846c7`
- `parse_labels`: `7c08655296181d3d5f2d68dc869e6037ea73d87abd2eb38324bd003b39c45c2b`
- `decide`: `4d8f4772a0fb31baf54de49e31b901b2380979ce73efb027142f40722512780f`
- `injection_tripwire`: `2c0d8f99a7350a7c1fc5e075d4e1d7ac11a0434f5c775ac53e7ca3f1c505f1ec`
- `prompt_instructions`: `4247fb350186e33a4226a5f3beee0ca55d11743eacdcf5d88a8670c32a946522` (length: 1232 chars)

---

## 3. V3 Architecture & Detailed Design

### 3.1 Pure Canonical Helper: `state_view(...)`
Introduce a pure helper function:
```python
def state_view(
    verdict: str,
    gate: str,
    norm_hash: str,
    raw_hash: str,
    clauses: list[str],
    changes: list[dict],
    tripwire: bool
) -> dict:
    return {
        "verdict": verdict,
        "gate": gate,
        "norm_hash": norm_hash,
        "raw_hash": raw_hash,
        "clauses": clauses,
        "changes": changes,
        "tripwire": tripwire,
    }
```
`state_view` represents the canonical, deterministic state of an evaluation.

### 3.2 `set_baseline` Design
1. **Independent Validator Computation**:
   In `validator_fetch`, validators independently fetch the target URL, extract clauses, compute normalized clauses, full `norm_hash`, and full `raw_hash`.
2. **Full Canonical State Equality**:
   Validators compare their full canonical state against the leader's proposal:
   - Full 64-hex `norm_hash` must match byte-for-byte.
   - Full 64-hex `raw_hash` must match byte-for-byte.
   - Full `norm_clauses` list must match element-by-element.
   Any deviation causes `validator_fetch` to return `False`.
3. **Defense-in-Depth Storage Check**:
   After `gl.vm.run_nondet` returns, the contract recomputes `norm_hash(res_data["norm_clauses"])`.
   If it does not match `res_data["norm_hash"]`, the contract raises `gl.vm.UserError("baseline state inconsistent")`.

### 3.3 `check` Design
1. **Independent Validator Pipeline**:
   In `validator_run`, validators independently execute the deterministic evaluation pipeline (`web.get`, text extraction, clause splitting, normalization, hashing, cosmetic gating, clause diffing, and prompt injection tripwire).
2. **Full Canonical State Equality**:
   Validators compare their full deterministic evaluation state against the leader's proposal:
   - `verdict` must match.
   - `gate` must match (`UNCHANGED`, `COSMETIC`, `OVERFLOW`, or `""`).
   - Full 64-hex `norm_hash` must match.
   - Full 64-hex `raw_hash` must match.
   - Full `snapshot_clauses` list must match element-by-element.
   - Full `changes` list must match structure-by-structure.
   - `tripwire` boolean flag must match.
3. **Leader-Attested Labels Rationale**:
   The LLM-produced `change_labels` and `redline_flags` are leader-attested metadata and are NOT compared across validators. Rationale:
   - Frontier LLMs exhibit semantic variation on individual classification labels (e.g., MINOR vs MATERIAL on edge-case phrasing).
   - Only the derived `verdict` and the deterministic state feed the contract's state machine, the baseline, `DriftGuard`, and `obs_key`.
   - `change_labels` and `redline_flags` never feed downstream state.
4. **Defense-in-Depth Storage Verification**:
   After `gl.vm.run_nondet` returns, the contract recomputes:
   - `norm_hash([normalize_clause(c) for c in pipeline_data["snapshot_clauses"]])` and asserts equality with `pipeline_data["norm_hash"]`.
   - `clause_diff(baseline_clauses, pipeline_data["snapshot_clauses"])` and asserts equality with `pipeline_data["changes"]`.
   If either recomputation disagrees with the leader proposal, the contract raises `gl.vm.UserError("baseline state inconsistent")`.
5. **Observation Key Generation**:
   `obs_key` is constructed using values recomputed by the contract itself.

### 3.4 `accept_change` Design
Before advancing the baseline:
1. The contract recomputes `recomputed_norm_h = norm_hash([normalize_clause(c) for c in chk["snapshot_clauses"]])`.
2. The contract asserts `recomputed_norm_h == chk["norm_hash"]`.
3. If they disagree, the contract refuses baseline advancement with:
   `gl.vm.UserError("check snapshot does not match its recorded hash")`.
4. The baseline clauses are stored from the recomputed normalized clauses:
   `watch["baseline_clauses"] = [normalize_clause(c) for c in chk["snapshot_clauses"]]`
   `watch["baseline_norm_hash"] = recomputed_norm_h`.

### 3.5 Compared Fields Specification: V2 vs. V3
| Operation | V2 Compared Fields (Prefix Only) | V3 Compared Fields (Full State) |
| :--- | :--- | :--- |
| `set_baseline` | `consensus_token` prefix (`"BASELINE\|" + norm_hash[:16]`) | Full 64-hex `norm_hash`, full 64-hex `raw_hash`, full `norm_clauses` list |
| `check` | `consensus_token` prefix (`verdict + "\|" + norm_hash[:16]`) | `verdict`, `gate`, full 64-hex `norm_hash`, full 64-hex `raw_hash`, full `snapshot_clauses` list, full `changes` list, `tripwire` flag |
| `accept_change` | No hash verification on snapshot | Recomputes `norm_hash(snapshot_clauses)` and requires exact equality with `chk["norm_hash"]` |

---

## 4. Honest Technical Limitations

- **Identical Raw Bytes Requirement**:
  Because V3 requires validators to independently agree on the full 64-hex `raw_hash` and full 64-hex `norm_hash`, monitored web pages must return byte-identical HTTP response payloads across independent validator fetches.
  Commit-pinned raw files (such as GitHub raw URLs with specific commit SHAs) satisfy this requirement.
  Dynamic websites returning randomized nonces, timestamps, or session tokens will fail closed with validator disagreement (`validator disagreed with leader`), preventing baseline corruption.

---

## 5. Pre-Deployment Test Matrix

Before deploying to Studionet, the test suite must execute and pass:
1. **Reproduction Rejection Tests**:
   The three reproduction cases from `tests/test_v2_vulnerabilities_reproduce.py` must now be REJECTED:
   - Altered `norm_hash` tail in `set_baseline` -> rejected.
   - Altered `raw_hash` in `set_baseline` -> rejected.
   - Altered `norm_clauses` in `set_baseline` -> rejected.
   - Altered `norm_hash` tail in `check` -> rejected.
   - Altered `raw_hash` in `check` -> rejected.
   - Altered `changes` in `check` -> rejected.
   - Altered `snapshot_clauses` in `check` -> rejected.
   - Altered `gate` in `check` -> rejected.
   - Altered `tripwire` in `check` -> rejected.
   - Altered `verdict` in `check` -> rejected.
2. **Field-by-Field Alteration Tests**:
   A dedicated test alters each canonical field individually while leaving all other fields honest; each must result in validator refusal (`False`).
3. **Honest Execution Test**:
   Honest leader and honest validator -> `True`.
4. **Matching Prefix with Altered Tail Test**:
   Crafted leader output with matching 16-hex prefix but different tail -> `False`.
5. **Accept Change Snapshot Refusal Test**:
   Mismatched stored snapshot -> raises `gl.vm.UserError("check snapshot does not match its recorded hash")`.
6. **Defense-in-Depth Storage Refusal Test**:
   Mismatched proposal data in `set_baseline` or `check` -> raises `gl.vm.UserError("baseline state inconsistent")`.
7. **Existing Layer Tests**:
   - `test_layer1_pure.py` (including 5000-fuzz cases)
   - `test_layer2_mocked.py` (Direct Mode unit tests using mocked HTTP web responses)
   - `test_layer3_consensus.py` (multi-validator consensus simulation)

---

## 6. Pre-Registered Availability Gate Rule

Before declaring V3 active, an automated availability evaluation will be conducted on-chain on Studionet:
1. **Target Fixtures**:
   - Fixture 1 (`MATERIAL`): `terms-v2-subtle.md` (or `terms-v3-obvious.md`)
   - Fixture 2 (`MINOR`): `terms-v6-salami1.md`
   - Fixture 3 (`COSMETIC`): `terms-v1-cosmetic.html`
2. **Sample Size & Spacing**:
   - 10 `check` transactions per fixture (30 transactions total).
   - Each transaction spaced by at least **7 seconds** to avoid RPC rate-limits.
3. **Passing Criteria (Gate Threshold)**:
   - At least **9 of 10** attempts must succeed (`ACCEPTED`/`FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`) per fixture.
   - The evaluated `verdict` must be **identical in at least 9** of the successful runs for each fixture.
4. **Stop Condition**:
   - If any fixture achieves fewer than 9 successful transactions or fewer than 9 identical verdicts, **STOP**.
   - Document V3 as "tried, not adopted", keep V2 as active, and report raw numbers without altering prompts or parsers.
5. **Informational Metric**:
   - Record and report how often the underlying `change_labels` and `redline_flags` vectors were identical across runs (informational only; labels are leader-attested).

---

## 7. Full On-Chain Fixture Matrix (Post-Gate)

Upon passing the availability gate, V3 will execute the complete pre-registered fixture suite:
1. `set_baseline` on `terms-v0.md`
2. `check` on `terms-v0.md` (`UNCHANGED`)
3. `check` on `terms-v1-cosmetic.html` (`COSMETIC`)
4. `check` on `terms-v2-subtle.md` (`MATERIAL`)
5. `check` on `terms-v3-obvious.md` (`MATERIAL`)
6. `check` on `terms-v4-injection.md` (`MATERIAL`, `tripwire=True`)
7. `check` on `terms-v5-harmless.md` (`NONE`)
8. `check` on `terms-v6-salami1.md` (`MINOR`)
9. `check` on `terms-v7-salami2.md` (`MATERIAL`)
10. `check` duplicate observation (revert `duplicate observation`)
11. `update_source` host mismatch (revert `host mismatch`)
12. `set_baseline` on 404 URL (revert `HTTP status not 200: 404` or unreachable)
13. `accept_change` on check #4, followed by check against new baseline
14. DriftGuard integration: `pin`, `is_safe`, `is_safe_for` (true & false), `acknowledge`, `repin`.
