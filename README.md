# Drift Watch: Semantic Policy Drift Detection on GenLayer

Status: Preview (Studionet)  
Network: Studionet (Chain ID: 61999)  
Explorer: [GenLayer Studionet Explorer](https://explorer-studio.genlayer.com)  
Web dApp: [drift-watch-app](https://drift-watch-app-hyper-8cdf.vercel.app) ([Repository](https://github.com/hypercybers99/drift-watch-app))  

Drift Watch is an intelligent contract system for GenLayer that detects semantic policy drift in external web terms and policies. It sounds an alarm when the *meaning* of a monitored terms page changes against an integrator's explicit "red lines", while remaining silent when text formatting, layout, section order, or dates are altered.

## Problem Statement

Modern decentralized applications, DAOs, and service integrators routinely rely on external APIs, RPC providers, infrastructure services, and token issuers whose terms of service and privacy policies are updated without notice. Existing monitoring tools either:
1. **Trigger False Alarms**: Hash or visual diffs trigger on trivial cosmetic updates (CSS changes, reordered clauses, updated copyright years).
2. **Miss Meaning Flips**: Subtle one-word deletions (such as changing "share anonymized statistics" to "share statistics") evade keyword or length diffs while completely flipping data-sharing rights.
3. **Succumb to Salami Attacks**: Comparing each version only to the previous version ($N$ vs. $N-1$) allows incremental relaxation of user protections over multiple minor revisions.

## Mechanism

Drift Watch introduces a multi-stage deterministic and semantic pipeline:
- **Baseline Anchoring**: A watch registers a target URL and explicit plain-English red lines. The accepted baseline is saved as a canonical set of normalized clauses.
- **Deterministic Cosmetic Gate**:
  - `UNCHANGED`: If raw page bytes match the baseline raw hash, execution terminates immediately.
  - `COSMETIC`: If raw bytes differ, but the order-insensitive normalized clause hash (`norm_hash`) matches the baseline, execution terminates with `COSMETIC`. No LLM inference is triggered.
- **Semantic Diff & Red Line Evaluation**: When clauses differ, deterministic code isolates modified, added, and removed clauses. If fewer than or equal to 12 clauses changed, validators pass only the diff and red lines to an LLM evaluator.
- **Full Validator State Binding (V3)**: Validators independently execute the deterministic evaluation pipeline, independently recompute all state-bearing hashes and clause snapshots, and compare the full canonical state (`verdict`, `gate`, 64-hex `norm_hash`, 64-hex `raw_hash`, `snapshot_clauses`, `changes`, `tripwire`) against the leader proposal. LLM `change_labels` and `redline_flags` are leader-attested metadata. Defense-in-depth recomputes `norm_hash` and `clause_diff` before storage writes, raising `UserError("baseline state inconsistent")` on any mismatch. In `accept_change`, `norm_hash(snapshot_clauses)` is independently verified before advancing the baseline, raising `UserError("check snapshot does not match its recorded hash")` on any mismatch.
- **DriftGuard Consumer Contract**: Integrators pin their reviewed baseline and red line hashes in `DriftGuard`. A synchronous view call (`is_safe` / `is_safe_for`) allows dApps to dynamically check whether the dependency remains safe.

## Why GenLayer

GenLayer enables contracts to access the public internet via non-deterministic execution (`gl.nondet.web.get`) and run language models (`gl.nondet.exec_prompt`) under consensus. Independent validators fetch the live terms page, compute hashes, evaluate meaning against user-defined red lines, and agree on a canonical verdict on-chain. Solidity and traditional EVM chains cannot read the live web or judge semantic meaning without centralized intermediaries.

## Non-Goals

- **Continuous Background Monitoring**: Checks are performed on-demand when invoked by a transaction. There is no automated cron within the contract.
- **Legal Compliance Advice**: The contract does not determine statutory legality; it evaluates adherence to the user's specific red lines.
- **JavaScript Single-Page Apps**: Pages requiring client-side JS rendering are unsupported and rejected with `UserError`.
- **Order-Dependent Legal Interpretation**: Clause reordering is treated as cosmetic.

## Repository Structure

```
├── contracts/
│   ├── DriftWatch.py       # Main intelligent contract
│   └── DriftGuard.py       # Multi-contract consumer guard
├── docs/
│   ├── DESIGN.md           # Architecture and consensus rationale
│   ├── LIMITATIONS.md      # Honest technical boundaries
│   ├── PRIOR_ART.md        # Prior art and difference table
│   ├── RUNTIME_NOTES.md    # Studionet probe findings
│   ├── INTEGRATION.md      # Method specifications and JSON payloads
│   ├── ERROR_CODES.md      # Comprehensive UserError catalog
│   └── VERIFICATION.md     # Deployment verification and hashes
├── fixtures/
│   ├── EXPECTED.md         # Pre-registered expectations matrix
│   ├── redlines.json       # Acme Notes red lines
│   └── pages/              # Offline test fixture copies (v0 through v7)
├── scripts/
│   ├── deploy/             # Deployment and evidence scripts
│   ├── scan_ascii.py       # ASCII compliance scanner
│   ├── scan_banned_words.py# Banned marketing terminology scanner
│   └── scan_secrets.py     # Secrets and private key scanner
└── tests/
    ├── test_layer1_pure.py # Pure function edge cases and star test
    ├── test_layer2_mocked.py# Contract logic, gates, and UserErrors
    └── test_layer3_consensus.py# Multi-validator consensus simulation
```

## Running Tests

```bash
# Run all unit and integration tests
npm test

# Run code scanners
npm run scan:ascii
npm run scan:banned
npm run scan:secrets
```

## Deployments (Studionet Preview)

- **Network**: Studionet (Chain ID: `61999`)
- **RPC Endpoint**: `https://studio.genlayer.com/api`
- **Explorer Base**: `https://explorer-studio.genlayer.com/address/`

### Active Deployment (V3: Full Validator State Binding)

| Contract | Address | Deploy Tx Hash | Verified Source SHA-256 | Explorer Link |
| :--- | :--- | :--- | :--- | :--- |
| **DriftWatch** | `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85` | `0xacbacb426db5a42176c98fce599902f6f320882d994a028975e7b1999d5cb1c7` | `2a2d3ebde7563ba146de73ead1cbdc3b0b52e82cfc60eddce3a595a5ea4c428c` | [DriftWatch Explorer](https://explorer-studio.genlayer.com/address/0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85) |
| **DriftGuard** | `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4` | `0xbcbc3aab69f50dc5a1af97daed026fb9eb5da5ceec8533bb8f7a78eddfa8960b` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | [DriftGuard Explorer](https://explorer-studio.genlayer.com/address/0x4D2123ac8Ceb59967B2009ab7A261C290348abC4) |

### Superseded Deployments

| Deployment | Contract | Address | Deploy Tx Hash | Verified Source SHA-256 | Reason Superseded |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Iteration 1** | **DriftWatch** | `0xe8A159D3622D33aA0B62da57aF033F2C6D9fdEfD` | `0xbcc2b725f32f79d8477db824bed444e53fb7ff6ef6e08d6ebaa72537e49f8f39` | `2dcd113b3811f7041495878fb0e072020ca366afbe7d35740902080db057ca3e` | Portal steward rejection: consensus prefix verification blind spots. Validators verified only the verdict and 16-hex prefix, trusting leader full hashes and clause snapshots. Superseded by V3 full validator state binding. |
| **Iteration 1** | **DriftGuard** | `0x0f336D97134D9770aBFA20d3B2Ad5B9f7D4BC557` | `0x9f3428148b3f7047d912903a7469acdd4318c07e225bb43621a30e952a2f9c6f` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | Re-pointed to active DriftWatch deployment. |
| **Iteration 0** | **DriftWatch** | `0x7Ce13F5696f3A81AB5782BC203158691c0D742Cf` | `0xe5eeb4ba21fd7370f3ddd789dce5bcbb382d618abd1ab7f8f2e44102187713e8` | `9d80f1bc271116dae1b29cbf34f823f104d5fca94f6e012140b2686a32fe8e50` | Prompt enhanced in Iteration 1 to strictly enforce flat string arrays for LLM labels. |
| **Iteration 0** | **DriftGuard** | `0x02167c91C7054F7503Ea38200eD293003A8E9e4F` | `0xef8092b855239516c1a3a4b2e85c70733ff5c2245484c1631ae9335db633b4b9` | `eb1b26aed095daf61ad1b94b1752d1636055965311543319d8fe214bc24863dc` | Re-pointed to active DriftWatch deployment. |

Full on-chain receipts and execution evidence are documented in [`docs/VERIFICATION.md`](docs/VERIFICATION.md), [`docs/evidence_v3/gate/GATE_EVALUATION.md`](docs/evidence_v3/gate/GATE_EVALUATION.md), and [`docs/evidence_v3/matrix/MATRIX_EVALUATION.md`](docs/evidence_v3/matrix/MATRIX_EVALUATION.md).

## Known Limitation: Model Output Shape

In non-deterministic contract calls, GenLayer validators execute LLMs using diverse underlying model policies (such as `policy:prd-minimax`, `openai/gpt-5.4`, `anthropic/claude-sonnet-4.6`, `google/gemini-3-flash-preview`). While deterministic gates handle byte-identical and normalized cosmetic changes, evaluated semantic checks rely on strict JSON schema extraction (`parse_labels`).

A statistical robustness evaluation across 60 on-chain probe transactions on Studionet ([`docs/ROBUSTNESS.md`](docs/ROBUSTNESS.md)) measured:
- **Overall parse success rate**: **98.33%** (59 / 60 runs parsed strictly).
- **Subtle edit (`v2`)**: 100.0% (10 / 10 runs parsed cleanly).
- **Obvious edit (`v3`)**: 93.3% (14 / 15 runs parsed cleanly across Batch 1 and Batch 2).
- **Adversarial injection (`v4`)**: 100.0% (10 / 10 runs parsed cleanly with tripwire invariant preserved).
- **Harmless edit (`v5`)**: 100.0% (10 / 10 runs parsed cleanly).
- **Salami creep regressions (`v6`, `v7`)**: 100.0% (15 / 15 runs parsed cleanly).

Verdict variance exists across frontier models for boundary semantic classifications: fixture `v2` produced 9/10 `MATERIAL` and 1/10 `REVIEW` (run 8 where an UNCLEAR redline flag triggered a fail-safe review under contract consensus rules), and fixture `v6` produced 8/10 `MINOR` and 2/10 `MATERIAL`, reflecting model judgment differences rather than parse errors.

**Fail-safe behavior**: When a model outputs an unparseable format (such as nested dictionaries or duplicated list lengths), the contract's strict parser deliberately rejects the output and falls back to `REVIEW`. This triggers an alarm state in `DriftGuard` (`is_safe() == false`), ensuring that model hallucinations or formatting deviations can never create false-negative security clearances (safe but noisy).

## License

MIT License - Copyright (c) 2026 Hyper (hypercybers99). See [LICENSE](LICENSE) for details.
