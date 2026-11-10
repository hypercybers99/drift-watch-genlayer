# DriftWatch V3: Contract Resubmission Document

**Target Audience**: GenLayer Portal Steward & Review Committee  
**Repository**: `https://github.com/hypercybers99/drift-watch-genlayer`  
**Network**: GenLayer Studionet (Chain ID 61999)  
**Status**: Preview  
**Active DriftWatch V3 Address**: `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`  
**Active DriftGuard V3 Address**: `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`  

---

## 1. Response to Portal Steward Rejection

### Steward Feedback
> "The contract's validators verify only the verdict and a short normalized-hash prefix, while trusting the leader's full hashes and clause snapshots. Those unverified fields are stored and can later become the accepted baseline, so materially different baseline state can pass the same validator check. Please have validators independently recompute and bind every state-bearing hash and clause snapshot before resubmitting."

### Architectural Redesign in V3
We have completely redesigned the consensus state verification in `contracts/DriftWatch.py` to eliminate every trust assumption regarding the leader's state:

1. **Pure Canonical State Helper (`state_view`)**:
   A pure helper function `state_view(...)` formats all state-bearing fields into a canonical JSON representation:
   - `verdict`: final legal verdict (`UNCHANGED`, `COSMETIC`, `NONE`, `MINOR`, `MATERIAL`, `REVIEW`)
   - `gate`: deterministic gate level (`UNCHANGED`, `COSMETIC`, `NONE_SEMANTIC`, `MINOR_SEMANTIC`, `MATERIAL_SEMANTIC`, `REVIEW_PARSE_FAIL`)
   - `norm_hash`: full 64-hex SHA-256 hash of normalized clauses
   - `raw_hash`: full 64-hex SHA-256 hash of raw page body
   - `clauses`: full array of normalized clause text strings
   - `changes`: full array of clause diff objects (`type`, `clause_idx`, `old_text`, `new_text`)
   - `tripwire`: boolean injection detection flag

2. **`set_baseline` Independent Validator Recomputation & Binding**:
   - `validator_fetch(url)` independently issues HTTP GET, extracts text, normalizes clauses, computes hashes, and returns `state_view(...)`.
   - The contract verifies byte-for-byte equality of:
     - `raw_hash` (full 64-hex hash)
     - `norm_hash` (full 64-hex hash)
     - `norm_clauses` (full clause array)
     - `state_view` canonical JSON
   - **Defense-in-depth**: Before storing, the contract independently recomputes `norm_hash(norm_clauses)` and asserts equality against leader `norm_hash`, raising `gl.vm.UserError("baseline state inconsistent")` if any divergence occurs.

3. **`check` Independent Validator Pipeline Execution & Binding**:
   - `validator_run` independently executes the full deterministic pipeline: fetches candidate text, normalizes clauses, computes raw and normalized hashes, compares against the current baseline clauses via `clause_diff`, and evaluates deterministic gates 1 through 4.
   - For checks requiring LLM evaluation (Gate 5), validators independently execute the deterministic baseline comparison and verify that all state-bearing fields match:
     - `verdict` equality
     - `gate` equality
     - `norm_hash` (full 64-hex hash)
     - `raw_hash` (full 64-hex hash)
     - `snapshot_clauses` (full clause array)
     - `changes` (full diff array)
     - `tripwire` (injection flag)
     - `state_view` canonical JSON
   - **Leader-Attested Annotations**: LLM labels (`change_labels`) and redline flags (`redline_flags`) are recorded as leader-attested annotations and do NOT undergo strict equality check across validators to avoid non-deterministic execution failure. However, the resulting legal `verdict` is independently evaluated by validators and strictly bound in `state_view`.
   - **Defense-in-depth**: The contract recomputes `norm_hash(snapshot_clauses)` and `clause_diff(baseline_clauses, snapshot_clauses)`, asserting equality with leader-reported values and raising `gl.vm.UserError("baseline state inconsistent")` upon divergence.
   - **Observation Key Integrity**: `obs_key` is constructed from contract-recomputed hashes rather than trusting leader input.

