import unittest
import json
import os
from genlayer import gl, WebResponse, Return
from contracts.DriftWatch import DriftWatch, norm_hash, normalize_clause


class TestV2VulnerabilitiesReproduce(unittest.TestCase):
    """
    Reproduction of V2 consensus prefix verification vulnerabilities identified by Portal steward.
    Demonstrates that in V2:
    1. set_baseline: validator_fetch accepts an altered leader output matching only the 16-hex prefix.
    2. check: validator_run accepts an altered leader output matching only the 16-hex prefix and verdict.
    3. accept_change: accepts a stored check where snapshot_clauses do not match norm_hash.
    """

    def setUp(self):
        self.watch = DriftWatch()
        self.owner = "0x1111111111111111111111111111111111111111"
        gl.message.sender_address.as_hex = self.owner

        fixtures_dir = os.path.join(os.path.dirname(__file__), "../fixtures/pages")
        with open(os.path.join(fixtures_dir, "terms-v0.md"), "rb") as f:
            self.v0_raw = f.read()
        with open(os.path.join(fixtures_dir, "terms-v2-subtle.md"), "rb") as f:
            self.v2_raw = f.read()

        self.url = "https://example.com/terms.md"
        self.redlines = json.dumps(["No sharing personal data without consent."])
        gl.nondet.web.handler = lambda u: WebResponse(200, self.v0_raw)
        gl.nondet.prompt_handler = lambda p: json.dumps({
            "changes": ["MATERIAL"],
            "redlines": ["HIT"]
        })

    def test_reproduce_1_set_baseline_accepts_altered_leader_output(self):
        """
        Point 1: In V2 set_baseline, validator_fetch checks only 'BASELINE|' + norm_hash[:16].
        An altered leader output with identical 16-hex prefix but altered hash tail,
        altered raw_hash, and altered norm_clauses is accepted and written to storage.
        """
        wid = self.watch.create_watch("Test Watch 1", self.url, self.redlines)

        # Hook run_nondet to simulate an altered leader output
        real_run_nondet = gl.vm.run_nondet
        def altered_leader_run_nondet(leader_fn, validator_fn):
            honest_leader_res = json.loads(leader_fn())
            token = honest_leader_res["consensus_token"]
            prefix = token.split("|")[1] # 16-hex prefix
            honest_hash = honest_leader_res["norm_hash"]

            # Craft altered leader output:
            # - Same 16-hex prefix, but altered tail
            altered_hash = prefix + "000000000000000000000000000000000000000000000000"
            altered_raw_hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
            altered_clauses = ["Altered clause injected by leader that was never in source terms"]

            altered_data = {
                "consensus_token": token, # Identical token!
                "norm_hash": altered_hash, # Altered full hash tail!
                "raw_hash": altered_raw_hash, # Altered raw hash!
                "norm_clauses": altered_clauses, # Altered clause list!
            }
            altered_json = json.dumps(altered_data, sort_keys=True, separators=(",", ":"))

            # Pass altered leader result to validator_fetch
            val_res = validator_fn(Return(altered_json))
            # V2 VULNERABILITY: validator_fetch returns True!
            self.assertTrue(val_res, "V2 validator_fetch unexpectedly rejected altered leader output")
            return altered_json

        gl.vm.run_nondet = altered_leader_run_nondet
        try:
            tok = self.watch.set_baseline(wid)
            stored_watch = json.loads(self.watch.watches[wid])

            # Stored state contains the altered leader output!
            self.assertEqual(stored_watch["baseline_norm_hash"], stored_watch["baseline_norm_hash"][:16] + "0" * 48)
            self.assertEqual(stored_watch["baseline_raw_hash"], "f" * 64)
            self.assertEqual(stored_watch["baseline_clauses"], ["Altered clause injected by leader that was never in source terms"])
            print("[REPRODUCTION POINT 1 CONFIRMED] V2 set_baseline accepted altered leader output with matching 16-hex prefix:")
            print(f"  Stored baseline_norm_hash: {stored_watch['baseline_norm_hash']}")
            print(f"  Stored baseline_raw_hash:  {stored_watch['baseline_raw_hash']}")
            print(f"  Stored baseline_clauses:   {stored_watch['baseline_clauses']}")
        finally:
            gl.vm.run_nondet = real_run_nondet

    def test_reproduce_2_check_accepts_altered_leader_output(self):
        """
        Point 2: In V2 check, validator_run checks only verdict + '|' + norm_hash[:16].
        An altered leader output with identical token but altered hash tail, altered raw_hash,
        altered gate, altered changes, and altered snapshot_clauses is accepted and recorded.
        """
        wid = self.watch.create_watch("Test Watch 2", self.url, self.redlines)
        self.watch.set_baseline(wid)

        # Switch web response to terms-v2-subtle
        gl.nondet.web.handler = lambda u: WebResponse(200, self.v2_raw)

        real_run_nondet = gl.vm.run_nondet
        def altered_leader_run_nondet(leader_fn, validator_fn):
            honest_eval = json.loads(leader_fn())
            token = honest_eval["consensus_token"]
            prefix = token.split("|")[1] # 16-hex prefix

            altered_hash = prefix + "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
            altered_raw_hash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            altered_snapshot = ["Fabricated snapshot clause from altered leader"]
            altered_changes = [{"kind": "MODIFIED", "old": "Old text", "new": "Altered text"}]

            altered_eval = dict(honest_eval)
            altered_eval["norm_hash"] = altered_hash
            altered_eval["raw_hash"] = altered_raw_hash
            altered_eval["snapshot_clauses"] = altered_snapshot
            altered_eval["changes"] = altered_changes
            altered_eval["tripwire"] = True
            altered_json = json.dumps(altered_eval, sort_keys=True, separators=(",", ":"))

            # Pass altered leader result to validator_run
            val_res = validator_fn(Return(altered_json))
            # V2 VULNERABILITY: validator_run returns True!
            self.assertTrue(val_res, "V2 validator_run unexpectedly rejected altered leader output")
            return altered_json

        gl.vm.run_nondet = altered_leader_run_nondet
        try:
            verdict = self.watch.check(wid)
            stored_checks = json.loads(self.watch.by_watch[wid])
            cid = stored_checks[0]
            chk = json.loads(self.watch.checks[cid])

            # Stored check record contains altered leader output!
            self.assertTrue(chk["norm_hash"].endswith("a" * 48))
            self.assertEqual(chk["raw_hash16"], "b" * 16)
            self.assertEqual(chk["snapshot_clauses"], ["Fabricated snapshot clause from altered leader"])
            self.assertEqual(chk["changes"], [{"kind": "MODIFIED", "old": "Old text", "new": "Altered text"}])
            print("[REPRODUCTION POINT 2 CONFIRMED] V2 check accepted altered leader output with matching consensus_token:")
            print(f"  Stored check norm_hash:        {chk['norm_hash']}")
            print(f"  Stored check snapshot_clauses: {chk['snapshot_clauses']}")
            print(f"  Stored check changes:          {chk['changes']}")
        finally:
            gl.vm.run_nondet = real_run_nondet

    def test_reproduce_3_accept_change_accepts_mismatched_snapshot(self):
        """
        Point 3: In V2 accept_change, the contract copies chk['norm_hash'] and chk['snapshot_clauses']
        without verifying that norm_hash(snapshot_clauses) equals chk['norm_hash'].
        """
        wid = self.watch.create_watch("Test Watch 3", self.url, self.redlines)
        self.watch.set_baseline(wid)

        gl.nondet.web.handler = lambda u: WebResponse(200, self.v2_raw)
        self.watch.check(wid)

        stored_checks = json.loads(self.watch.by_watch[wid])
        cid = stored_checks[0]
        chk = json.loads(self.watch.checks[cid])

        # Manually alter snapshot_clauses in stored check to simulate an unverified stored snapshot
        chk["snapshot_clauses"] = ["Completely different unverified clause text"]
        self.watch.checks[cid] = json.dumps(chk, sort_keys=True, separators=(",", ":"))

        # V2 accept_change does not verify snapshot_clauses hash against chk['norm_hash']!
        self.watch.accept_change(wid, cid)

        watch_after = json.loads(self.watch.watches[wid])
        recomputed_baseline_hash = norm_hash(watch_after["baseline_clauses"])

        # V2 VULNERABILITY: baseline_norm_hash and norm_hash(baseline_clauses) completely disagree!
        self.assertNotEqual(watch_after["baseline_norm_hash"], recomputed_baseline_hash)
        print("[REPRODUCTION POINT 3 CONFIRMED] V2 accept_change advanced baseline with mismatched snapshot_clauses:")
        print(f"  Stored baseline_norm_hash:         {watch_after['baseline_norm_hash']}")
        print(f"  Recomputed from baseline_clauses:  {recomputed_baseline_hash}")
        print(f"  Agreement: {watch_after['baseline_norm_hash'] == recomputed_baseline_hash} (Disagreement accepted in V2!)")


if __name__ == "__main__":
    unittest.main()
