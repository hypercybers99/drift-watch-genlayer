# V2 Consensus Prefix Verification: Reproduction of Portal Steward Findings

**Status**: Verified Before State (V2)  
**Contract Commit**: `88d1d80`  
**Test Suite**: `tests/test_v2_vulnerabilities_reproduce.py`  
**Raw Test Log**: `docs/review_v3/before/reproduction_output.txt`  

---

## 1. Finding 1: `set_baseline` Validator Prefix Check Blind Spot

### Description
In V2 `contracts/DriftWatch.py`, `validator_fetch` compares only:
```python
my_token = "BASELINE|" + norm_hash(norm_clauses)[:16]
return my_token == ldata.get("consensus_token")
```
The leader proposes the full JSON payload:
```python
{
    "consensus_token": "BASELINE|" + nh[:16],
    "norm_hash": nh,
    "raw_hash": rw_hash,
    "norm_clauses": norm_clauses,
}
```
After `gl.vm.run_nondet` returns, `set_baseline` directly assigns the leader's unverified fields:
```python
watch["baseline_norm_hash"] = res_data["norm_hash"]
watch["baseline_raw_hash"] = res_data["raw_hash"]
watch["baseline_clauses"] = res_data["norm_clauses"]
```

### Reproduction
When an altered leader output provides a valid 16-hex prefix in `consensus_token` alongside an altered 48-hex hash tail, altered `raw_hash`, and fabricated `norm_clauses`, `validator_fetch` returns `True`. The altered data is written into the baseline state of the watch without refusal.

---

## 2. Finding 2: `check` Validator Prefix Check Blind Spot

### Description
In V2 `contracts/DriftWatch.py`, `validator_run` compares only:
```python
my_eval = run_eval_pipeline()
return my_eval["consensus_token"] == ldata.get("consensus_token")
```
where `consensus_token = f"{verdict}|{curr_norm_hash[:16]}"`.
The leader's proposal includes `norm_hash` (full 64-hex), `raw_hash`, `gate`, `changes`, `snapshot_clauses`, and `tripwire`. The contract records these fields directly from the leader into the permanent check record:
```python
check_record = {
    ...
    "norm_hash": norm_h,
    "raw_hash16": raw_h[:16],
    "changes": pipeline_data["changes"],
    "gate": pipeline_data["gate"],
    "tripwire": "true" if pipeline_data["tripwire"] else "false",
    "snapshot_clauses": pipeline_data["snapshot_clauses"],
    ...
}
```
In addition, the duplicate-observation index key `obs_key` computes `hashlib.sha256` using the leader's full `norm_h`.

### Reproduction
When an altered leader output provides the correct verdict and matching 16-hex prefix in `consensus_token`, but alters the hash tail, `raw_hash`, `snapshot_clauses`, and `changes`, `validator_run` returns `True`. The altered data is accepted by consensus and permanently recorded in storage.

---

## 3. Finding 3: `accept_change` Unverified Baseline Advancement

### Description
In V2 `contracts/DriftWatch.py`, `accept_change` advances the watch baseline from a stored check:
```python
watch["baseline_norm_hash"] = chk["norm_hash"]
watch["baseline_raw_hash"] = ""
watch["baseline_clauses"] = [normalize_clause(c) for c in chk["snapshot_clauses"]]
```
The contract never verifies that `norm_hash(watch["baseline_clauses"]) == chk["norm_hash"]`.

### Reproduction
If a stored check has an unverified `snapshot_clauses` list that does not match `chk["norm_hash"]`, `accept_change` unconditionally advances the baseline. As demonstrated in unit test 3, the resulting `watch["baseline_norm_hash"]` and `norm_hash(watch["baseline_clauses"])` disagree, producing an inconsistent baseline state that corrupts downstream diffs.

---

## Conclusion
The Portal steward's evaluation is accurate. In V3, validators must independently recompute and bind every state-bearing hash and clause snapshot, and defense-in-depth recomputations must ensure stored state consistency.