4. **`accept_change` Baseline Promotion Integrity**:
   - Before advancing the baseline, `accept_change` recomputes `norm_hash(snapshot_clauses)` and validates equality against `chk["norm_hash"]`.
   - If corrupted or mismatched, it raises `gl.vm.UserError("check snapshot does not match its recorded hash")`.
   - The new baseline clauses are stored from the verified normalized clause snapshot.

---

## 2. Reproduction of V2 Vulnerabilities (Evidence)

Prior to implementing V3, all three vulnerabilities identified by the Portal steward were reproduced on the V2 contract logic:
- Reproduction script: `scripts/reproduce_v2_vulnerabilities.py`
- Raw reproduction log: `docs/review_v3/before/reproduction_output.txt`
- Detailed findings: `docs/review_v3/before/REPRODUCTION.md`

### Summary of Vulnerabilities Demonstrated on V2:
1. **`set_baseline` blind spot**: Altered tail bytes in `norm_hash` and altered clause text passed validator check because only 16-hex prefix was compared (`"BASELINE|" + norm_hash[:16]`).
2. **`check` blind spot**: Altered tail bytes, substituted clause snapshots, altered diffs, and altered raw hashes passed validator check because only `verdict + "|" + norm_hash[:16]` was verified.
3. **`accept_change` blind spot**: Corrupted snapshot clauses were accepted as the permanent baseline without verification.

All three blind spots are completely prevented in V3 and covered by 19 unit tests in `tests/test_v3_rejections.py`.

---

## 3. Active Deployment on Studionet

Both contracts were deployed to GenLayer Studionet on 2026-11-10 and verified byte-for-byte against local source code via `eth_getTransactionByHash`:

| Contract | Address | Deploy Tx Hash | SHA-256 | Source Verification |
| :--- | :--- | :--- | :--- | :--- |
| **DriftWatch V3** | `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85` | `0xacbacb426db5a42176c98fce599902f6f320882d994a028975e7b1999d5cb1c7` | `2a2d3ebde7563ba146de73ead1cbdc3b0b52e82cfc60eddce3a595a5ea4c428c` | **EXACT MATCH** (0 diff) |
| **DriftGuard V3** | `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4` | `0xbcbc3aab69f50dc5a1af97daed026fb9eb5da5ceec8533bb8f7a78eddfa8960b` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | **EXACT MATCH** (0 diff) |

Source verification artifact: `scripts/deploy/verification_result_v3.json`.  
Address registry with complete superseded history: `docs/ADDRESS_REGISTRY.md`.

---

## 4. Pre-Registered Availability Gate Results

In accordance with `docs/REVIEW_V3_PLAN.md` section 6, an on-chain availability gate was executed across 3 core fixtures:
- `MATERIAL` (`terms-v2-subtle.md`): 10/10 runs succeeded (100%), 10/10 identical verdicts (100% `MATERIAL`).
- `MINOR` (`terms-v6-salami1.md`): 10/10 runs succeeded (100%), 10/10 identical verdicts (100% `MINOR`).
- `COSMETIC` (`terms-v1-cosmetic.html`): 10/10 runs succeeded (100%), 10/10 identical verdicts (100% `COSMETIC`).

**Overall Availability Gate**: PASSED (30/30 successful on-chain transactions, 30/30 identical verdicts).  
Complete evidence: `docs/evidence_v3/gate/GATE_EVALUATION.md`.

---

## 5. Full On-Chain Fixture Matrix Results

All 14 scenarios from the pre-registration matrix were executed against active V3 contracts on Studionet:

