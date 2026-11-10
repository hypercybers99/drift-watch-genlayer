# DriftWatch & DriftGuard V3: Final Verification & Resubmission Report

**Network**: GenLayer Studionet (Chain ID 61999)  
**Status**: Preview  
**Contract Repository**: `https://github.com/hypercybers99/drift-watch-genlayer` (tag `dw-v3`)  
**dApp Repository**: `https://github.com/hypercybers99/drift-watch-app` (tag `drift-watch-app-v3`)  
**Production dApp URL**: [https://drift-watch-app.vercel.app](https://drift-watch-app.vercel.app)  
**Active DriftWatch V3**: `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`  
**Active DriftGuard V3**: `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`  

---

## 1. Executive Summary & Response to Portal Steward Rejection

### Steward Feedback
> "The contract's validators verify only the verdict and a short normalized-hash prefix, while trusting the leader's full hashes and clause snapshots. Those unverified fields are stored and can later become the accepted baseline, so materially different baseline state can pass the same validator check. Please have validators independently recompute and bind every state-bearing hash and clause snapshot before resubmitting."

### Architectural Resolution in V3
In DriftWatch V3, all state-bearing fields are independently recomputed and strictly bound across validators:
1. **Canonical State View (`state_view`)**: Formats all 7 core fields (`verdict`, `gate`, `norm_hash`, `raw_hash`, `snapshot_clauses`, `changes`, `tripwire`) into a canonical JSON object.
2. **Independent Validator Recomputation in `set_baseline`**: Validators independently fetch remote URL content, split clauses, compute normalized 64-hex SHA-256 hashes, and verify exact equality of raw hashes, normalized hashes, clause arrays, and canonical state views.
3. **Independent Validator Pipeline Execution in `check`**: Validators independently execute deterministic gates 1 through 4 and assert strict consensus on full hashes, clause snapshots, clause diff arrays, and final legal verdict. Non-deterministic LLM annotations (`change_labels`, `redline_flags`) are recorded as leader-attested annotations.
4. **Integrity Validation in `accept_change`**: Recomputes `norm_hash` from the stored snapshot clauses and asserts equality with recorded `chk["norm_hash"]` before advancing the baseline sequence.
5. **Defense-in-Depth UserError Guards**: Raises `gl.vm.UserError("baseline state inconsistent")` and `gl.vm.UserError("check snapshot does not match its recorded hash")` if any state divergence is detected.

---

## 2. On-Chain Deployments & Byte-for-Byte Source Verification

Source verification was executed via JSON-RPC query `eth_getTransactionByHash` against Studionet, decoding `result.data.contract_code` (base64) and comparing SHA-256 hashes against local repository files:

| Contract | Address | Deploy Tx Hash | Local SHA-256 | On-Chain Decoded SHA-256 | Result | Explorer Link |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DriftWatch V3** | `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85` | `0xacbacb426db5a42176c98fce599902f6f320882d994a028975e7b1999d5cb1c7` | `2a2d3ebde7563ba146de73ead1cbdc3b0b52e82cfc60eddce3a595a5ea4c428c` | `2a2d3ebde7563ba146de73ead1cbdc3b0b52e82cfc60eddce3a595a5ea4c428c` | **EXACT MATCH** (0 diff) | [0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85](https://explorer-studio.genlayer.com/address/0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85) |
| **DriftGuard V3** | `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4` | `0xbcbc3aab69f50dc5a1af97daed026fb9eb5da5ceec8533bb8f7a78eddfa8960b` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | **EXACT MATCH** (0 diff) | [0x4D2123ac8Ceb59967B2009ab7A261C290348abC4](https://explorer-studio.genlayer.com/address/0x4D2123ac8Ceb59967B2009ab7A261C290348abC4) |

### Superseded Deployments

| Iteration | DriftWatch | DriftGuard | Status | Reason |
| :--- | :--- | :--- | :--- | :--- |
| **Iteration 1** | `0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD` | `0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557` | Superseded | Replaced by V3 full validator state binding in response to Portal steward rejection. |
| **Iteration 0** | `0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf` | `0x02167c91C7054F7503Ea38200eD293003A8E9e4F` | Superseded | Enhanced prompt instructions in Iteration 1 to enforce flat string array schemas. |

---

## 3. Pre-Registered Availability Gate Evaluation (V3)

Executed 30 consecutive on-chain runs across 3 core fixtures on Studionet according to pre-registered rules in `docs/REVIEW_V3_PLAN.md` section 6:

| Fixture | Expected Verdict | Successful Runs | Success Rate | Identical Verdicts | Verdict Identity Rate | Gate Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MATERIAL** | `MATERIAL` | 10/10 | 100.0% | 10/10 | 100.0% | **PASSED** |
| **MINOR** | `MINOR` | 10/10 | 100.0% | 10/10 | 100.0% | **PASSED** |
| **COSMETIC** | `COSMETIC` | 10/10 | 100.0% | 10/10 | 100.0% | **PASSED** |

**Overall Availability Gate:** PASSED (30/30 runs succeeded, 30/30 verdicts matched expected value).

### Availability Gate Run-by-Run Breakdown

| Fixture | Run | Tx Hash | Elapsed (s) | Status | Leader Model | Evaluated Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MATERIAL | 1 | `0xd8ffe6c0a2810630464301419778ea65011a7b5ee71f40933af5c396c9eb3865` | 63.32 | `ACCEPTED` | `openai/gpt-5.4` | `MATERIAL` |
| MATERIAL | 2 | `0x89521ced4c621a1f507c07cea9824a28d85569e1e83cdba657bb5bdbfea8f3cc` | 51.44 | `ACCEPTED` | `policy:prd-qwen` | `MATERIAL` |
| MATERIAL | 3 | `0x9e417ffc7b36ebebe90351fa3ec84341d35b660ae571db9ddc7bf2c2a6f1fada` | 13.66 | `ACCEPTED` | `openai/gpt-5.4` | `MATERIAL` |
| MATERIAL | 4 | `0xcc06c14abd1392949bc2e647bb998eef4ad6346169a12ac9b1da48acd8b0a911` | 13.59 | `ACCEPTED` | `policy:prd-sonnet` | `MATERIAL` |
| MATERIAL | 5 | `0x3f28f28dc037332d8bf884dae2b14d9c11c146a3728de2fe68ab04f051008818` | 20.98 | `ACCEPTED` | `policy:prd-grok` | `MATERIAL` |
| MATERIAL | 6 | `0x09c4ffeae4031be7f764ccea9487021760b4642fe47ec10f772fe7e944c2cf48` | 21.03 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MATERIAL` |
| MATERIAL | 7 | `0x405cf2d06ccca648c48e5a77acb6eca242727639e11567510dfe1ec38cd9f2a1` | 17.05 | `ACCEPTED` | `policy:prd-mistral` | `MATERIAL` |
| MATERIAL | 8 | `0x7e7e95c35e61c6ffed8e1bbedc800f54aab7dd09fd490468ddcd4a506c3a1bc2` | 13.14 | `ACCEPTED` | `policy:prd-gemma` | `MATERIAL` |
| MATERIAL | 9 | `0xfa04f6c8e5d817d611b28dae814c99e20b061fc9a07cfc74a7b6c67c294a864f` | 17.05 | `ACCEPTED` | `policy:prd-sonnet` | `MATERIAL` |
| MATERIAL | 10 | `0x95bae010a0a5d93ec2d105007f3d0ab998f06e2ab671563d6cb50cf130ff7f63` | 20.92 | `ACCEPTED` | `policy:prd-kimi` | `MATERIAL` |
| MINOR | 1 | `0xecca78a3d0ccb1960bb994db618d916561cfcc3a5bd37201b13d772f2ad1f138` | 32.45 | `ACCEPTED` | `policy:prd-grok` | `MINOR` |
| MINOR | 2 | `0x2ec166f789ab7245956b81a94b883b39df48387f6287dbea406f4d800ae2ec4c` | 55.70 | `ACCEPTED` | `policy:prd-glm` | `MINOR` |
| MINOR | 3 | `0x12767885c0d41541f53caa5337c10a865a00a8208353e6f02f5c8a4be642b376` | 17.10 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` |
| MINOR | 4 | `0xa3f2f31cec86b7e4dd78b541c114ba4cdfa0555bdab882e7d36619c84ca082ef` | 17.04 | `ACCEPTED` | `openai/gpt-5.4` | `MINOR` |
| MINOR | 5 | `0x76986101b80faa861039cd84856fc64391daa43a73f423b3d66e380328c75ae1` | 24.76 | `ACCEPTED` | `policy:prd-gemini` | `MINOR` |
| MINOR | 6 | `0x8cfa3888ff31f9ca394820102bc3442d768bdb968189735c13650ef9c2060f67` | 28.59 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` |
| MINOR | 7 | `0xe91c6fa3149fc2bd182932cdbed6e803b73bd8c733dbc21acd251301f909ea57` | 17.10 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` |
| MINOR | 8 | `0x6a6ba7be6e09898117b9e8b9a1b47e33266b132d83cfe36d84aef2b4190fa0a4` | 36.07 | `ACCEPTED` | `policy:prd-kimi` | `MINOR` |
| MINOR | 9 | `0x58f7f647980b958a1a5883485afeac6579b735235a8ddb69edef90beef49a878` | not measured | `FINALIZED` | `policy:prd-gpt-5-4` | `MINOR` |
| MINOR | 10 | `0x4bb7e522702d31659c29e80e30c859282cae78340c1d543571d6fc9ce95ec26e` | 28.64 | `ACCEPTED` | `google/gemini-3-flash-preview` | `MINOR` |
| COSMETIC | 1 | `0x8a64ca85ba90b9d2d062ef81e4ad297f7001654fef814fd885cc4970db4e40a7` | 9.70 | `ACCEPTED` | `policy:prd-sonnet` | `COSMETIC` |
| COSMETIC | 2 | `0xc066bc44fb8723e278cc322c658566c8bf85ae9e832d7d6af4e827afd276b084` | 9.72 | `ACCEPTED` | `openai/gpt-5.4` | `COSMETIC` |
| COSMETIC | 3 | `0x27ef270377856969792eb2b41b1cebb1203ec7da57eee1df6294f19b3244d050` | 9.49 | `ACCEPTED` | `policy:prd-gemma` | `COSMETIC` |
| COSMETIC | 4 | `0x96493d9822227b8b77f7a51e48c0b9271b550a7e9759cdb117b6e9546b1880bc` | 14.29 | `ACCEPTED` | `policy:prd-gpt-5-4` | `COSMETIC` |
| COSMETIC | 5 | `0x23dbc3ce749a5d1bf239d1d89600eb811f480dc5705f5e7e695ea164798b6a46` | 13.37 | `ACCEPTED` | `policy:prd-qwen` | `COSMETIC` |
| COSMETIC | 6 | `0xae51bf2d721d4a35f64474e303844b9471c3c50389ee0406971c202729e559c9` | 13.28 | `ACCEPTED` | `policy:prd-qwen` | `COSMETIC` |
| COSMETIC | 7 | `0xefb30930a523b799c83b1529ac84155b31102bf763cf54cb5c5bafb01959418a` | 9.49 | `ACCEPTED` | `policy:prd-gpt-oss` | `COSMETIC` |
| COSMETIC | 8 | `0xed519411d2d3de0b87e71da8b70215fe2d0e183c2840eae6958f7deb58945c10` | 13.45 | `ACCEPTED` | `policy:prd-mistral` | `COSMETIC` |
| COSMETIC | 9 | `0x8f4f2cf5881ffc542aed11fc3602b2e84eab76a99ad9379fc0ec266d1af2d8ce` | 13.35 | `ACCEPTED` | `policy:prd-sonnet` | `COSMETIC` |
| COSMETIC | 10 | `0xb4ec94a8e2229e43cda3db1f5d7e52bf685f0f10b0504e436f5cf92a1971140b` | 37.09 | `ACCEPTED` | `openai/gpt-5.4` | `COSMETIC` |

---

## 4. Full On-Chain Fixture Matrix (14 Scenarios)

Executed all 14 pre-registered scenarios against active contracts on Studionet:

| # | Scenario Name | Tx Hash | Status | Evaluated Outcome | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **set_baseline** | `0xee39245ec9ae0626353a477a694e26ff27e714ea0cedc22b671535d8636e65ee` | `ACCEPTED` | `BASELINE_SET` | `BASELINE_SET` | **PASSED** |
| 2 | **check_unchanged** | `0x53a4d341d00cc19438cbc0db4bc1eb4eb4ad10a62df0640254beaebb0e6f0021` | `ACCEPTED` | `UNCHANGED` | `UNCHANGED` | **PASSED** |
| 3 | **check_cosmetic** | `0x320dde9c408c560ed440e2f68c83cb6db52cf51f52b2cf63efaafffe8107cd82` | `ACCEPTED` | `COSMETIC` | `COSMETIC` | **PASSED** |
| 4 | **check_material_subtle** | `0xb6b8b0836194971098507a6a3be6a17c05c8142d2261627e38f473ed31bfa42d` | `ACCEPTED` | `MATERIAL` | `MATERIAL` | **PASSED** |
| 5 | **check_material_obvious** | `0xf410bb2d8eaf39f7d42d127f1669fd1baac8fa5c2b95d1a9c425548c73246d72` | `ACCEPTED` | `MATERIAL` | `MATERIAL` | **PASSED** |
| 6 | **check_material_injection** | `0x29ff8d85469f6f85c74063fca312bddef014a41e848d5fdace31b0c03ecf9889` | `ACCEPTED` | `MATERIAL` | `MATERIAL` | **PASSED** |
| 7 | **check_none_harmless** | `0xfd6a42347078a80d54464e4a9fe9ec03ad11d9e5c38cd71a64f1e2051c000fa3` | `ACCEPTED` | `NONE` | `NONE` | **PASSED** |
| 8 | **check_minor_salami1** | `0xb90a561bda8010255e532906ab97bede5d05286112539e6383f4c1ad0a681754` | `ACCEPTED` | `MINOR` | `MINOR` | **PASSED** |
| 9 | **check_material_salami2** | `0x82d18cb3db00d3d6f7610e502da81ccc9c5634d69c1bc75c4a63a2f6d1bdad38` | `ACCEPTED` | `MATERIAL` | `MATERIAL` | **PASSED** |
| 10 | **duplicate_observation** | `0x2e92c6a5e76006eb3aae16bafeb6044c0ef5069c698244934884f1e519e7596e` | `ACCEPTED` | `duplicate observation: already recorded in check 38` | `duplicate observation: already recorded in check <cid>` | **PASSED** |
| 11 | **host_mismatch** | `0x35f865162c8dc096aa78acc4c8242f333e2b05c76e09a98a4cbba518d5957952` | `ACCEPTED` | `host mismatch: new URL host must match existing host` | `host mismatch: new URL host must match existing host` | **PASSED** |
| 12 | **404_url** | `0x193042d54e43ad02ead179061e531e1601a5610a16987165b44955b23d7827a1` | `UNDETERMINED` | `HTTP status not 200: 404` | `HTTP status not 200: 404 or source unreachable` | **PASSED** |
| 13 | **accept_change_and_verify** | `0x5eddd6952be1be8b5a905c130325f13c021d92bd68f8b05de14c11551eaaf067` | `ACCEPTED` | `baseline_seq=2, next_verdict=COSMETIC` | `baseline_seq=2, next_verdict=COSMETIC (gate=COSMETIC)` | **PASSED** |
| 14 | **drift_guard_lifecycle** | `0x309ad89a1a54d4cc03c58b76f37b4c3bcf15c518c66804e8a074bba6d37823ed` | `ACCEPTED` | `GUARD_LIFECYCLE_VERIFIED` | `GUARD_LIFECYCLE_VERIFIED` | **PASSED** |

**Matrix Evaluation Verdict:** 14/14 Scenarios PASSED.

---

## 5. DriftGuard End-to-End Consumer Protection Sequence

Verified complete lifecycle transitions of downstream consumer `DriftGuard V3` (`0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`):

1. **Pin Baseline**: `pin("2")` anchors caller to Watch #2 baseline. Initial status `NO_CHECK_YET` (`safe: false`).
2. **Drift Alarm**: When monitored terms drift to v2 (`MATERIAL`), `is_safe` immediately transitions to `ALARM` (`safe: false`).
3. **Downstream Block**: View call `is_safe_for("2", ...)` returns `false`, preventing transactions while terms are modified.
4. **Acknowledgment**: Consumer calls `acknowledge("2", check_id)`. `is_safe` transitions to `ACKNOWLEDGED` (`safe: true`).
5. **Baseline Advance**: Watch owner calls `accept_change("2", check_id)`. DriftGuard recognizes hash shift and moves to `BASELINE_CHANGED` (`safe: false`).
6. **Re-Pin & Restoration**: Consumer calls `repin("2")` to bind new baseline hashes. A subsequent check against the new baseline confirms `COSMETIC` drift, restoring state to `OK` (`safe: true`).
7. **Single-Character Sensitivity**: `is_safe_for` returns `true` for exact matching candidate hashes; changing a single character returns `false` instantly.

---

## 6. On-Chain Stats Read-Back (V3 Contract)

Direct read-back from `get_stats()` on `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`:
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

**Zero Review Fallbacks**: Across all 42 on-chain checks (30 availability gate runs + 12 fixture matrix checks), zero parser failures or review fallbacks occurred.

---

## 7. Verification Checklist & Compliance Summary

- [x] **V2 Blind Spots Reproduced**: Demonstrated before fix and recorded in `docs/review_v3/before/REPRODUCTION.md`.
- [x] **Full Validator State Binding Implemented**: All state-bearing fields recomputed and bound in `contracts/DriftWatch.py`.
- [x] **All 8 Frozen Function SHA-256 Hashes Match**: Byte-for-byte identical via `scripts/verify_frozen_hashes.py`.
- [x] **Unit Test Suite**: 41/41 unit tests pass in 0.22s (`python -m unittest discover tests`).
- [x] **Availability Gate Passed**: 30/30 runs succeeded, 30/30 verdicts matched expectation.
- [x] **Fixture Matrix Passed**: 14/14 scenarios verified on-chain on Studionet.
- [x] **dApp Updated & Deployed**: All 29 contract `UserError` codes mapped; live at [https://drift-watch-app.vercel.app](https://drift-watch-app.vercel.app).
- [x] **Word Budgets Met**: Landing page and all `/app` routes comply with word budgets.
- [x] **Banned Words & Secrets Scanners**: Passed cleanly with zero detections.
- [x] **Status Word**: 'Preview' used consistently throughout.
- [x] **Canonical Owner**: `hypercybers99` updated across all repositories and configurations.
