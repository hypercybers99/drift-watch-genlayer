# DriftWatch & DriftGuard: On-Chain Verification & Preview Evidence (V3)

**Network**: Studionet  
**Chain ID**: 61999  
**RPC Endpoint**: `https://studio.genlayer.com/api`  
**Explorer Base**: `https://explorer-studio.genlayer.com/address/`  
**Execution Account (Throwaway)**: `0xF56027a31727c791E57B6EF5668df936ABd6aB6d`  
**Fixtures Repository**: `https://github.com/hypercybers99/drift-watch-fixtures`  
**Fixtures Commit**: `c8ff0f0cf8b5e406a44baad04867cb793c52d328`  

---

## 1. Deployed Contracts & Byte-for-Byte Source Verification

Source verification was performed via JSON-RPC query `eth_getTransactionByHash` for each contract deployment transaction, decoding `result.data.contract_code` (base64), and computing its SHA-256 hash against local files. Verification data is recorded in `scripts/deploy/verification_result_v3.json`.

### Active Deployment (V3: Full Validator State Binding)

*Deployed in response to Portal steward rejection: validators independently recompute and bind every state-bearing hash and clause snapshot.*

| Contract | Address | Deploy Tx Hash | Local SHA-256 | On-Chain Decoded SHA-256 | Match Result | Explorer Link |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DriftWatch V3** | `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85` | `0xacbacb426db5a42176c98fce599902f6f320882d994a028975e7b1999d5cb1c7` | `2a2d3ebde7563ba146de73ead1cbdc3b0b52e82cfc60eddce3a595a5ea4c428c` | `2a2d3ebde7563ba146de73ead1cbdc3b0b52e82cfc60eddce3a595a5ea4c428c` | **EXACT MATCH** (0 diff) | [DriftWatch V3 Explorer](https://explorer-studio.genlayer.com/address/0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85) |
| **DriftGuard V3** | `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4` | `0xbcbc3aab69f50dc5a1af97daed026fb9eb5da5ceec8533bb8f7a78eddfa8960b` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | **EXACT MATCH** (0 diff) | [DriftGuard V3 Explorer](https://explorer-studio.genlayer.com/address/0x4D2123ac8Ceb59967B2009ab7A261C290348abC4) |

### Superseded Deployments

| Iteration | Contract | Address | Deploy Tx Hash | Local SHA-256 | Status | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Iteration 1** | **DriftWatch** | `0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD` | `0xbcc2b725f32f79d8477db824bed444e53fb7ff6ef6e08d6ebaa72537e49f8f39` | `2dcd113b3811f7041495878fb0e072020ca366afbe7d35740902080db057ca3e` | Superseded | Portal steward rejection: consensus prefix verification blind spots. Validators verified only the verdict and 16-hex prefix, trusting leader full hashes and clause snapshots. Superseded by V3 full validator state binding. |
| **Iteration 1** | **DriftGuard** | `0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557` | `0x9f3428148b3f7047d912903a7469acdd4318c07e225bb43621a30e952a2f9c6f` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | Superseded | Re-deployed to link to active V3 DriftWatch contract. |
| **Iteration 0** | **DriftWatch** | `0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf` | `0xe5eeb4ba21fd7370f3ddd789dce5bcbb382d618abd1ab7f8f2e44102187713e8` | `9d80f1bc271116dae1b29cbf34f823f104d5fca94f6e012140b2686a32fe8e50` | Superseded | Prompt instruction enhanced in Iteration 1 to strictly enforce flat string arrays for LLM labels. |
| **Iteration 0** | **DriftGuard** | `0x02167c91C7054F7503Ea38200eD293003A8E9e4F` | `0xef8092b855239516c1a3a4b2e85c70733ff5c2245484c1631ae9335db633b4b9` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | Superseded | Re-deployed in Iteration 1. |

---

## 2. Pre-Registered Availability Gate Evaluation (V3)

Evaluated strictly according to pre-registered rules in `docs/REVIEW_V3_PLAN.md` section 6.
Thresholds: >= 9/10 transaction successes, >= 9/10 identical verdicts per fixture.
Individual consensus receipts saved in `docs/evidence_v3/gate/`.

| Fixture | Expected Verdict | Successful Runs | Success Rate | Identical Verdicts | Verdict Identity Rate | Label Vector Modal Count | Gate Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MATERIAL** (`terms-v2-subtle.md`) | `MATERIAL` | 10/10 | 100.0% | 10/10 | 100.0% | 5/10 (50.0%) | **PASSED** |
| **MINOR** (`terms-v6-salami1.md`) | `MINOR` | 10/10 | 100.0% | 10/10 | 100.0% | 10/10 (100.0%) | **PASSED** |
| **COSMETIC** (`terms-v1-cosmetic.html`) | `COSMETIC` | 10/10 | 100.0% | 10/10 | 100.0% | 10/10 (100.0%) | **PASSED** |

### Availability Gate Run-by-Run Breakdown

| Fixture | Run | Tx Hash | Elapsed (s) | Status | Leader Model | Evaluated Verdict | Matches Expected |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MATERIAL | 1 | `0xd8ffe6c0a2810630464301419778ea65011a7b5ee71f40933af5c396c9eb3865` | 63.32 | `ACCEPTED` | `openai/gpt-5.4` | `MATERIAL` | Yes |
| MATERIAL | 2 | `0x89521ced4c621a1f507c07cea9824a28d85569e1e83cdba657bb5bdbfea8f3cc` | 51.44 | `ACCEPTED` | `policy:prd-qwen` | `MATERIAL` | Yes |
| MATERIAL | 3 | `0x9e417ffc7b36ebebe90351fa3ec84341d35b660ae571db9ddc7bf2c2a6f1fada` | 13.66 | `ACCEPTED` | `openai/gpt-5.4` | `MATERIAL` | Yes |
| MATERIAL | 4 | `0xcc06c14abd1392949bc2e647bb998eef4ad6346169a12ac9b1da48acd8b0a911` | 13.59 | `ACCEPTED` | `policy:prd-sonnet` | `MATERIAL` | Yes |
| MATERIAL | 5 | `0x3f28f28dc037332d8bf884dae2b14d9c11c146a3728de2fe68ab04f051008818` | 20.98 | `ACCEPTED` | `policy:prd-grok` | `MATERIAL` | Yes |
| MATERIAL | 6 | `0x09c4ffeae4031be7f764ccea9487021760b4642fe47ec10f772fe7e944c2cf48` | 21.03 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MATERIAL` | Yes |
| MATERIAL | 7 | `0x405cf2d06ccca648c48e5a77acb6eca242727639e11567510dfe1ec38cd9f2a1` | 17.05 | `ACCEPTED` | `policy:prd-mistral` | `MATERIAL` | Yes |
| MATERIAL | 8 | `0x7e7e95c35e61c6ffed8e1bbedc800f54aab7dd09fd490468ddcd4a506c3a1bc2` | 13.14 | `ACCEPTED` | `policy:prd-gemma` | `MATERIAL` | Yes |
| MATERIAL | 9 | `0xfa04f6c8e5d817d611b28dae814c99e20b061fc9a07cfc74a7b6c67c294a864f` | 17.05 | `ACCEPTED` | `policy:prd-sonnet` | `MATERIAL` | Yes |
| MATERIAL | 10 | `0x95bae010a0a5d93ec2d105007f3d0ab998f06e2ab671563d6cb50cf130ff7f63` | 20.92 | `ACCEPTED` | `policy:prd-kimi` | `MATERIAL` | Yes |
| MINOR | 1 | `0xecca78a3d0ccb1960bb994db618d916561cfcc3a5bd37201b13d772f2ad1f138` | 32.45 | `ACCEPTED` | `policy:prd-grok` | `MINOR` | Yes |
| MINOR | 2 | `0x2ec166f789ab7245956b81a94b883b39df48387f6287dbea406f4d800ae2ec4c` | 55.70 | `ACCEPTED` | `policy:prd-glm` | `MINOR` | Yes |
| MINOR | 3 | `0x12767885c0d41541f53caa5337c10a865a00a8208353e6f02f5c8a4be642b376` | 17.10 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 4 | `0xa3f2f31cec86b7e4dd78b541c114ba4cdfa0555bdab882e7d36619c84ca082ef` | 17.04 | `ACCEPTED` | `openai/gpt-5.4` | `MINOR` | Yes |
| MINOR | 5 | `0x76986101b80faa861039cd84856fc64391daa43a73f423b3d66e380328c75ae1` | 24.76 | `ACCEPTED` | `policy:prd-gemini` | `MINOR` | Yes |
| MINOR | 6 | `0x8cfa3888ff31f9ca394820102bc3442d768bdb968189735c13650ef9c2060f67` | 28.59 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 7 | `0xe91c6fa3149fc2bd182932cdbed6e803b73bd8c733dbc21acd251301f909ea57` | 17.10 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 8 | `0x6a6ba7be6e09898117b9e8b9a1b47e33266b132d83cfe36d84aef2b4190fa0a4` | 36.07 | `ACCEPTED` | `policy:prd-kimi` | `MINOR` | Yes |
| MINOR | 9 | `0x58f7f647980b958a1a5883485afeac6579b735235a8ddb69edef90beef49a878` | not measured | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 10 | `0x4bb7e522702d31659c29e80e30c859282cae78340c1d543571d6fc9ce95ec26e` | 28.64 | `ACCEPTED` | `google/gemini-3-flash-preview` | `MINOR` | Yes |
| COSMETIC | 1 | `0x8a64ca85ba90b9d2d062ef81e4ad297f7001654fef814fd885cc4970db4e40a7` | 9.70 | `ACCEPTED` | `policy:prd-sonnet` | `COSMETIC` | Yes |
| COSMETIC | 2 | `0xc066bc44fb8723e278cc322c658566c8bf85ae9e832d7d6af4e827afd276b084` | 9.72 | `ACCEPTED` | `openai/gpt-5.4` | `COSMETIC` | Yes |
| COSMETIC | 3 | `0x27ef270377856969792eb2b41b1cebb1203ec7da57eee1df6294f19b3244d050` | 9.49 | `ACCEPTED` | `policy:prd-gemma` | `COSMETIC` | Yes |
| COSMETIC | 4 | `0x96493d9822227b8b77f7a51e48c0b9271b550a7e9759cdb117b6e9546b1880bc` | 14.29 | `ACCEPTED` | `policy:prd-gpt-5-4` | `COSMETIC` | Yes |
| COSMETIC | 5 | `0x23dbc3ce749a5d1bf239d1d89600eb811f480dc5705f5e7e695ea164798b6a46` | 13.37 | `ACCEPTED` | `policy:prd-qwen` | `COSMETIC` | Yes |
| COSMETIC | 6 | `0xae51bf2d721d4a35f64474e303844b9471c3c50389ee0406971c202729e559c9` | 13.28 | `ACCEPTED` | `policy:prd-qwen` | `COSMETIC` | Yes |
| COSMETIC | 7 | `0xefb30930a523b799c83b1529ac84155b31102bf763cf54cb5c5bafb01959418a` | 9.49 | `ACCEPTED` | `policy:prd-gpt-oss` | `COSMETIC` | Yes |
| COSMETIC | 8 | `0xed519411d2d3de0b87e71da8b70215fe2d0e183c2840eae6958f7deb58945c10` | 13.45 | `ACCEPTED` | `policy:prd-mistral` | `COSMETIC` | Yes |
| COSMETIC | 9 | `0x8f4f2cf5881ffc542aed11fc3602b2e84eab76a99ad9379fc0ec266d1af2d8ce` | 13.35 | `ACCEPTED` | `policy:prd-sonnet` | `COSMETIC` | Yes |
| COSMETIC | 10 | `0xb4ec94a8e2229e43cda3db1f5d7e52bf685f0f10b0504e436f5cf92a1971140b` | 37.09 | `ACCEPTED` | `openai/gpt-5.4` | `COSMETIC` | Yes |

**Gate Decision:** ADOPT V3 (Gate passed across all 3 fixtures: 30/30 runs succeeded, 30/30 matched expected verdict).

---

## 3. Studionet V3 On-Chain Fixture Matrix (14 Scenarios)

All 14 pre-registered scenarios executed against active contracts DriftWatch V3 (`0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`) and DriftGuard V3 (`0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`).
Individual receipts saved in `docs/evidence_v3/matrix/`.

| Scenario | Name | Method | Tx Hash | Latency | Status / Result | Evaluated Outcome | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **set_baseline** | `set_baseline` | `0xee39245ec9ae0626353a477a694e26ff27e714ea0cedc22b671535d8636e65ee` | 10.74s | ACCEPTED / MAJORITY_AGREE | `BASELINE_SET` | `BASELINE_SET` | **PASSED** |
| 2 | **check_unchanged** | `check` | `0x53a4d341d00cc19438cbc0db4bc1eb4eb4ad10a62df0640254beaebb0e6f0021` | 10.87s | ACCEPTED / MAJORITY_AGREE | `UNCHANGED` | `UNCHANGED` | **PASSED** |
| 3 | **check_cosmetic** | `check` | `0x320dde9c408c560ed440e2f68c83cb6db52cf51f52b2cf63efaafffe8107cd82` | 11.23s | ACCEPTED / MAJORITY_AGREE | `COSMETIC` | `COSMETIC` | **PASSED** |
| 4 | **check_material_subtle** | `check` | `0xb6b8b0836194971098507a6a3be6a17c05c8142d2261627e38f473ed31bfa42d` | 15.00s | ACCEPTED / MAJORITY_AGREE | `MATERIAL` | `MATERIAL` | **PASSED** |
| 5 | **check_material_obvious** | `check` | `0xf410bb2d8eaf39f7d42d127f1669fd1baac8fa5c2b95d1a9c425548c73246d72` | 14.97s | ACCEPTED / MAJORITY_AGREE | `MATERIAL` | `MATERIAL` | **PASSED** |
| 6 | **check_material_injection** | `check` | `0x29ff8d85469f6f85c74063fca312bddef014a41e848d5fdace31b0c03ecf9889` | 14.86s | ACCEPTED / MAJORITY_AGREE | `MATERIAL` | `MATERIAL` | **PASSED** |
| 7 | **check_none_harmless** | `check` | `0xfd6a42347078a80d54464e4a9fe9ec03ad11d9e5c38cd71a64f1e2051c000fa3` | 14.89s | ACCEPTED / MAJORITY_AGREE | `NONE` | `NONE` | **PASSED** |
| 8 | **check_minor_salami1** | `check` | `0xb90a561bda8010255e532906ab97bede5d05286112539e6383f4c1ad0a681754` | 18.77s | ACCEPTED / MAJORITY_AGREE | `MINOR` | `MINOR` | **PASSED** |
| 9 | **check_material_salami2** | `check` | `0x82d18cb3db00d3d6f7610e502da81ccc9c5634d69c1bc75c4a63a2f6d1bdad38` | 15.11s | ACCEPTED / MAJORITY_AGREE | `MATERIAL` | `MATERIAL` | **PASSED** |
| 10 | **duplicate_observation** | `check` | `0x2e92c6a5e76006eb3aae16bafeb6044c0ef5069c698244934884f1e519e7596e` | 15.34s | ACCEPTED / MAJORITY_AGREE | `duplicate observation: already recorded in check 38` | `duplicate observation: already recorded in check <cid>` | **PASSED** |
| 11 | **host_mismatch** | `update_source` | `0x35f865162c8dc096aa78acc4c8242f333e2b05c76e09a98a4cbba518d5957952` | 7.39s | ACCEPTED / MAJORITY_AGREE | `host mismatch: new URL host must match existing host` | `host mismatch: new URL host must match existing host` | **PASSED** |
| 12 | **404_url** | `set_baseline` | `0x193042d54e43ad02ead179061e531e1601a5610a16987165b44955b23d7827a1` | 33.72s | UNDETERMINED / MAJORITY_DISAGREE | `HTTP status not 200: 404` | `HTTP status not 200: 404 or source unreachable` | **PASSED** |
| 13 | **accept_change_and_verify** | `accept_change` | `0x5eddd6952be1be8b5a905c130325f13c021d92bd68f8b05de14c11551eaaf067` | 5.37s | ACCEPTED / MAJORITY_AGREE | `baseline_seq=2, next_verdict=COSMETIC` | `baseline_seq=2, next_verdict=COSMETIC (gate=COSMETIC)` | **PASSED** |
| 14 | **drift_guard_lifecycle** | guard lifecycle | `0x309ad89a1a54d4cc03c58b76f37b4c3bcf15c518c66804e8a074bba6d37823ed` | 45.10s | ACCEPTED / MAJORITY_AGREE | `GUARD_LIFECYCLE_VERIFIED` | `GUARD_LIFECYCLE_VERIFIED` | **PASSED** |

**Overall Matrix Result:** PASSED (14/14 scenarios verified on-chain)

---

## 4. DriftGuard V3 End-to-End Lifecycle Sequence

Every transition was verified through individual transactions and read-backs against consumer contract `DriftGuard V3` (`0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`):

| Step | Action | Tx Hash | State Before | State After (`is_safe` Read-Back) | Safe? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Create & Init** | `create_watch` #2 on V3 | `0x309ad89a1a54d4cc03c58b76f37b4c3bcf15c518c66804e8a074bba6d37823ed` | - | Watch #2 created | - |
| **2. Set Baseline** | `set_baseline` #2 on v0 | In step 1 | `NEEDS_BASELINE` | `ACTIVE` | - |
| **3. Pin Baseline** | `pin` #2 in DriftGuard | In step 1 | `NO_PIN` | `{"reason":"NO_CHECK_YET","safe":"false"}` | `false` |
| **4. Trigger Drift** | `update_source` to v2 & `check` | In step 1 | `NO_CHECK_YET` | `{"latest_check_id":"40","latest_verdict":"MATERIAL","reason":"ALARM","safe":"false"}` | `false` |
| **5. is_safe_for Check** | View call `is_safe_for("2", ...)` | View Call | `ALARM` | Returns `false` (ALARM state) | `false` |
| **6. Acknowledge** | `acknowledge` check #40 | In step 1 | `ALARM` | `{"latest_check_id":"40","latest_verdict":"MATERIAL","reason":"ACKNOWLEDGED","safe":"true"}` | `true` |
| **7. Watch Advance** | `accept_change` check #40 on Watch | In step 1 | `ACKNOWLEDGED` | `{"latest_check_id":"40","latest_verdict":"MATERIAL","reason":"BASELINE_CHANGED","safe":"false"}` | `false` |
| **8. Re-Pin** | `repin` #2 in DriftGuard | `0x8be103b44b2049e7b4111cebba60d157cc43e5a593366838a101f35f29d2ca86` | `BASELINE_CHANGED` | Baseline seq updated to `2` | - |
| **9. Verify New Baseline** | `check` against new baseline | In step 8 | Check 40 recorded | `{"latest_check_id":"42","latest_verdict":"COSMETIC","reason":"OK","safe":"true"}` | `true` |
| **10. is_safe_for Binding** | View call with valid vs invalid hashes | View Call | `OK` | Valid candidate hash returns `true`; mismatched hash returns `false` | `true` / `false` |

---

## 5. On-Chain Stats Read-Back (V3 Contract)

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

**Key Metric**: `stat_verdict_REVIEW: "0"` across all 42 on-chain checks on the V3 contract. Every single check was evaluated cleanly to its expected legal category without parser failure or review fallback.
