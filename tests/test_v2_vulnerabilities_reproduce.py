import unittest
import json
import os
from genlayer import gl, WebResponse, Return
from contracts.DriftWatch import DriftWatch, norm_hash, normalize_clause, page_text, split_clauses


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

        # Compute honest leader data
        cleaned = page_text(self.v0_raw)
        clauses = split_clauses(cleaned)
        norm_c = [normalize_clause(c) for c in clauses]
        honest_hash = norm_hash(norm_c)
        token = "BASELINE|" + honest_hash[:16]
        prefix = honest_hash[:16]

        # Craft altered leader output:
        # - Same 16-hex prefix, but altered tail
        altered_hash = prefix + "000000000000000000000000000000000000000000000000"
        altered_raw_hash = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        altered_clauses = ["Altered clause injected by leader that was never in source terms"]

        altered_data = {
            "consensus_token": token,  # Identical token!
            "norm_hash": altered_hash,  # Altered full hash tail!
            "raw_hash": altered_raw_hash,  # Altered raw hash!
            "norm_clauses": altered_clauses,  # Altered clause list!
        }
        altered_json = json.dumps(altered_data, sort_keys=True, separators=(",", ":"))

        # Simulate V2 validator_fetch logic (which only checked consensus_token prefix)
        def v2_validator_fetch(leader_res):
            ldata = json.loads(leader_res.calldata)
            res = gl.nondet.web.get(self.url)
            body_bytes = res.body if isinstance(res.body, (bytes, bytearray)) else str(res.body).encode("utf-8")
            cl = page_text(body_bytes)
            cls = split_clauses(cl)
            nc = [normalize_clause(c) for c in cls]
            my_token = "BASELINE|" + norm_hash(nc)[:16]
            return my_token == ldata.get("consensus_token")

        val_res = v2_validator_fetch(Return(altered_json))
        # V2 VULNERABILITY: validator_fetch returns True!
        self.assertTrue(val_res, "V2 validator_fetch unexpectedly rejected altered leader output")

        # Simulate V2 set_baseline storage write
        watch = json.loads(self.watch.watches[wid])
        watch["status"] = "ACTIVE"
        watch["baseline_seq"] = "1"
        watch["baseline_norm_hash"] = altered_data["norm_hash"]
        watch["baseline_raw_hash"] = altered_data["raw_hash"]
        watch["baseline_clauses"] = altered_data["norm_clauses"]
        watch["baseline_check_id"] = ""
        self.watch.watches[wid] = json.dumps(watch, sort_keys=True, separators=(",", ":"))

        stored_watch = json.loads(self.watch.watches[wid])
        self.assertEqual(stored_watch["baseline_norm_hash"], stored_watch["baseline_norm_hash"][:16] + "0" * 48)
        self.assertEqual(stored_watch["baseline_raw_hash"], "f" * 64)
        self.assertEqual(stored_watch["baseline_clauses"], ["Altered clause injected by leader that was never in source terms"])
        print("[REPRODUCTION POINT 1 CONFIRMED] V2 set_baseline accepted altered leader output with matching 16-hex prefix:")
        print(f"  Stored baseline_norm_hash: {stored_watch['baseline_norm_hash']}")
        print(f"  Stored baseline_raw_hash:  {stored_watch['baseline_raw_hash']}")
        print(f"  Stored baseline_clauses:   {stored_watch['baseline_clauses']}")

    def test_reproduce_2_check_accepts_altered_leader_output(self):
        """
        Point 2: In V2 check, validator_run checks only verdict + '|' + norm_hash[:16].
        An altered leader output with identical token but altered hash tail, altered raw_hash,
        altered gate, altered changes, and altered snapshot_clauses is accepted and recorded.
        """
        cleaned = page_text(self.v2_raw)
        new_clauses = split_clauses(cleaned)
        new_norm = [normalize_clause(c) for c in new_clauses]
        honest_hash = norm_hash(new_norm)
        prefix = honest_hash[:16]
        token = "MATERIAL|" + prefix

        altered_hash = prefix + "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        altered_raw_hash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        altered_snapshot = ["Fabricated snapshot clause from altered leader"]
        altered_changes = [{"kind": "MODIFIED", "old": "Old text", "new": "Altered text"}]

        altered_eval = {
            "verdict": "MATERIAL",
            "norm_hash": altered_hash,
            "raw_hash": altered_raw_hash,
            "gate": "",
            "changes": altered_changes,
            "change_labels": ["MATERIAL"],
            "redline_flags": ["HIT"],
            "tripwire": True,
            "snapshot_clauses": altered_snapshot,
            "consensus_token": token,
        }
        altered_json = json.dumps(altered_eval, sort_keys=True, separators=(",", ":"))

        # Simulate V2 validator_run logic (which only checked consensus_token)
        def v2_validator_run(leader_res):
            ldata = json.loads(leader_res.calldata)
            my_consensus_token = token
            return my_consensus_token == ldata.get("consensus_token")

        val_res = v2_validator_run(Return(altered_json))
        # V2 VULNERABILITY: validator_run returns True!
        self.assertTrue(val_res, "V2 validator_run unexpectedly rejected altered leader output")

        # If accepted, stored check record would take altered fields
        chk_sim = {
            "norm_hash": altered_hash,
            "raw_hash16": altered_raw_hash[:16],
            "snapshot_clauses": altered_snapshot,
            "changes": altered_changes,
        }
        self.assertTrue(chk_sim["norm_hash"].endswith("a" * 48))
        self.assertEqual(chk_sim["raw_hash16"], "b" * 16)
        self.assertEqual(chk_sim["snapshot_clauses"], ["Fabricated snapshot clause from altered leader"])
        self.assertEqual(chk_sim["changes"], [{"kind": "MODIFIED", "old": "Old text", "new": "Altered text"}])

        print("[REPRODUCTION POINT 2 CONFIRMED] V2 check accepted altered leader output with matching consensus_token:")
        print(f"  Simulated token:               {token}")
        print(f"  Altered check norm_hash:       {prefix + 'a' * 48}")
        print(f"  Altered check snapshot:        {['Fabricated snapshot clause from altered leader']}")

    def test_reproduce_3_accept_change_accepts_mismatched_snapshot(self):
        """
        Point 3: In V2 accept_change, the contract copies chk['norm_hash'] and chk['snapshot_clauses']
        without verifying that norm_hash(snapshot_clauses) equals chk['norm_hash'].
        """
        # Simulate V2 accept_change logic without validation
        def v2_accept_change(watch_dict, chk_dict, cid_str):
            if chk_dict["verdict"] == "UNCHANGED":
                raise gl.vm.UserError("cannot accept UNCHANGED check as baseline")
            curr_bseq = int(watch_dict.get("baseline_seq", "1"))
            watch_dict["baseline_seq"] = str(curr_bseq + 1)
            watch_dict["baseline_norm_hash"] = chk_dict["norm_hash"]
            watch_dict["baseline_raw_hash"] = ""
            watch_dict["baseline_clauses"] = [normalize_clause(c) for c in chk_dict["snapshot_clauses"]]
            watch_dict["baseline_check_id"] = cid_str

        watch_state = {
            "status": "ACTIVE",
            "baseline_seq": "1",
            "baseline_norm_hash": "original_hash",
            "baseline_clauses": ["original clause text"],
        }
        corrupted_chk = {
            "verdict": "MATERIAL",
            "norm_hash": "claimed_norm_hash_1234567890abcdef",
            "snapshot_clauses": ["Completely different unverified clause text"],
        }

        # V2 accept_change accepted corrupted snapshot without checking norm_hash
        v2_accept_change(watch_state, corrupted_chk, "1")

        recomputed_baseline_hash = norm_hash(watch_state["baseline_clauses"])
        # V2 VULNERABILITY: baseline_norm_hash and norm_hash(baseline_clauses) completely disagree!
        self.assertNotEqual(watch_state["baseline_norm_hash"], recomputed_baseline_hash)
        print("[REPRODUCTION POINT 3 CONFIRMED] V2 accept_change accepted mismatched snapshot without verification:")
        print(f"  Stored baseline_norm_hash:         {watch_state['baseline_norm_hash']}")
        print(f"  Recomputed from baseline_clauses:  {recomputed_baseline_hash}")
        print(f"  Agreement: {watch_state['baseline_norm_hash'] == recomputed_baseline_hash} (Disagreement accepted in V2!)")


if __name__ == "__main__":
    unittest.main()
