"""HuGo M2-B1 Vietnamese sentiment TF-IDF technical pipeline.

This script intentionally runs on an author-written DEMO_ONLY fixture by default.
Demo metrics verify the pipeline, not model quality. It works as a normal Python
script and is split into ``# %%`` sections for Kaggle Notebook CPU use.
"""

# %% 1. Imports, constants and deterministic settings
from __future__ import annotations

import argparse
import csv
import hashlib
import importlib.metadata
import json
import os
import platform
import sys
import tempfile
import time
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence

import joblib

os.environ.setdefault(
    "MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "hugo_m2_b1_matplotlib")
)
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import sklearn  # noqa: E402
from sklearn.dummy import DummyClassifier  # noqa: E402
from sklearn.feature_extraction.text import TfidfVectorizer  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split  # noqa: E402
from sklearn.pipeline import FeatureUnion, Pipeline  # noqa: E402


SEED = 20261013
LABELS = ["NEGATIVE", "NEUTRAL", "POSITIVE"]
DISCLAIMER = "Minh họa pipeline — không phải đánh giá chất lượng mô hình"
SCRIPT_VERSION = "m2-b1-demo-v1"

SCRIPT_PATH = Path(__file__).resolve()
AI_ROOT = SCRIPT_PATH.parents[1]
DEFAULT_FIXTURE = AI_ROOT / "fixtures" / "vietnamese_sentiment_demo.jsonl"
DEFAULT_LOCAL_OUTPUT = AI_ROOT / "artifacts" / "m2_b1_demo"
DEFAULT_OUTPUT = (
    Path("/kaggle/working/hugo_vi_sentiment_m2_b1")
    if Path("/kaggle/working").is_dir()
    else DEFAULT_LOCAL_OUTPUT
)

np.random.seed(SEED)

for stream in (sys.stdout, sys.stderr):
    reconfigure = getattr(stream, "reconfigure", None)
    if callable(reconfigure):
        reconfigure(encoding="utf-8")


class DataValidationError(ValueError):
    """Raised when an input violates the locked sentiment data contract."""


def demo_governance() -> dict[str, Any]:
    return {
        "data_mode": "DEMO_ONLY",
        "data_tier": "DEMO_ONLY",
        "quality_claim_allowed": False,
        "production_eligible": False,
        "lifecycle_status": "DEMO_ONLY_NOT_ACTIVE",
        "warning": DISCLAIMER,
    }


# %% 2. Input loading, Unicode NFC normalization and strict validation
def normalize_text(value: Any) -> str:
    """Normalize to NFC and whitespace without removing accents or negation."""
    if value is None:
        return ""
    normalized = unicodedata.normalize("NFC", str(value))
    normalized = normalized.replace("\ufeff", "").replace("\u200b", "")
    return " ".join(normalized.split()).strip()


