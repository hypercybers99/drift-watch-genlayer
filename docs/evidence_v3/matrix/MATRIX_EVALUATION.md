# Full On-Chain Fixture Matrix Evaluation (V3)

All 14 pre-registered scenarios executed on GenLayer Studionet (Chain ID 61999).
Active DriftWatch V3: `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`
Active DriftGuard V3: `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`

| Scenario | Name | Tx Hash | Status | Evaluated Outcome | Expected Outcome | Pass/Fail |
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

**Overall Matrix Result:** PASSED (14/14 scenarios verified on-chain)
