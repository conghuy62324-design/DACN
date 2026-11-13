"""Synthetic-only gate regressions. No human submission or receipt is created."""
from __future__ import annotations

import argparse
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

from ai.research.data import (GateError, check_support, group_and_dedupe,
                              validate_annotations, validate_evidence,
                              validate_research_row)
from ai.research.pipeline import parser, prepare, select


def row(row_id: str, pool: str, text: str, contributor: str, entity: str, label: str = "NEGATIVE") -> dict:
    return {
        "row_id": row_id, "pool_candidate": pool, "text_clean": text, "final_label": label,
        "domain": "hotel", "collection_batch_id": "SYNTHETIC_TEST_ONLY",
        "form_version": "synthetic-v1", "guideline_version": "synthetic-v1",
        "contributor_group_id": contributor, "entity_group_id": entity,
        "source_family": "SYNTHETIC_TEST_ONLY", "collection_method_version": "synthetic-v1",
        "collection_date": "2026-10-30", "provenance_type": "ORIGINAL_PERSONAL_EXPERIENCE",
        "pii_review_status": "CLEARED", "provenance_review_status": "CLEARED",
        "annotation_status": "SINGLE_LABELED", "label_map_id": "hugo-vi-sentiment-3class-v1",
    }


def evidence(row_id: str) -> dict:
    return {
        "row_id": row_id, "receipt_id": "SYNTHETIC_TEST_ONLY",
        "receipt_evidence_locator": "SYNTHETIC_TEST_ONLY", "rights_reviewer_id": "SYNTHETIC_TEST_ONLY",
        "rights_reviewed_at": "2026-10-30", "notice_version": "synthetic-v1",
        "form_version": "synthetic-v1", "guideline_version": "synthetic-v1",
        "receipt_verified": True, "research_opt_in": True, "originality_attested": True,
        "no_ai_no_copy_attested": True, "withdrawal_status": "ACTIVE",
        "private_kaggle_opt_in": False,
        "annotations": [{"annotator_id": "SYNTHETIC_A", "label_proposed": "NEGATIVE", "guideline_version": "synthetic-v1"}],
    }