def parse_boolean(value: Any, field_name: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1"}:
            return True
        if lowered in {"false", "0"}:
            return False
    raise DataValidationError(f"{field_name} must be an explicit boolean")


def read_records(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise FileNotFoundError(f"Input file not found: {path}")
    suffix = path.suffix.lower()
    if suffix == ".jsonl":
        records: list[dict[str, Any]] = []
        with path.open("r", encoding="utf-8-sig") as handle:
            for line_number, line in enumerate(handle, start=1):
                if not line.strip():
                    continue
                try:
                    value = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise DataValidationError(
                        f"Invalid JSON at {path.name}:{line_number}: {exc}"
                    ) from exc
                if not isinstance(value, dict):
                    raise DataValidationError(
                        f"Each JSONL row must be an object: {path.name}:{line_number}"
                    )
                records.append(value)
        return records
    if suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]
    raise DataValidationError("Only .jsonl and .csv inputs are supported")


def clean_and_validate_records(
    records: Sequence[Mapping[str, Any]], expected_tier: str
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    required = {
        "id",
        "text",
        "label",
        "data_tier",
        "quality_claim_allowed",
        "production_eligible",
        "provenance",
    }
    cleaned: list[dict[str, Any]] = []
    dropped_empty = 0
    seen_ids: set[str] = set()
    seen_texts: set[str] = set()

    for index, raw in enumerate(records, start=1):
        missing = sorted(required - set(raw))
        if missing:
            raise DataValidationError(f"Row {index} missing fields: {missing}")

        row_id = normalize_text(raw.get("id"))
        text = normalize_text(raw.get("text"))
        label = normalize_text(raw.get("label")).upper()
        tier = normalize_text(raw.get("data_tier")).upper()
        provenance = normalize_text(raw.get("provenance"))

        if not text:
            dropped_empty += 1
            continue
        if not row_id:
            raise DataValidationError(f"Row {index} has an empty id")
        if row_id in seen_ids:
            raise DataValidationError(f"Duplicate row id: {row_id}")
        if label not in LABELS:
            raise DataValidationError(f"Row {row_id} has invalid label: {label!r}")
        if tier != expected_tier:
            raise DataValidationError(
                f"Row {row_id} has tier {tier!r}; expected {expected_tier!r}"
            )
        if not provenance:
            raise DataValidationError(f"Row {row_id} has empty provenance")

        quality_claim_allowed = parse_boolean(
            raw.get("quality_claim_allowed"), "quality_claim_allowed"
        )
        production_eligible = parse_boolean(
            raw.get("production_eligible"), "production_eligible"
        )
        if expected_tier == "DEMO_ONLY" and quality_claim_allowed:
            raise DataValidationError(
                f"Demo row {row_id} cannot allow a quality claim"
            )
        if expected_tier == "DEMO_ONLY" and production_eligible:
            raise DataValidationError(
                f"Demo row {row_id} cannot be production eligible"
            )
        if expected_tier in {"DEVELOPMENT", "INDEPENDENT_TEST"} and not quality_claim_allowed:
            raise DataValidationError(
                f"Approved research row {row_id} must explicitly allow a quality claim"
            )
        if production_eligible:
            raise DataValidationError(
                f"Row {row_id} cannot be production eligible in this research pipeline"
            )

        duplicate_key = text.casefold()
        if duplicate_key in seen_texts:
            raise DataValidationError(f"Exact duplicate text found at row {row_id}")

        seen_ids.add(row_id)
        seen_texts.add(duplicate_key)
        cleaned.append(
            {
                "id": row_id,
                "text": text,
                "label": label,
                "domain": normalize_text(raw.get("domain")) or "unknown",
                "data_tier": tier,
                "quality_claim_allowed": quality_claim_allowed,
                "production_eligible": production_eligible,
                "provenance": provenance,
            }
        )

    if not cleaned:
        raise DataValidationError("No non-empty valid rows remain after cleaning")

    distribution = Counter(row["label"] for row in cleaned)
    missing_labels = [label for label in LABELS if distribution[label] == 0]
    if missing_labels:
        raise DataValidationError(f"Dataset is missing canonical labels: {missing_labels}")

    audit = {
        "rows_raw": len(records),
        "rows_clean": len(cleaned),
        "rows_dropped_empty": dropped_empty,
        "class_distribution": {label: distribution[label] for label in LABELS},
        "unicode_normalization": "NFC",
        "accents_preserved": True,
        "negation_preserved": True,
        "exact_duplicate_count_after_cleaning": 0,
    }
    return cleaned, audit


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_approved_manifest(
    path: Path, development_path: Path, independent_test_path: Path
) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if manifest.get("status") != "PASS":
        raise DataValidationError("Approved manifest must have status=PASS")
    if not manifest.get("split_hash_sha256"):
        raise DataValidationError("Approved manifest must include split_hash_sha256")
    if manifest.get("label_map_id") != "hugo-vi-sentiment-3class-v1":
        raise DataValidationError("Approved manifest must pin the canonical label map")
    if manifest.get("quality_claim_allowed") is not True:
        raise DataValidationError(
            "Approved manifest must explicitly set quality_claim_allowed=true"
        )
    if manifest.get("production_eligible") is not False:
        raise DataValidationError(
            "Approved research manifest must explicitly set production_eligible=false"
        )

    data_files = manifest.get("data_files")
    if not isinstance(data_files, dict):
        raise DataValidationError("Approved manifest must include data_files hashes")
    expected_paths = {
        "development": development_path,
        "independent_test": independent_test_path,
    }
    for role, data_path in expected_paths.items():
        file_record = data_files.get(role)
        if not isinstance(file_record, dict) or not file_record.get("sha256"):
            raise DataValidationError(
                f"Approved manifest must include data_files.{role}.sha256"
            )
        if str(file_record["sha256"]).lower() != sha256_file(data_path):
            raise DataValidationError(f"SHA-256 mismatch for {role} data")
    return manifest


# %% 3. Model definitions; every vectorizer is fit only through model.fit(X_train)
def logistic_regression() -> LogisticRegression:
    return LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=SEED,
        solver="lbfgs",
    )


def build_models() -> dict[str, Any]:
    word_vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),
        min_df=1,
        sublinear_tf=True,
        lowercase=True,
    )
    char_vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=1,
        sublinear_tf=True,
        lowercase=True,
    )
    combined_features = FeatureUnion(
        [
            (
                "word",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,
                    lowercase=True,
                ),
            ),
            (
                "char",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=1,
                    sublinear_tf=True,
                    lowercase=True,
                ),
            ),
        ]
    )
    return {
        "majority_class": DummyClassifier(strategy="most_frequent", random_state=SEED),
        "word_tfidf_logistic_regression": Pipeline(
            [("features", word_vectorizer), ("classifier", logistic_regression())]
        ),
        "char_tfidf_logistic_regression": Pipeline(
            [("features", char_vectorizer), ("classifier", logistic_regression())]
        ),
        "combined_word_char_tfidf_logistic_regression": Pipeline(
            [("features", combined_features), ("classifier", logistic_regression())]
        ),
    }