| Scenario | Name | Method | Tx Hash | Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `set_baseline` | `set_baseline` | `0xee39245ec9ae0626353a477a694e26ff27e714ea0cedc22b671535d8636e65ee` | `BASELINE_SET` (PASSED) |
| 2 | `check_unchanged` | `check` | `0x53a4d341d00cc19438cbc0db4bc1eb4eb4ad10a62df0640254beaebb0e6f0021` | `UNCHANGED` (PASSED) |
| 3 | `check_cosmetic` | `check` | `0x320dde9c408c560ed440e2f68c83cb6db52cf51f52b2cf63efaafffe8107cd82` | `COSMETIC` (PASSED) |
| 4 | `check_material_subtle` | `check` | `0xb6b8b0836194971098507a6a3be6a17c05c8142d2261627e38f473ed31bfa42d` | `MATERIAL` (PASSED) |
| 5 | `check_material_obvious` | `check` | `0xf410bb2d8eaf39f7d42d127f1669fd1baac8fa5c2b95d1a9c425548c73246d72` | `MATERIAL` (PASSED) |
| 6 | `check_material_injection` | `check` | `0x29ff8d85469f6f85c74063fca312bddef014a41e848d5fdace31b0c03ecf9889` | `MATERIAL` (PASSED) |
| 7 | `check_none_harmless` | `check` | `0xfd6a42347078a80d54464e4a9fe9ec03ad11d9e5c38cd71a64f1e2051c000fa3` | `NONE` (PASSED) |
| 8 | `check_minor_salami1` | `check` | `0xb90a561bda8010255e532906ab97bede5d05286112539e6383f4c1ad0a681754` | `MINOR` (PASSED) |
| 9 | `check_material_salami2` | `check` | `0x82d18cb3db00d3d6f7610e502da81ccc9c5634d69c1bc75c4a63a2f6d1bdad38` | `MATERIAL` (PASSED) |
| 10 | `duplicate_observation` | `check` | `0x2e92c6a5e76006eb3aae16bafeb6044c0ef5069c698244934884f1e519e7596e` | Reverted on duplicate observation (PASSED) |
| 11 | `host_mismatch` | `update_source` | `0x35f865162c8dc096aa78acc4c8242f333e2b05c76e09a98a4cbba518d5957952` | Reverted on host mismatch (PASSED) |
| 12 | `404_url` | `set_baseline` | `0x193042d54e43ad02ead179061e531e1601a5610a16987165b44955b23d7827a1` | Non-consensus on HTTP 404 (PASSED) |
| 13 | `accept_change_and_verify` | `accept_change` | `0x5eddd6952be1be8b5a905c130325f13c021d92bd68f8b05de14c11551eaaf067` | Baseline seq 2, next `COSMETIC` (PASSED) |
| 14 | `drift_guard_lifecycle` | guard lifecycle | `0x309ad89a1a54d4cc03c58b76f37b4c3bcf15c518c66804e8a074bba6d37823ed` | Complete guard lifecycle verified (PASSED) |

**Overall Fixture Matrix**: 14/14 PASSED. Complete receipts and summary in `docs/evidence_v3/matrix/`.

---

## 6. On-Chain Stats Read-Back

State read-back from `get_stats()` on active contract `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`:
```json
{
  "schema_version": "1",
  "stat_total_checks": "42",
  "stat_verdict_COSMETIC": "13",
  "stat_verdict_MATERIAL": "16",
  "stat_verdict_MINOR": "11",
  "stat_verdict_NONE": "1",
  "stat_verdict_REVIEW": "0",
  "stat_verdict_UNCHANGED": "1"
}
```
Zero parse errors or review fallbacks occurred across all 42 on-chain checks.

---

## 7. Verification Checklist

- [x] All 8 frozen helper functions match byte-for-byte (`scripts/verify_frozen_hashes.py`).
- [x] All 41 unit tests pass (`python -m unittest discover tests`).
- [x] Zero occurrences of banned words (`scripts/scan_banned_words.py`).
- [x] Zero non-ASCII characters in contracts (`scripts/scan_ascii.py`).
- [x] Zero secret leaks or private keys (`scripts/scan_secrets.py`).
- [x] Canonical repository owner is `hypercybers99`.
- [x] Byte-for-byte source verification matches on-chain deployment code (0 diff).
- [x] Status word is Preview.
