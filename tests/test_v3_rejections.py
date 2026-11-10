import unittest
import json
import os
import hashlib
from genlayer import gl, WebResponse, Return
from contracts.DriftWatch import DriftWatch, norm_hash, normalize_clause, page_text, split_clauses, raw_hash


class TestV3Rejections(unittest.TestCase):
    """
    Comprehensive verification tests for DriftWatch V3 state binding and rejection of altered proposals.
    Verifies that validators independently recompute and bind every state-bearing hash and clause snapshot,
    and that defense-in-depth checks reject inconsistent state.
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

    # -----------------------------------------------------------------------
    # Honest Leader & Honest Validator
    # -----------------------------------------------------------------------

    def test_v3_honest_leader_and_honest_validator_accepts_set_baseline(self):
        wid = self.watch.create_watch("Honest Watch Baseline", self.url, self.redlines)
        tok = self.watch.set_baseline(wid)
        self.assertTrue(tok.startswith("BASELINE|"))
        wdata = json.loads(self.watch.watches[wid])
        self.assertEqual(wdata["status"], "ACTIVE")
        self.assertEqual(wdata["baseline_seq"], "1")
        self.assertEqual(len(wdata["baseline_norm_hash"]), 64)

    def test_v3_honest_leader_and_honest_validator_accepts_check(self):
        wid = self.watch.create_watch("Honest Watch Check", self.url, self.redlines)
        self.watch.set_baseline(wid)

        gl.nondet.web.handler = lambda u: WebResponse(200, self.v2_raw)
        verdict = self.watch.check(wid)
        self.assertEqual(verdict, "MATERIAL")

        cids = json.loads(self.watch.by_watch[wid])
        self.assertEqual(len(cids), 1)
        chk = json.loads(self.watch.checks[cids[0]])
        self.assertEqual(chk["verdict"], "MATERIAL")
        self.assertEqual(len(chk["norm_hash"]), 64)

    # -----------------------------------------------------------------------
    # Matching Prefix With Altered Tail Rejection (Point 1 & Point 2)
    # -----------------------------------------------------------------------

    def test_v3_set_baseline_matching_prefix_altered_tail_rejected(self):
        """Matching 16-hex prefix with altered 48-hex tail in set_baseline returns False."""
        wid = self.watch.create_watch("Test Baseline Tail", self.url, self.redlines)

        validator_captured_res = []
        real_run_nondet = gl.vm.run_nondet

        def altered_run_nondet(leader_fn, validator_fn):
            honest_json = leader_fn()
            honest_data = json.loads(honest_json)
            token = honest_data["consensus_token"]
            prefix = token.split("|")[1]

            altered_data = dict(honest_data)
            altered_data["norm_hash"] = prefix + "0" * 48
            altered_data["state_view"]["norm_hash"] = prefix + "0" * 48
            altered_json = json.dumps(altered_data, sort_keys=True, separators=(",", ":"))

            val_res = validator_fn(Return(altered_json))
            validator_captured_res.append(val_res)
            return altered_json

        gl.vm.run_nondet = altered_run_nondet
        try:
            try:
                self.watch.set_baseline(wid)
            except gl.vm.UserError:
                pass  # Defense-in-depth will also reject if execution continued
            self.assertEqual(validator_captured_res, [False], "V3 validator_fetch MUST reject altered norm_hash tail")
        finally:
            gl.vm.run_nondet = real_run_nondet

    def test_v3_check_matching_prefix_altered_tail_rejected(self):
        """Matching 16-hex prefix with altered 48-hex tail in check returns False."""
        wid = self.watch.create_watch("Test Check Tail", self.url, self.redlines)
        self.watch.set_baseline(wid)

        gl.nondet.web.handler = lambda u: WebResponse(200, self.v2_raw)
        validator_captured_res = []
        real_run_nondet = gl.vm.run_nondet

        def altered_run_nondet(leader_fn, validator_fn):
            honest_json = leader_fn()
            honest_data = json.loads(honest_json)
            token = honest_data["consensus_token"]
            prefix = token.split("|")[1]

            altered_data = dict(honest_data)
            altered_data["norm_hash"] = prefix + "a" * 48
            altered_data["state_view"]["norm_hash"] = prefix + "a" * 48
            altered_json = json.dumps(altered_data, sort_keys=True, separators=(",", ":"))

            val_res = validator_fn(Return(altered_json))
            validator_captured_res.append(val_res)
            return altered_json

        gl.vm.run_nondet = altered_run_nondet
        try:
            try:
                self.watch.check(wid)
            except gl.vm.UserError:
                pass
            self.assertEqual(validator_captured_res, [False], "V3 validator_run MUST reject altered norm_hash tail")
        finally:
            gl.vm.run_nondet = real_run_nondet

    # -----------------------------------------------------------------------
    # Field-by-Field Alteration Tests in set_baseline
    # -----------------------------------------------------------------------

    def _run_baseline_field_alteration(self, field_name: str, alter_fn):
        wid = self.watch.create_watch(f"Field Test Baseline {field_name}", self.url, self.redlines)
        val_captured = []
        real_run_nondet = gl.vm.run_nondet

        def altered_nondet(leader_fn, validator_fn):
            honest_data = json.loads(leader_fn())
            altered_data = dict(honest_data)
            altered_data["state_view"] = dict(honest_data["state_view"])
            alter_fn(altered_data)
            altered_json = json.dumps(altered_data, sort_keys=True, separators=(",", ":"))
            val_res = validator_fn(Return(altered_json))
            val_captured.append(val_res)
            return altered_json

        gl.vm.run_nondet = altered_nondet
        try:
            try:
                self.watch.set_baseline(wid)
            except gl.vm.UserError:
                pass
            self.assertEqual(val_captured, [False], f"V3 validator_fetch must reject altered {field_name}")
        finally:
            gl.vm.run_nondet = real_run_nondet

    def test_field_baseline_norm_hash_altered(self):
        self._run_baseline_field_alteration("norm_hash", lambda d: d.update({"norm_hash": "0" * 64}))

    def test_field_baseline_raw_hash_altered(self):
        self._run_baseline_field_alteration("raw_hash", lambda d: d.update({"raw_hash": "f" * 64}))

    def test_field_baseline_norm_clauses_altered(self):
        self._run_baseline_field_alteration("norm_clauses", lambda d: d.update({"norm_clauses": ["fabricated clause"]}))

    def test_field_baseline_state_view_altered(self):
        self._run_baseline_field_alteration("state_view", lambda d: d["state_view"].update({"raw_hash": "0" * 64}))

    # -----------------------------------------------------------------------
    # Field-by-Field Alteration Tests in check
    # -----------------------------------------------------------------------

    def _run_check_field_alteration(self, field_name: str, alter_fn):
        wid = self.watch.create_watch(f"Field Test Check {field_name}", self.url, self.redlines)
        self.watch.set_baseline(wid)

        gl.nondet.web.handler = lambda u: WebResponse(200, self.v2_raw)
        val_captured = []
        real_run_nondet = gl.vm.run_nondet

        def altered_nondet(leader_fn, validator_fn):
            honest_data = json.loads(leader_fn())
            altered_data = dict(honest_data)
            altered_data["state_view"] = dict(honest_data["state_view"])
            alter_fn(altered_data)
            altered_json = json.dumps(altered_data, sort_keys=True, separators=(",", ":"))
            val_res = validator_fn(Return(altered_json))
            val_captured.append(val_res)
            return altered_json

        gl.vm.run_nondet = altered_nondet
        try:
            try:
                self.watch.check(wid)
            except gl.vm.UserError:
                pass
            self.assertEqual(val_captured, [False], f"V3 validator_run must reject altered {field_name}")
        finally:
            gl.vm.run_nondet = real_run_nondet

    def test_field_check_verdict_altered(self):
        self._run_check_field_alteration("verdict", lambda d: d.update({"verdict": "COSMETIC"}))

    def test_field_check_gate_altered(self):
        self._run_check_field_alteration("gate", lambda d: d.update({"gate": "OVERFLOW"}))

    def test_field_check_norm_hash_altered(self):
        self._run_check_field_alteration("norm_hash", lambda d: d.update({"norm_hash": "e" * 64}))

    def test_field_check_raw_hash_altered(self):
        self._run_check_field_alteration("raw_hash", lambda d: d.update({"raw_hash": "1" * 64}))

    def test_field_check_snapshot_clauses_altered(self):
        self._run_check_field_alteration("snapshot_clauses", lambda d: d.update({"snapshot_clauses": ["fabricated snapshot"]}))

    def test_field_check_changes_altered(self):
        self._run_check_field_alteration("changes", lambda d: d.update({"changes": []}))

    def test_field_check_tripwire_altered(self):
        self._run_check_field_alteration("tripwire", lambda d: d.update({"tripwire": not d["tripwire"]}))

    def test_field_check_state_view_altered(self):
        self._run_check_field_alteration("state_view", lambda d: d["state_view"].update({"verdict": "REVIEW"}))

    # -----------------------------------------------------------------------
    # Defense-in-Depth Tests
    # -----------------------------------------------------------------------

    def test_v3_defense_in_depth_set_baseline_raises_inconsistent(self):
        """If altered state somehow bypasses validator in set_baseline, UserError is raised."""
        wid = self.watch.create_watch("Defense Test Baseline", self.url, self.redlines)
        real_run_nondet = gl.vm.run_nondet

        def forged_run_nondet(leader_fn, validator_fn):
            honest_data = json.loads(leader_fn())
            forged_data = dict(honest_data)
            # Forge norm_hash without altering norm_clauses
            forged_data["norm_hash"] = "9" * 64
            return json.dumps(forged_data, sort_keys=True, separators=(",", ":"))

        gl.vm.run_nondet = forged_run_nondet
        try:
            with self.assertRaises(gl.vm.UserError) as ctx:
                self.watch.set_baseline(wid)
            self.assertIn("baseline state inconsistent", str(ctx.exception))
        finally:
            gl.vm.run_nondet = real_run_nondet

    def test_v3_defense_in_depth_check_raises_inconsistent(self):
        """If altered snapshot_clauses somehow bypasses validator in check, UserError is raised."""
        wid = self.watch.create_watch("Defense Test Check", self.url, self.redlines)
        self.watch.set_baseline(wid)

        gl.nondet.web.handler = lambda u: WebResponse(200, self.v2_raw)
        real_run_nondet = gl.vm.run_nondet

        def forged_run_nondet(leader_fn, validator_fn):
            honest_data = json.loads(leader_fn())
            forged_data = dict(honest_data)
            forged_data["snapshot_clauses"] = ["Fabricated snapshot clauses"]
            return json.dumps(forged_data, sort_keys=True, separators=(",", ":"))

        gl.vm.run_nondet = forged_run_nondet
        try:
            with self.assertRaises(gl.vm.UserError) as ctx:
                self.watch.check(wid)
            self.assertIn("baseline state inconsistent", str(ctx.exception))
        finally:
            gl.vm.run_nondet = real_run_nondet

    # -----------------------------------------------------------------------
    # Point 3: accept_change Rejection
    # -----------------------------------------------------------------------

    def test_v3_accept_change_rejects_altered_snapshot(self):
        """
        Point 3: In V3 accept_change, recomputing norm_hash(snapshot_clauses) and comparing
        to chk['norm_hash'] prevents accepting altered snapshot clauses as baseline.
        """
        wid = self.watch.create_watch("Accept Change Test", self.url, self.redlines)
        self.watch.set_baseline(wid)

        gl.nondet.web.handler = lambda u: WebResponse(200, self.v2_raw)
        self.watch.check(wid)

        stored_checks = json.loads(self.watch.by_watch[wid])
        cid = stored_checks[0]
        chk = json.loads(self.watch.checks[cid])

        # Tamper snapshot_clauses in check record
        chk["snapshot_clauses"] = ["Altered clause that violates agreement with norm_hash"]
        self.watch.checks[cid] = json.dumps(chk, sort_keys=True, separators=(",", ":"))

        # V3 accept_change MUST raise check snapshot does not match its recorded hash
        with self.assertRaises(gl.vm.UserError) as ctx:
            self.watch.accept_change(wid, cid)
        self.assertIn("check snapshot does not match its recorded hash", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