def evaluate_predictions(
    expected: Sequence[str], predicted: Sequence[str]
) -> dict[str, Any]:
    return {
        "accuracy": float(accuracy_score(expected, predicted)),
        "macro_f1": float(f1_score(expected, predicted, labels=LABELS, average="macro")),
        "per_class": classification_report(
            expected,
            predicted,
            labels=LABELS,
            output_dict=True,
            zero_division=0,
        ),
    }


def run_internal_checks() -> dict[str, bool]:
    decomposed = "a\u0301"
    nfc_preserved = normalize_text(decomposed) == "á"
    negation_preserved = normalize_text("Phòng không sạch") == "Phòng không sạch"

    valid_probe_rows = [
        {
            "id": f"empty-probe-{label.lower()}",
            "text": f"Câu {label.lower()} hợp lệ",
            "label": label,
            "data_tier": "DEMO_ONLY",
            "quality_claim_allowed": False,
            "production_eligible": False,
            "provenance": "SELF_TEST",
        }
        for label in LABELS
    ]
    valid_probe_rows.append(
        {
            "id": "empty-probe-dropped",
            "text": "  \n ",
            "label": "NEGATIVE",
            "data_tier": "DEMO_ONLY",
            "quality_claim_allowed": False,
            "production_eligible": False,
            "provenance": "SELF_TEST",
        }
    )
    cleaned_probe, empty_probe_audit = clean_and_validate_records(
        valid_probe_rows, "DEMO_ONLY"
    )
    empty_handled = (
        normalize_text(None) == ""
        and len(cleaned_probe) == 3
        and empty_probe_audit["rows_dropped_empty"] == 1
    )

    invalid_label_rejected = False
    sample = {
        "id": "self-test",
        "text": "Câu kiểm thử.",
        "label": "UNKNOWN",
        "data_tier": "DEMO_ONLY",
        "quality_claim_allowed": False,
        "production_eligible": False,
        "provenance": "SELF_TEST",
    }
    try:
        clean_and_validate_records([sample], "DEMO_ONLY")
    except DataValidationError:
        invalid_label_rejected = True

    leakage_probe = TfidfVectorizer(ngram_range=(1, 2))
    leakage_probe.fit(["chỉ có dữ liệu huấn luyện", "phủ định không bị xóa"])
    train_only_fit = "tokenchỉcóởeval" not in leakage_probe.vocabulary_
    leakage_probe.transform(["tokenchỉcóởeval"])

    checks = {
        "unicode_nfc": nfc_preserved,
        "negation_preserved": negation_preserved,
        "empty_text_handling": empty_handled,
        "invalid_label_rejected": invalid_label_rejected,
        "train_only_vectorizer_probe": train_only_fit,
    }
    if not all(checks.values()):
        raise RuntimeError(f"Internal technical checks failed: {checks}")
    return checks


