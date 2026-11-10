# Availability Gate Evaluation (V3)

Evaluated strictly according to pre-registered rules in `docs/REVIEW_V3_PLAN.md` section 6.
Network: GenLayer Studionet (Chain ID 61999).
Thresholds: >= 9/10 transaction successes, >= 9/10 identical verdicts per fixture.

| Fixture | Expected Verdict | Successful Runs | Success Rate | Identical Verdicts | Verdict Identity Rate | Label Vector Modal Count | Gate Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MATERIAL** | `MATERIAL` | 10/10 | 100.0% | 10/10 | 100.0% | 5/10 (50.0%) | **PASSED** |
| **MINOR** | `MINOR` | 10/10 | 100.0% | 10/10 | 100.0% | 10/10 (100.0%) | **PASSED** |
| **COSMETIC** | `COSMETIC` | 10/10 | 100.0% | 10/10 | 100.0% | 10/10 (100.0%) | **PASSED** |

### Run-by-Run Breakdown

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
| MINOR | 2 | `0x2ec166f789ab7245956b81a94b883b39df48387f6287dbea406f4d800ae2ec4c` | 55.7 | `ACCEPTED` | `policy:prd-glm` | `MINOR` | Yes |
| MINOR | 3 | `0x12767885c0d41541f53caa5337c10a865a00a8208353e6f02f5c8a4be642b376` | 17.1 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 4 | `0xa3f2f31cec86b7e4dd78b541c114ba4cdfa0555bdab882e7d36619c84ca082ef` | 17.04 | `ACCEPTED` | `openai/gpt-5.4` | `MINOR` | Yes |
| MINOR | 5 | `0x76986101b80faa861039cd84856fc64391daa43a73f423b3d66e380328c75ae1` | 24.76 | `ACCEPTED` | `policy:prd-gemini` | `MINOR` | Yes |
| MINOR | 6 | `0x8cfa3888ff31f9ca394820102bc3442d768bdb968189735c13650ef9c2060f67` | 28.59 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 7 | `0xe91c6fa3149fc2bd182932cdbed6e803b73bd8c733dbc21acd251301f909ea57` | 17.1 | `ACCEPTED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 8 | `0x6a6ba7be6e09898117b9e8b9a1b47e33266b132d83cfe36d84aef2b4190fa0a4` | 36.07 | `ACCEPTED` | `policy:prd-kimi` | `MINOR` | Yes |
| MINOR | 9 | `0x58f7f647980b958a1a5883485afeac6579b735235a8ddb69edef90beef49a878` | not measured | `FINALIZED` | `policy:prd-gpt-5-4` | `MINOR` | Yes |
| MINOR | 10 | `0x4bb7e522702d31659c29e80e30c859282cae78340c1d543571d6fc9ce95ec26e` | 28.64 | `ACCEPTED` | `google/gemini-3-flash-preview` | `MINOR` | Yes |
| COSMETIC | 1 | `0x8a64ca85ba90b9d2d062ef81e4ad297f7001654fef814fd885cc4970db4e40a7` | 9.7 | `ACCEPTED` | `policy:prd-sonnet` | `COSMETIC` | Yes |
| COSMETIC | 2 | `0xc066bc44fb8723e278cc322c658566c8bf85ae9e832d7d6af4e827afd276b084` | 9.72 | `ACCEPTED` | `openai/gpt-5.4` | `COSMETIC` | Yes |
| COSMETIC | 3 | `0x27ef270377856969792eb2b41b1cebb1203ec7da57eee1df6294f19b3244d050` | 9.49 | `ACCEPTED` | `policy:prd-gemma` | `COSMETIC` | Yes |
| COSMETIC | 4 | `0x96493d9822227b8b77f7a51e48c0b9271b550a7e9759cdb117b6e9546b1880bc` | 14.29 | `ACCEPTED` | `policy:prd-gpt-5-4` | `COSMETIC` | Yes |
| COSMETIC | 5 | `0x23dbc3ce749a5d1bf239d1d89600eb811f480dc5705f5e7e695ea164798b6a46` | 13.37 | `ACCEPTED` | `policy:prd-qwen` | `COSMETIC` | Yes |
| COSMETIC | 6 | `0xae51bf2d721d4a35f64474e303844b9471c3c50389ee0406971c202729e559c9` | 13.28 | `ACCEPTED` | `policy:prd-qwen` | `COSMETIC` | Yes |
| COSMETIC | 7 | `0xefb30930a523b799c83b1529ac84155b31102bf763cf54cb5c5bafb01959418a` | 9.49 | `ACCEPTED` | `policy:prd-gpt-oss` | `COSMETIC` | Yes |
| COSMETIC | 8 | `0xed519411d2d3de0b87e71da8b70215fe2d0e183c2840eae6958f7deb58945c10` | 13.45 | `ACCEPTED` | `policy:prd-mistral` | `COSMETIC` | Yes |
| COSMETIC | 9 | `0x8f4f2cf5881ffc542aed11fc3602b2e84eab76a99ad9379fc0ec266d1af2d8ce` | 13.35 | `ACCEPTED` | `policy:prd-sonnet` | `COSMETIC` | Yes |
| COSMETIC | 10 | `0xb4ec94a8e2229e43cda3db1f5d7e52bf685f0f10b0504e436f5cf92a1971140b` | 37.09 | `ACCEPTED` | `openai/gpt-5.4` | `COSMETIC` | Yes |

**Gate Decision:** ADOPT V3 (Gate passed across all 3 fixtures)
