# Changelog

All notable changes to the Drift Watch project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-11-10

### Added
- **Full Validator State Binding**: Pure helper `state_view(...)` formats all state fields (`verdict`, `gate`, `norm_hash`, `raw_hash`, `clauses`/`snapshot_clauses`, `changes`, `tripwire`) into a canonical JSON object.
- **Independent Validator Recomputation**: In `set_baseline` and `check`, validators independently fetch remote content, normalize clauses, compute full 64-hex SHA-256 hashes, and compare clause diffs against baseline.
- **Defense-in-Depth Integrity Checks**:
  - `set_baseline`: contract independently recomputes `norm_hash(norm_clauses)` against leader hash, raising `gl.vm.UserError("baseline state inconsistent")` upon divergence.
  - `check`: contract recomputes `norm_hash(snapshot_clauses)` and `clause_diff(baseline_clauses, snapshot_clauses)`, raising `gl.vm.UserError("baseline state inconsistent")` upon divergence.
  - `accept_change`: contract recomputes `norm_hash(snapshot_clauses)` and validates equality against recorded `chk["norm_hash"]`, raising `gl.vm.UserError("check snapshot does not match its recorded hash")` upon divergence.
- **New Unit Test Suite**: `tests/test_v3_rejections.py` with 19 tests verifying honest consensus, altered prefix/tail rejections, field-by-field alteration rejections, and defense-in-depth rejections. Total tests: 41.
- **Pre-Registered Availability Gate**: 30 on-chain runs on Studionet across MATERIAL, MINOR, and COSMETIC fixtures (100% success rate, 100% identical verdicts).
- **Full 14-Scenario Fixture Matrix**: 14/14 scenario executions verified on Studionet.

### Changed
- Active contracts deployed to GenLayer Studionet:
  - `DriftWatch V3`: `0xf8D23c16B5655bE7dF9897dC76C1C576d4c68F85`
  - `DriftGuard V3`: `0x4D2123ac8Ceb59967B2009ab7A261C290348abC4`
- Observation key `obs_key` now uses contract-recomputed normalized hash rather than trusting leader hash.
- LLM `change_labels` and `redline_flags` designated as leader-attested annotations; legal `verdict` independently evaluated by validators.
- Superseded earlier deployments (`0xe8A159D3...`, `0x7Ce13F56...`) in address registry.

## [2.0.0] - 2026-10-17

### Added
- Flat JSON string array prompt instruction for LLM labeling to eliminate parser variations.
- Robustness evaluation suite across 35 independent validator runs.

### Changed
- Superseded Iteration 0 contracts.

## [1.0.0] - 2026-10-17

### Added
- Initial deployment of `DriftWatch` and `DriftGuard` on GenLayer Studionet Preview.