# %% 4. Training, DEMO_ONLY evaluation and artifact export
def split_records(
    development: Sequence[Mapping[str, Any]],
    independent_test: Sequence[Mapping[str, Any]] | None,
) -> tuple[list[str], list[str], list[str], list[str], str]:
    development_texts = [str(row["text"]) for row in development]
    development_labels = [str(row["label"]) for row in development]

    if independent_test is not None:
        return (
            development_texts,
            [str(row["text"]) for row in independent_test],
            development_labels,
            [str(row["label"]) for row in independent_test],
            "INDEPENDENT_TEST",
        )

    minimum_class_count = min(Counter(development_labels).values())
    if minimum_class_count < 3:
        raise DataValidationError(
            "DEMO_ONLY split needs at least 3 rows per class for a stratified holdout"
        )
    x_train, x_eval, y_train, y_eval = train_test_split(
        development_texts,
        development_labels,
        test_size=1 / 3,
        random_state=SEED,
        stratify=development_labels,
    )
    return list(x_train), list(x_eval), list(y_train), list(y_eval), "DEMO_HOLDOUT"


def save_json(path: Path, payload: Mapping[str, Any]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def dependency_versions() -> dict[str, str]:
    versions = {
        "python": platform.python_version(),
        "numpy": np.__version__,
        "scikit-learn": sklearn.__version__,
    }
    for package in ("joblib", "matplotlib"):
        try:
            versions[package] = importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            versions[package] = "NOT_FOUND"
    return versions


def plot_demo_confusion_matrix(
    expected: Sequence[str], predicted: Sequence[str], output_path: Path
) -> list[list[int]]:
    matrix = confusion_matrix(expected, predicted, labels=LABELS)
    figure, axis = plt.subplots(figsize=(8, 6))
    ConfusionMatrixDisplay(matrix, display_labels=LABELS).plot(
        ax=axis, cmap="Blues", colorbar=False, values_format="d"
    )
    axis.set_title("DEMO_ONLY — Combined TF-IDF + Logistic Regression")
    figure.text(
        0.5,
        0.01,
        DISCLAIMER,
        ha="center",
        va="bottom",
        color="darkred",
        fontsize=10,
        fontweight="bold",
    )
    figure.tight_layout(rect=(0, 0.06, 1, 1))
    figure.savefig(output_path, dpi=160)
    plt.close(figure)
    return matrix.astype(int).tolist()


def run_pipeline(args: argparse.Namespace) -> dict[str, Any]:
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    technical_checks = run_internal_checks()
    development_path = Path(args.development_data).resolve()
    independent_path = (
        Path(args.independent_test_data).resolve()
        if args.independent_test_data
        else None
    )

    if independent_path is None:
        if args.approved_manifest:
            raise DataValidationError(
                "An approved manifest is not used for DEMO_ONLY mode"
            )
        development_records, development_audit = clean_and_validate_records(
            read_records(development_path), "DEMO_ONLY"
        )
        independent_records = None
        independent_audit = None
        governance = demo_governance()
        approved_manifest = None
    else:
        if not args.approved_manifest:
            raise DataValidationError(
                "DEVELOPMENT/INDEPENDENT_TEST mode requires --approved-manifest"
            )
        approved_manifest = load_approved_manifest(
            Path(args.approved_manifest).resolve(), development_path, independent_path
        )
        development_records, development_audit = clean_and_validate_records(
            read_records(development_path), "DEVELOPMENT"
        )
        independent_records, independent_audit = clean_and_validate_records(
            read_records(independent_path), "INDEPENDENT_TEST"
        )
        governance = {
            "data_mode": "APPROVED_EXPERIMENT",
            "data_tier": "DEVELOPMENT_AND_INDEPENDENT_TEST",
            "quality_claim_allowed": True,
            "production_eligible": False,
            "lifecycle_status": "RESEARCH_NOT_ACTIVE",
            "warning": "Research artifact — manual promotion is required",
        }

    x_train, x_eval, y_train, y_eval, evaluation_tier = split_records(
        development_records, independent_records
    )
    if set(y_train) != set(LABELS) or set(y_eval) != set(LABELS):
        raise DataValidationError("Both train and evaluation data must contain all labels")

    models = build_models()
    predictions: dict[str, np.ndarray] = {}
    metrics_by_model: dict[str, Any] = {}
    for name, model in models.items():
        fit_started = time.perf_counter()
        model.fit(x_train, y_train)
        fit_seconds = time.perf_counter() - fit_started
        predict_started = time.perf_counter()
        predicted = model.predict(x_eval)
        predict_seconds = time.perf_counter() - predict_started
        predictions[name] = np.asarray(predicted)
        metrics_by_model[name] = {
            **evaluate_predictions(y_eval, predicted),
            "fit_seconds_local_cpu": fit_seconds,
            "predict_seconds_total_local_cpu": predict_seconds,
            "evaluation_rows": len(x_eval),
            "evaluation_tier": evaluation_tier,
            "metric_interpretation": governance["warning"],
        }

    combined_name = "combined_word_char_tfidf_logistic_regression"
    combined_model = models[combined_name]
    combined_prediction = predictions[combined_name]

    confusion_png = output_dir / "confusion_matrix_demo_only.png"
    confusion_values = plot_demo_confusion_matrix(
        y_eval, combined_prediction, confusion_png
    )
    save_json(
        output_dir / "confusion_matrix_demo_only.json",
        {
            "governance": governance,
            "model": combined_name,
            "labels": LABELS,
            "matrix": confusion_values,
            "evaluation_tier": evaluation_tier,
        },
    )

    pipeline_path = output_dir / "combined_pipeline_demo_only.joblib"
    vectorizer_path = output_dir / "combined_vectorizer_demo_only.joblib"
    classifier_path = output_dir / "combined_classifier_demo_only.joblib"
    joblib.dump(
        {"governance": governance, "model_name": combined_name, "pipeline": combined_model},
        pipeline_path,
        compress=3,
    )
    joblib.dump(
        {
            "governance": governance,
            "component": "combined_word_char_tfidf_vectorizer",
            "vectorizer": combined_model.named_steps["features"],
        },
        vectorizer_path,
        compress=3,
    )
    joblib.dump(
        {
            "governance": governance,
            "component": "logistic_regression_classifier",
            "classifier": combined_model.named_steps["classifier"],
        },
        classifier_path,
        compress=3,
    )

    reloaded_payload = joblib.load(pipeline_path)
    reloaded_model = reloaded_payload["pipeline"]
    reloaded_prediction = np.asarray(reloaded_model.predict(x_eval))
    labels_equal = bool(np.array_equal(combined_prediction, reloaded_prediction))
    probabilities_equal = bool(
        np.allclose(
            combined_model.predict_proba(x_eval),
            reloaded_model.predict_proba(x_eval),
            rtol=0.0,
            atol=1e-12,
        )
    )
    reload_parity_pass = labels_equal and probabilities_equal
    reload_report = {
        "governance": governance,
        "status": "PASS" if reload_parity_pass else "FAIL",
        "predicted_labels_equal": labels_equal,
        "predicted_probabilities_equal": probabilities_equal,
        "absolute_tolerance": 1e-12,
        "rows_checked": len(x_eval),
    }
    save_json(output_dir / "reload_parity.json", reload_report)

    split_summary = {
        "seed": SEED,
        "split_policy": (
            "author-written DEMO_ONLY stratified holdout; not an independent test"
            if evaluation_tier == "DEMO_HOLDOUT"
            else "manifest-approved DEVELOPMENT and locked INDEPENDENT_TEST"
        ),
        "train_rows": len(x_train),
        "evaluation_rows": len(x_eval),
        "train_class_distribution": dict(Counter(y_train)),
        "evaluation_class_distribution": dict(Counter(y_eval)),
        "vectorizer_fit_scope": "TRAIN_ONLY",
    }
    metrics_payload = {
        "governance": governance,
        "script_version": SCRIPT_VERSION,
        "dataset": {
            "development_file": development_path.name,
            "development_sha256": sha256_file(development_path),
            "development_audit": development_audit,
            "independent_test_file": independent_path.name if independent_path else None,
            "independent_test_sha256": (
                sha256_file(independent_path) if independent_path else None
            ),
            "independent_test_audit": independent_audit,
            "approved_manifest_id": (
                approved_manifest.get("manifest_id") if approved_manifest else None
            ),
        },
        "split": split_summary,
        "technical_checks": technical_checks,
        "reload_parity": reload_report,
        "models": metrics_by_model,
    }
    save_json(output_dir / "metrics_demo_only.json", metrics_payload)

    primary_artifact_sha256 = sha256_file(pipeline_path)
    metadata_payload = {
        "governance": governance,
        "script_version": SCRIPT_VERSION,
        "random_seed": SEED,
        "canonical_labels": LABELS,
        "features": {
            "word_tfidf_ngram_range": [1, 2],
            "character_analyzer": "char_wb",
            "character_tfidf_ngram_range": [3, 5],
            "unicode_normalization": "NFC",
            "accents_and_negation_preserved": True,
        },
        "classifier": "LogisticRegression",
        "dependencies": dependency_versions(),
        "platform": platform.platform(),
        "primary_artifact": pipeline_path.name,
        "primary_artifact_sha256": primary_artifact_sha256,
        "artifact_loading_warning": (
            "joblib/pickle can execute code; load only this allowlisted artifact after SHA-256 verification"
        ),
        "reload_parity_status": reload_report["status"],
    }
    save_json(output_dir / "model_metadata.json", metadata_payload)

    checksummed_files = sorted(
        path for path in output_dir.iterdir() if path.is_file() and path.name != "artifact_checksums.json"
    )
    checksum_payload = {
        "governance": governance,
        "hash_algorithm": "SHA-256",
        "files": {
            path.name: {"sha256": sha256_file(path), "bytes": path.stat().st_size}
            for path in checksummed_files
        },
    }
    save_json(output_dir / "artifact_checksums.json", checksum_payload)

    if not reload_parity_pass:
        raise RuntimeError("Reload parity FAIL; artifacts were retained for diagnosis")

    result = {
        "status": "PASS",
        "governance": governance,
        "output_dir": str(output_dir),
        "artifacts": sorted(path.name for path in output_dir.iterdir() if path.is_file()),
        "reload_parity": "PASS",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    print(DISCLAIMER)
    return result


# %% 5. CLI entry point for local Python and Kaggle CPU
def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="HuGo Vietnamese sentiment TF-IDF MVP technical pipeline"
    )
    parser.add_argument(
        "--development-data",
        default=str(DEFAULT_FIXTURE),
        help="DEMO_ONLY fixture now; a DEVELOPMENT CSV/JSONL after a future approved gate",
    )
    parser.add_argument(
        "--independent-test-data",
        default=None,
        help="Future locked INDEPENDENT_TEST path; omit for DEMO_ONLY",
    )
    parser.add_argument(
        "--approved-manifest",
        default=None,
        help="Future PASS split manifest required for non-demo data",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT),
        help="Artifact directory; defaults to /kaggle/working on Kaggle or ai/artifacts locally",
    )
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    parser = build_argument_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        run_pipeline(args)
    except (DataValidationError, FileNotFoundError, RuntimeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
