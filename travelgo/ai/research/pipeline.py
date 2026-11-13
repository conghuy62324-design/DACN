"""T09 research pipeline. Run `python -m ai.research.pipeline --help` from repo root."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import platform
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from ai.research.data import (DOMAINS, LABELS, LABEL_MAP_ID, SCHEMA, GateError, PIIQuarantineError,
                              check_support, demo_rows, group_and_dedupe,
                              public_rows, read_jsonl, sha256, split_demo,
                              split_development, validate_annotations,
                              validate_evidence, validate_research_row, write_jsonl)

SEED = 42
PROTOCOL = "hugo-mvp-visent-t09-v1"
FAMILY_ORDER = ("majority", "word", "char", "combined")
C_GRID = (0.5, 1.0, 2.0)


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise GateError(f"cannot read JSON: {path}") from exc
    if not isinstance(value, dict):
        raise GateError(f"JSON object required: {path}")
    return value


def counts(rows: list[dict]) -> dict:
    return {
        "total": len(rows),
        "by_label": {label: sum(r["final_label"] == label for r in rows) for label in LABELS},
        "by_domain": {domain: sum(r["domain"] == domain for r in rows) for domain in DOMAINS},
        "by_domain_label": {domain: {label: sum(r["domain"] == domain and r["final_label"] == label for r in rows) for label in LABELS} for domain in DOMAINS},
        "independent_groups": len({r["leakage_group_id"] for r in rows}),
    }


def _audit_splits(splits: dict[str, list[dict]]) -> None:
    seen_ids, seen_groups = set(), set()
    from ai.research.data import is_near
    previous = []
    for name, rows in splits.items():
        ids = {r["row_id"] for r in rows}
        groups = {r["leakage_group_id"] for r in rows}
        if len(ids) != len(rows) or ids & seen_ids or groups & seen_groups:
            raise GateError(f"{name}: row ID/group leakage")
        for i, row in enumerate(rows):
            if any(is_near(row["text_clean"], other["text_clean"]) for other in rows[i + 1 :]):
                raise GateError(f"{name}: unremoved within-split exact/near duplicate")
        for row in rows:
            if any(is_near(row["text_clean"], other["text_clean"]) for other in previous):
                raise GateError(f"{name}: cross-split exact/near duplicate")
        previous.extend(rows)
        seen_ids.update(ids)
        seen_groups.update(groups)


def _validate_protocol(path: Path) -> dict:
    protocol = read_json(path)
    for key in ("guideline_version", "agreement_policy_version", "test_custodian_id",
                "rights_reviewer_id", "frozen_at", "source_family"):
        if not isinstance(protocol.get(key), str) or not protocol[key].strip() or protocol[key] == "TODO":
            raise GateError(f"protocol missing/frozen field: {key}")
    if protocol.get("guideline_status") != "FROZEN" or protocol.get("agreement_policy_status") != "FROZEN":
        raise GateError("guideline/agreement policy not frozen")
    if protocol.get("test_custodian_id") == protocol.get("model_selector_id"):
        raise GateError("test custodian must differ from model selector")
    for key in ("min_groups_development", "min_groups_test", "min_domain_label_count"):
        if type(protocol.get(key)) is not int or protocol[key] < 1:
            raise GateError(f"protocol must freeze positive {key} before main collection")
    return protocol


def prepare(args: argparse.Namespace) -> dict:
    started = time.perf_counter()
    if args.output_dir.exists():
        raise GateError("output directory already exists; choose a new directory")
    if args.mode == "research":
        if not args.test_output_dir or args.test_output_dir.exists() or args.test_output_dir.resolve() == args.output_dir.resolve() or args.output_dir.resolve() in args.test_output_dir.resolve().parents or args.test_output_dir.resolve() in args.output_dir.resolve().parents:
            raise GateError("research needs a new --test-output-dir outside selector output directory")
    elif args.test_output_dir:
        raise GateError("demo does not use --test-output-dir")
    source_hashes = {}
    if args.mode == "demo":
        if args.environment != "local" or args.evidence or args.protocol or args.development or args.independent_test or args.pilot or args.quarantine_report:
            raise GateError("demo accepts only --fixture and local environment")
        fixture = args.fixture or Path("ai/fixtures/vietnamese_sentiment_demo.jsonl")
        rows = demo_rows(fixture)
        input_counts = {"demo_fixture": len(rows)}
        rights_eligible_counts = {"demo_fixture": len(rows)}
        source_hashes["fixture"] = sha256(fixture)
        train, validation, test = split_demo(rows)
        status = "DEMO_ONLY"
        data_mode = "DEMO_ONLY"
        exclusions = {"pilot_and_related_excluded": 0, "duplicate_rows_excluded": 0}
        protocol_hash = None
        test_name = "demo_holdout.jsonl"
    else:
        if not args.development or not args.independent_test or not args.evidence or not args.protocol or args.fixture:
            raise GateError("research needs --development, --independent-test, --evidence and --protocol")
        protocol = _validate_protocol(args.protocol)
        protocol_hash = sha256(args.protocol)
        inputs = [("DEVELOPMENT_CANDIDATE", args.development), ("INDEPENDENT_TEST_CANDIDATE", args.independent_test)]
        if args.pilot:
            inputs.append(("PILOT", args.pilot))
        rows = []
        quarantined = []
        for pool, path in inputs:
            source_hashes[pool] = sha256(path)
            for row in read_jsonl(path):
                try:
                    rows.append(validate_research_row(row, pool))
                except PIIQuarantineError as exc:
                    quarantined.append({"row_id": exc.row_id, "finding_types": exc.findings})
        if quarantined:
            if args.quarantine_report:
                if args.quarantine_report.exists():
                    raise GateError("quarantine report already exists")
                args.quarantine_report.parent.mkdir(parents=True, exist_ok=True)
                save_json(args.quarantine_report, {"status": "QUARANTINED_PENDING_HUMAN_REVIEW",
                                                   "count": len(quarantined), "rows": quarantined,
                                                   "note": "ID and pattern category only; original input remains unchanged"})
            raise GateError(f"PII scanner quarantined {len(quarantined)} row(s); human review required")
        input_counts = {pool: sum(r["pool_candidate"] == pool for r in rows) for pool, _ in inputs}
        ids = [r["row_id"] for r in rows]
        if len(ids) != len(set(ids)):
            raise GateError("duplicate row_id across input files")
        linked = read_jsonl(args.evidence)
        if len({r.get("row_id") for r in linked}) != len(linked) or {r.get("row_id") for r in linked} != set(ids):
            raise GateError("evidence row IDs do not match input inventory")
        evidence = {r["row_id"]: r for r in linked}
        source_hashes["evidence"] = sha256(args.evidence)  # hash only; do not export receipt fields
        eligible_ids = set()
        for row in rows:
            item = evidence[row["row_id"]]
            if row["guideline_version"] != protocol["guideline_version"] or row["source_family"] != protocol["source_family"]:
                raise GateError(f"{row['row_id']}: protocol version/source mismatch")
            if validate_evidence(row, item, args.environment):
                eligible_ids.add(row["row_id"])
            validate_annotations(row, item)
        rights_eligible_counts = {pool: sum(r["pool_candidate"] == pool and r["row_id"] in eligible_ids for r in rows) for pool, _ in inputs}
        grouped, exclusions = group_and_dedupe(rows)
        exclusions["environment_rights_excluded"] = len([r for r in grouped if r["row_id"] not in eligible_ids])
        grouped = [r for r in grouped if r["row_id"] in eligible_ids]
        dev = [r for r in grouped if r["pool_candidate"] == "DEVELOPMENT_CANDIDATE"]
        test = [r for r in grouped if r["pool_candidate"] == "INDEPENDENT_TEST_CANDIDATE"]
        check_support(dev, test)
        for name, subset, minimum in (("development", dev, protocol["min_groups_development"]), ("test", test, protocol["min_groups_test"])):
            if len({r["leakage_group_id"] for r in subset}) < minimum:
                raise GateError(f"{name}: below frozen independent group minimum")
            for domain in DOMAINS:
                for label in LABELS:
                    if sum(r["domain"] == domain and r["final_label"] == label for r in subset) < protocol["min_domain_label_count"]:
                        raise GateError(f"{name}: below frozen domain x label minimum")
        double_count = sum(len(evidence[r["row_id"]]["annotations"]) >= 2 for r in dev)
        if double_count < math.ceil(.20 * len(dev)):
            raise GateError(f"development double annotation below 20%: {double_count}/{len(dev)}")
        train, validation = split_development(dev, SEED)
        status = "AUTOMATED_GATES_PASS_HUMAN_SIGNOFF_REQUIRED"
        data_mode = "RESEARCH_CANDIDATE"
        test_name = "independent_test.jsonl"
    splits = {"train": train, "validation": validation, "test": test}
    _audit_splits(splits)
    args.output_dir.mkdir(parents=True)
    file_names = {"train": "train.jsonl", "validation": "validation.jsonl", "test": test_name}
    if args.mode == "research":
        args.test_output_dir.mkdir(parents=True)
    for name, path_name in file_names.items():
        destination = args.test_output_dir if name == "test" and args.mode == "research" else args.output_dir
        write_jsonl(destination / path_name, public_rows(splits[name]))
    manifest = {
        "schema_version": SCHEMA, "protocol_id": PROTOCOL, "status": status, "data_mode": data_mode,
        "environment": args.environment, "seed": SEED, "label_map_id": LABEL_MAP_ID,
        "quality_claim_allowed": False, "production_eligible": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "python_version": platform.python_version(),
        "input_counts": input_counts, "rights_eligible_counts": rights_eligible_counts,
        "input_sha256": source_hashes, "protocol_sha256": protocol_hash,
        "label_map_sha256": sha256(Path("ai/configs/vietnamese_sentiment_label_map.json")),
        "pipeline_sha256": sha256(Path(__file__)),
        "data_module_sha256": sha256(Path(__file__).with_name("data.py")),
        "requirements_sha256": sha256(Path(__file__).with_name("requirements.txt")),
        "exclusions": exclusions,
        "files": {name: {"name": file_names[name], "sha256": sha256((args.test_output_dir if name == "test" and args.mode == "research" else args.output_dir) / file_names[name]), "inventory": counts(splits[name])} for name in splits},
        "split_checks": {"row_overlap": 0, "group_overlap": 0, "exact_near_overlap": 0},
        "human_signoff_required": args.mode == "research",
        "preparation_seconds": time.perf_counter() - started,
        "test_access_note": "Test file is in a separate custodian output directory, absent from selector manifest directory; evaluate needs --test-file from custodian." if args.mode == "research" else "DEMO_HOLDOUT; never an independent research test",
    }
    save_json(args.output_dir / "manifest.json", manifest)
    return {"status": status, "data_mode": data_mode, "quality_claim_allowed": False,
            "production_eligible": False, "output_dir": str(args.output_dir),
            "counts": {name: counts(value) for name, value in splits.items()}}


def _verify_approval(manifest_path: Path, manifest: dict, approval_path: Path | None) -> None:
    if manifest.get("data_mode") == "DEMO_ONLY":
        return
    if not approval_path:
        raise GateError("research requires --approval from data custodian after human evidence review")
    approval = read_json(approval_path)
    if approval.get("manifest_sha256") != sha256(manifest_path) or approval.get("status") != "APPROVED" or not approval.get("approved_by") or not approval.get("approved_at") or approval.get("environment") != manifest.get("environment"):
        raise GateError("approval missing or manifest hash/environment mismatch")


def _load_split(base: Path, manifest: dict, name: str, override: Path | None = None) -> list[dict]:
    item = manifest.get("files", {}).get(name)
    if not isinstance(item, dict) or not isinstance(item.get("name"), str):
        raise GateError(f"manifest missing {name}")
    path = override if override else base / item["name"]
    if (not override and path.parent.resolve() != base.resolve()) or sha256(path) != item.get("sha256"):
        raise GateError(f"{name}: SHA-256 mismatch or unsafe path")
    rows = read_jsonl(path)
    if counts(rows) != item.get("inventory"):
        raise GateError(f"{name}: inventory mismatch")
    if any(r.get("data_mode") != manifest["data_mode"] or r.get("quality_claim_allowed") is not False or r.get("production_eligible") is not False for r in rows):
        raise GateError(f"{name}: row governance mismatch")
    return rows


def _model(family: str, c: float | None):
    from sklearn.dummy import DummyClassifier
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import FeatureUnion, Pipeline
    from sklearn.linear_model import LogisticRegression
    if family == "majority":
        return DummyClassifier(strategy="most_frequent")
    word = TfidfVectorizer(analyzer="word", ngram_range=(1, 2), min_df=1, sublinear_tf=True, lowercase=True)
    char = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True, lowercase=True)
    features = {"word": word, "char": char, "combined": FeatureUnion([("word", word), ("char", char)])}[family]
    return Pipeline([("features", features), ("classifier", LogisticRegression(C=c, max_iter=2000, class_weight="balanced", solver="lbfgs", random_state=SEED))])


def _metrics(y: list[str], prediction: list[str]) -> dict:
    from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
    return {"macro_f1": float(f1_score(y, prediction, labels=LABELS, average="macro", zero_division=0)),
            "accuracy": float(accuracy_score(y, prediction)),
            "per_class": classification_report(y, prediction, labels=LABELS, output_dict=True, zero_division=0),
            "confusion_matrix": confusion_matrix(y, prediction, labels=LABELS).tolist()}


def _guard_manifest(path: Path, approval: Path | None) -> dict:
    manifest = read_json(path)
    if manifest.get("schema_version") != SCHEMA or manifest.get("protocol_id") != PROTOCOL or manifest.get("label_map_id") != LABEL_MAP_ID:
        raise GateError("manifest schema/protocol/label map mismatch")
    if manifest.get("data_mode") == "DEMO_ONLY":
        if manifest.get("status") != "DEMO_ONLY" or manifest.get("quality_claim_allowed") is not False or manifest.get("production_eligible") is not False:
            raise GateError("demo manifest governance mismatch")
    elif manifest.get("data_mode") == "RESEARCH_CANDIDATE":
        if manifest.get("status") != "AUTOMATED_GATES_PASS_HUMAN_SIGNOFF_REQUIRED":
            raise GateError("research manifest not gate checked")
    else:
        raise GateError("unknown data_mode")
    if sha256(Path("ai/configs/vietnamese_sentiment_label_map.json")) != manifest.get("label_map_sha256"):
        raise GateError("label map hash mismatch")
    if sha256(Path(__file__)) != manifest.get("pipeline_sha256"):
        raise GateError("pipeline code hash changed since prepare; create a new snapshot")
    if sha256(Path(__file__).with_name("data.py")) != manifest.get("data_module_sha256"):
        raise GateError("data validation code hash changed since prepare; create a new snapshot")
    if sha256(Path(__file__).with_name("requirements.txt")) != manifest.get("requirements_sha256"):
        raise GateError("requirements specification hash changed since prepare")
    _verify_approval(path, manifest, approval)
    return manifest


def select(args: argparse.Namespace) -> dict:
    manifest = _guard_manifest(args.manifest, args.approval)
    base = args.manifest.parent
    # Deliberately load only train and validation. The test file is not opened here.
    train = _load_split(base, manifest, "train")
    validation = _load_split(base, manifest, "validation")
    _audit_splits({"train": train, "validation": validation})
    from sklearn.metrics import f1_score
    x_train, y_train = [r["text_clean"] for r in train], [r["final_label"] for r in train]
    x_val, y_val = [r["text_clean"] for r in validation], [r["final_label"] for r in validation]
    results = []
    started = time.perf_counter()
    for family in FAMILY_ORDER:
        for c in ((None,) if family == "majority" else C_GRID):
            model = _model(family, c)
            model.fit(x_train, y_train)
            score = float(f1_score(y_val, model.predict(x_val), labels=LABELS, average="macro", zero_division=0))
            results.append({"family": family, "C": c, "validation_macro_f1": score})
    # Frozen tie break: highest Macro-F1, then FAMILY_ORDER, then ascending C.
    best = sorted(results, key=lambda item: (-item["validation_macro_f1"], FAMILY_ORDER.index(item["family"]), item["C"] or 0))[0]
    by_family = {family: sorted((r for r in results if r["family"] == family), key=lambda r: (-r["validation_macro_f1"], r["C"] or 0))[0] for family in FAMILY_ORDER}
    out = {
        "protocol_id": PROTOCOL, "data_mode": manifest["data_mode"], "status": manifest["status"],
        "quality_claim_allowed": False, "production_eligible": False,
        "manifest_sha256": sha256(args.manifest),
        "train_sha256": manifest["files"]["train"]["sha256"], "validation_sha256": manifest["files"]["validation"]["sha256"],
        "selected": best, "validation_grid": results, "frozen_ablation_configs": by_family,
        "tie_break": "Macro-F1 descending; majority, word, char, combined; C ascending",
        "refit_protocol": "Fit selected and prespecified ablations on train+validation once; evaluate locked test once; do not reselect",
        "selection_seconds": time.perf_counter() - started,
    }
    if args.output.exists():
        raise GateError("selection output already exists")
    save_json(args.output, out)
    return {"status": manifest["status"], "data_mode": manifest["data_mode"],
            "quality_claim_allowed": False, "production_eligible": False,
            "selected": best, "output": str(args.output)}


def _bootstrap_group_ci(y: list[str], pred: list[str], groups: list[str], repetitions: int = 500) -> dict:
    import numpy as np
    from sklearn.metrics import f1_score
    indices = {}
    for i, group in enumerate(groups):
        indices.setdefault(group, []).append(i)
    keys = list(indices)
    rng = np.random.default_rng(SEED)
    scores = []
    for _ in range(repetitions):
        sample = [index for key in rng.choice(keys, size=len(keys), replace=True) for index in indices[key]]
        scores.append(float(f1_score([y[i] for i in sample], [pred[i] for i in sample], labels=LABELS, average="macro", zero_division=0)))
    return {"method": "group bootstrap percentile", "unit": "leakage_group_id", "repetitions": repetitions,
            "seed": SEED, "lower_95": float(np.percentile(scores, 2.5)), "upper_95": float(np.percentile(scores, 97.5))}


def evaluate(args: argparse.Namespace) -> dict:
    manifest = _guard_manifest(args.manifest, args.approval)
    selection = read_json(args.selection)
    if selection.get("protocol_id") != PROTOCOL or selection.get("manifest_sha256") != sha256(args.manifest) or selection.get("train_sha256") != manifest["files"]["train"]["sha256"] or selection.get("validation_sha256") != manifest["files"]["validation"]["sha256"]:
        raise GateError("selection/manifest/train/validation hash mismatch")
    if selection.get("selected") not in selection.get("validation_grid", []):
        raise GateError("selection not in frozen validation grid")
    expected_best = sorted(selection["validation_grid"], key=lambda item: (-item["validation_macro_f1"], FAMILY_ORDER.index(item["family"]), item["C"] or 0))[0]
    if selection["selected"] != expected_best:
        raise GateError("selection differs from frozen validation tie-break")
    if manifest["data_mode"] == "RESEARCH_CANDIDATE":
        if not args.selection_lock:
            raise GateError("research final evaluation needs custodian --selection-lock before test is released")
        lock = read_json(args.selection_lock)
        if lock.get("selection_sha256") != sha256(args.selection) or lock.get("manifest_sha256") != sha256(args.manifest) or not lock.get("locked_by") or not lock.get("locked_at"):
            raise GateError("selection lock/hash mismatch")
    if args.output_dir.exists():
        raise GateError("evaluation output directory already exists")
    base = args.manifest.parent
    if manifest["data_mode"] == "RESEARCH_CANDIDATE" and not args.test_file:
        raise GateError("research final evaluation needs --test-file from custodian")
    train = _load_split(base, manifest, "train")
    validation = _load_split(base, manifest, "validation")
    test = _load_split(base, manifest, "test", args.test_file)
    _audit_splits({"train": train, "validation": validation, "test": test})
    dev = train + validation
    x_dev, y_dev = [r["text_clean"] for r in dev], [r["final_label"] for r in dev]
    x_test, y_test = [r["text_clean"] for r in test], [r["final_label"] for r in test]
    import joblib
    import numpy
    import sklearn
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    started = time.perf_counter()
    ablations = {}
    selected_name = selection["selected"]["family"]
    selected_model, selected_predictions = None, None
    for family in FAMILY_ORDER:
        config = selection["frozen_ablation_configs"].get(family)
        if not config or config not in selection["validation_grid"]:
            raise GateError("ablation config not frozen on validation")
        model = _model(family, config["C"])
        model.fit(x_dev, y_dev)
        predict_started = time.perf_counter()
        predictions = model.predict(x_test).tolist()
        elapsed = time.perf_counter() - predict_started
        ablations[family] = {"config": config, "metrics": _metrics(y_test, predictions), "prediction_seconds": elapsed}
        if family == selected_name:
            selected_model, selected_predictions = model, predictions
    selected_metrics = ablations[selected_name]["metrics"]
    selected_metrics["by_domain"] = {
        domain: {"support": sum(r["domain"] == domain for r in test),
                 "errors": sum(r["domain"] == domain and actual != predicted for r, actual, predicted in zip(test, y_test, selected_predictions))}
        for domain in DOMAINS
    }
    selected_metrics["group_bootstrap_95_ci"] = _bootstrap_group_ci(y_test, selected_predictions, [r["leakage_group_id"] for r in test])
    args.output_dir.mkdir(parents=True)
    model_path = args.output_dir / ("selected_model_DEMO_ONLY.joblib" if manifest["data_mode"] == "DEMO_ONLY" else "selected_model_research_candidate.joblib")
    joblib.dump({"model": selected_model, "data_mode": manifest["data_mode"],
                "quality_claim_allowed": False, "production_eligible": False}, model_path)
    model_hash = sha256(model_path)
    reloaded = joblib.load(model_path)
    if sha256(model_path) != model_hash or reloaded["data_mode"] != manifest["data_mode"] or reloaded["quality_claim_allowed"] is not False or reloaded["production_eligible"] is not False or reloaded["model"].predict(x_test).tolist() != selected_predictions:
        raise GateError("model reload parity failed")
    matrix = selected_metrics["confusion_matrix"]
    figure, axis = plt.subplots(figsize=(6, 5))
    axis.imshow(matrix, cmap="Blues")
    axis.set_xticks(range(3), LABELS, rotation=25)
    axis.set_yticks(range(3), LABELS)
    axis.set_xlabel("Predicted")
    axis.set_ylabel("Actual")
    axis.set_title(("DEMO_ONLY — quality_claim_allowed=false\nproduction_eligible=false" if manifest["data_mode"] == "DEMO_ONLY" else "Research candidate — quality=false, production=false"))
    for i in range(3):
        for j in range(3):
            axis.text(j, i, str(matrix[i][j]), ha="center", va="center")
    figure.tight_layout()
    figure.savefig(args.output_dir / "confusion_matrix.png", dpi=150)
    plt.close(figure)
    result = {
        "protocol_id": PROTOCOL, "status": manifest["status"], "data_mode": manifest["data_mode"],
        "quality_claim_allowed": False, "production_eligible": False,
        "selected_family": selected_name, "selected_config": selection["selected"],
        "manifest_sha256": sha256(args.manifest), "selection_sha256": sha256(args.selection),
        "test_sha256": manifest["files"]["test"]["sha256"],
        "support": counts(test), "selected_metrics": selected_metrics, "prespecified_ablations": ablations,
        "model_sha256": model_hash, "reload_parity": True,
        "versions": {"python": platform.python_version(), "scikit_learn": sklearn.__version__, "numpy": numpy.__version__, "joblib": joblib.__version__, "matplotlib": matplotlib.__version__},
        "evaluation_seconds": time.perf_counter() - started,
        "limitations": "Fixture scores and CI have no research validity" if manifest["data_mode"] == "DEMO_ONLY" else "Automated protocol checks do not replace human evidence review; no production activation",
    }
    save_json(args.output_dir / "evaluation.json", result)
    card = f"# Vietnamese sentiment model card\n\nData mode: **{manifest['data_mode']}**. Status: **{manifest['status']}**.\n\nQuality claim allowed: **false**. Production eligible: **false**.\n\nSelected on validation: `{selected_name}`. Refit on development before one final evaluation. Test support: {len(test)}.\n\nLimitations: {result['limitations']}. No email, receipt or consent token is part of this artifact.\n"
    (args.output_dir / "model_card.md").write_text(card, encoding="utf-8")
    return {"status": manifest["status"], "data_mode": manifest["data_mode"],
            "quality_claim_allowed": False, "production_eligible": False,
            "selected": selected_name, "reload_parity": True, "output_dir": str(args.output_dir)}


def parser() -> argparse.ArgumentParser:
    top = argparse.ArgumentParser(description="T09 Vietnamese sentiment research pipeline; run from repository root. Existing files are never overwritten.")
    commands = top.add_subparsers(dest="command", required=True)
    p = commands.add_parser("prepare", help="Validate/gate data and write immutable split snapshot")
    p.add_argument("--mode", choices=("demo", "research"), required=True)
    p.add_argument("--environment", choices=("local", "kaggle"), default="local")
    p.add_argument("--fixture", type=Path, help="DEMO_ONLY JSONL; defaults to existing fixture")
    p.add_argument("--development", type=Path, help="T01 DEVELOPMENT_CANDIDATE JSONL")
    p.add_argument("--independent-test", type=Path, help="T01 INDEPENDENT_TEST_CANDIDATE JSONL; custodian access only")
    p.add_argument("--pilot", type=Path, help="Optional T01 PILOT JSONL for cross-pool group exclusion")
    p.add_argument("--evidence", type=Path, help="Local restricted row audit JSONL; never copied into split outputs")
    p.add_argument("--protocol", type=Path, help="Frozen human guideline/agreement/custodian protocol JSON")
    p.add_argument("--quarantine-report", type=Path, help="Optional restricted ID/category-only report if PII scanner flags rows")
    p.add_argument("--output-dir", type=Path, required=True)
    p.add_argument("--test-output-dir", type=Path, help="Research only: separate restricted custodian directory for locked test")
    p = commands.add_parser("select", help="Fit grid on train, choose by validation Macro-F1; never reads test")
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--approval", type=Path, help="Required for research: custodian approval matching manifest SHA-256")
    p.add_argument("--output", type=Path, required=True)
    p = commands.add_parser("evaluate", help="Refit on development and evaluate frozen independent test once")
    p.add_argument("--manifest", type=Path, required=True)
    p.add_argument("--selection", type=Path, required=True)
    p.add_argument("--selection-lock", type=Path, help="Research only: custodian's frozen selection/manifest hash record")
    p.add_argument("--approval", type=Path, help="Required for research")
    p.add_argument("--test-file", type=Path, help="Research only: custodian supplies locked test after selection is frozen")
    p.add_argument("--output-dir", type=Path, required=True)
    return top


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        result = {"prepare": prepare, "select": select, "evaluate": evaluate}[args.command](args)
    except (GateError, FileNotFoundError, KeyError, ImportError) as exc:
        print(f"T09 GATE ERROR: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