class ResearchGateTests(unittest.TestCase):
    def test_duplicate_id_and_cross_file_duplicate(self):
        dev = row("id-00001", "DEVELOPMENT_CANDIDATE", "Dịch vụ rất tệ và chậm", "a", "e1")
        test = row("id-00002", "INDEPENDENT_TEST_CANDIDATE", "Dịch vụ rất tệ và chậm", "b", "e2")
        with self.assertRaisesRegex(GateError, "duplicate row_id"):
            group_and_dedupe([dev, {**test, "row_id": "id-00001"}])
        with self.assertRaisesRegex(GateError, "cross-file exact/near duplicate"):
            group_and_dedupe([dev, test])

    def test_group_leakage_and_pilot_exclusion(self):
        dev = row("id-00001", "DEVELOPMENT_CANDIDATE", "Phòng quá ồn vào buổi tối", "same", "e1")
        test = row("id-00002", "INDEPENDENT_TEST_CANDIDATE", "Bữa ăn không ngon và nguội", "same", "e2")
        with self.assertRaisesRegex(GateError, "group leakage"):
            group_and_dedupe([dev, test])
        pilot = row("id-00003", "PILOT", "Tôi rất thất vọng vì chờ lâu", "same", "e3")
        kept, audit = group_and_dedupe([dev, pilot])
        self.assertEqual(kept, [])
        self.assertEqual(audit["pilot_and_related_excluded"], 2)

    def test_invalid_label_missing_metadata_and_pii(self):
        good = row("id-00001", "DEVELOPMENT_CANDIDATE", "Phòng rất yên tĩnh và sạch", "a", "e1")
        with self.assertRaisesRegex(GateError, "invalid domain/final_label"):
            validate_research_row({**good, "final_label": "MIXED"}, good["pool_candidate"])
        with self.assertRaisesRegex(GateError, "contributor_group_id"):
            validate_research_row({**good, "contributor_group_id": None}, good["pool_candidate"])
        with self.assertRaisesRegex(GateError, "PII scanner quarantine"):
            validate_research_row({**good, "text_clean": "Liên hệ abc@example.com"}, good["pool_candidate"])
        with self.assertRaisesRegex(GateError, "content hash mismatch"):
            validate_research_row({**good, "content_sha256": "0" * 64}, good["pool_candidate"])
        with self.assertRaisesRegex(GateError, "invalid collection_date"):
            validate_research_row({**good, "collection_date": "2026-02-30"}, good["pool_candidate"])

    def test_consent_withdrawal_and_kaggle_permission(self):
        candidate = row("id-00001", "DEVELOPMENT_CANDIDATE", "Phòng sạch", "a", "e1")
        info = evidence(candidate["row_id"])
        with self.assertRaisesRegex(GateError, "withdrawn"):
            validate_evidence(candidate, {**info, "withdrawal_status": "WITHDRAWN"}, "local")
        with self.assertRaisesRegex(GateError, "research_opt_in"):
            validate_evidence(candidate, {**info, "research_opt_in": None}, "local")
        self.assertFalse(validate_evidence(candidate, info, "kaggle"))
        self.assertTrue(validate_evidence(candidate, info, "local"))

    def test_annotation_and_support_gates(self):
        candidate = row("id-00001", "INDEPENDENT_TEST_CANDIDATE", "Phòng sạch", "a", "e1")
        with self.assertRaisesRegex(GateError, "two independent annotators"):
            validate_annotations(candidate, evidence(candidate["row_id"]))
        candidate["leakage_group_id"] = "synthetic-group"
        with self.assertRaisesRegex(GateError, "below MVP floor"):
            check_support([candidate], [candidate])

    def test_demo_hash_mismatch_blocks_selection(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory) / "snapshot"
            args = argparse.Namespace(mode="demo", environment="local", fixture=None, evidence=None,
                                      protocol=None, development=None, independent_test=None, pilot=None,
                                      output_dir=base, test_output_dir=None, quarantine_report=None)
            prepare(args)
            with (base / "train.jsonl").open("a", encoding="utf-8") as output:
                output.write("\n")
            with self.assertRaisesRegex(GateError, "SHA-256 mismatch"):
                select(argparse.Namespace(manifest=base / "manifest.json", approval=None, output=base / "selection.json"))

    def test_research_cli_rejects_insufficient_synthetic_support(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            dev = row("id-00001", "DEVELOPMENT_CANDIDATE", "Phòng rất sạch", "a", "e1")
            test = row("id-00002", "INDEPENDENT_TEST_CANDIDATE", "Nhà hàng rất chậm", "b", "e2")
            test["annotation_status"] = "DOUBLE_LABELED"
            ev_test = evidence(test["row_id"])
            ev_test["annotations"].append({"annotator_id": "SYNTHETIC_B", "label_proposed": "NEGATIVE", "guideline_version": "synthetic-v1"})
            for name, items in (("development.jsonl", [dev]), ("test.jsonl", [test]), ("evidence.jsonl", [evidence(dev["row_id"]), ev_test])):
                (base / name).write_text("".join(json.dumps(item, ensure_ascii=False) + "\n" for item in items), encoding="utf-8")
            protocol = {"guideline_version": "synthetic-v1", "agreement_policy_version": "synthetic-v1",
                        "guideline_status": "FROZEN", "agreement_policy_status": "FROZEN",
                        "test_custodian_id": "SYNTHETIC_CUSTODIAN", "model_selector_id": "SYNTHETIC_SELECTOR",
                        "rights_reviewer_id": "SYNTHETIC_REVIEWER", "frozen_at": "2026-10-30",
                        "source_family": "SYNTHETIC_TEST_ONLY", "min_groups_development": 1,
                        "min_groups_test": 1, "min_domain_label_count": 1}
            (base / "protocol.json").write_text(json.dumps(protocol), encoding="utf-8")
            args = argparse.Namespace(mode="research", environment="local", fixture=None,
                                      development=base / "development.jsonl", independent_test=base / "test.jsonl",
                                      pilot=None, evidence=base / "evidence.jsonl", protocol=base / "protocol.json",
                                      output_dir=base / "selector", test_output_dir=base / "custodian", quarantine_report=None)
            with self.assertRaisesRegex(GateError, "below MVP floor"):
                prepare(args)
            self.assertFalse(args.output_dir.exists())
            self.assertFalse(args.test_output_dir.exists())
            dev["text_clean"] = "Liên hệ abc@example.com để nhận phòng"
            (base / "development.jsonl").write_text(json.dumps(dev, ensure_ascii=False) + "\n", encoding="utf-8")
            args.quarantine_report = base / "quarantine.json"
            with self.assertRaisesRegex(GateError, "PII scanner quarantined 1"):
                prepare(args)
            quarantine = json.loads(args.quarantine_report.read_text(encoding="utf-8"))
            self.assertEqual(quarantine["rows"], [{"finding_types": ["email"], "row_id": "id-00001"}])
            self.assertNotIn("abc@example.com", args.quarantine_report.read_text(encoding="utf-8"))

    def test_select_cli_has_no_test_input(self):
        with contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as error:
                parser().parse_args(["select", "--manifest", "manifest.json", "--output", "selection.json", "--independent-test", "locked.jsonl"])
        self.assertEqual(error.exception.code, 2)

    @unittest.skipUnless(importlib.util.find_spec("sklearn") is not None, "scikit-learn runtime unavailable")
    def test_selection_does_not_open_demo_holdout(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory) / "snapshot"
            args = argparse.Namespace(mode="demo", environment="local", fixture=None, evidence=None,
                                      protocol=None, development=None, independent_test=None, pilot=None,
                                      output_dir=base, test_output_dir=None, quarantine_report=None)
            prepare(args)
            (base / "demo_holdout.jsonl").unlink()
            result = select(argparse.Namespace(manifest=base / "manifest.json", approval=None, output=base / "selection.json"))
            self.assertEqual(result["status"], "DEMO_ONLY")


if __name__ == "__main__":
    unittest.main()
