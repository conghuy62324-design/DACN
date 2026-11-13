"""Read-only input validation, grouping and split preparation for T09."""
from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

SCHEMA = "hugo-mvp-visent-research-v1"
LABEL_MAP_ID = "hugo-vi-sentiment-3class-v1"
LABELS = ("NEGATIVE", "NEUTRAL", "POSITIVE")
DOMAINS = ("hotel", "restaurant", "attraction")
POOLS = ("PILOT", "DEVELOPMENT_CANDIDATE", "INDEPENDENT_TEST_CANDIDATE")
PII = {
    "email": re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
    "phone_or_long_id": re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]*){8,}(?!\d)"),
    "url": re.compile(r"(?:https?://|www\.)\S+", re.I),
}


class GateError(ValueError):
    pass


class PIIQuarantineError(GateError):
    def __init__(self, row_id: str, findings: list[str]):
        self.row_id = row_id
        self.findings = findings
        super().__init__(f"{row_id}: PII scanner quarantine ({','.join(findings)}); human review required")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def normalize(text: str) -> str:
    if not isinstance(text, str):
        raise GateError("text_clean/text must be a string")
    value = unicodedata.normalize("NFC", text)
    for marker in ("\ufeff", "\u200b", "\u200c", "\u200d", "\u2060"):
        value = value.replace(marker, "")
    return " ".join(value.split())


def exact_key(text: str) -> str:
    return normalize(text).casefold()


def ngrams(text: str) -> set[str]:
    value = exact_key(text)
    return {value[i : i + 5] for i in range(len(value) - 4)}


def is_near(a: str, b: str) -> bool:
    if exact_key(a) == exact_key(b):
        return True
    aa, bb = ngrams(a), ngrams(b)
    return bool(aa and bb and len(aa & bb) / len(aa | bb) >= 0.90)


def read_jsonl(path: Path) -> list[dict]:
    if not path.is_file():
        raise GateError(f"input file missing: {path}")
    rows = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8-sig").splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise GateError(f"invalid JSONL at {path.name}:{line_no}") from exc
        if not isinstance(row, dict):
            raise GateError(f"row must be object at {path.name}:{line_no}")
        rows.append(row)
    if not rows:
        raise GateError(f"empty input: {path}")
    return rows


def _required(row: dict, keys: tuple[str, ...], row_id: str) -> None:
    for key in keys:
        if not isinstance(row.get(key), str) or not row[key].strip():
            raise GateError(f"{row_id}: missing/invalid {key}")


def _pii_findings(text: str) -> list[str]:
    return [name for name, pattern in PII.items() if pattern.search(text)]


def validate_research_row(row: dict, pool: str) -> dict:
    row_id = row.get("row_id")
    if not isinstance(row_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{7,127}", row_id):
        raise GateError("missing/invalid row_id")
    _required(row, ("collection_batch_id", "form_version", "guideline_version",
                    "contributor_group_id", "source_family", "collection_method_version",
                    "collection_date", "provenance_type", "pii_review_status",
                    "provenance_review_status", "annotation_status", "label_map_id"), row_id)
    if row.get("pool_candidate") != pool:
        raise GateError(f"{row_id}: pool_candidate mismatch")
    try:
        if date.fromisoformat(row["collection_date"]).isoformat() != row["collection_date"]:
            raise ValueError()
    except ValueError as exc:
        raise GateError(f"{row_id}: invalid collection_date") from exc
    if row.get("domain") not in DOMAINS or row.get("final_label") not in LABELS:
        raise GateError(f"{row_id}: invalid domain/final_label")
    if row["label_map_id"] != LABEL_MAP_ID:
        raise GateError(f"{row_id}: label_map_id mismatch")
    provenance = row["provenance_type"]
    if provenance not in ("ORIGINAL_PERSONAL_EXPERIENCE", "ORIGINAL_HUMAN_SCENARIO_RESPONSE"):
        raise GateError(f"{row_id}: invalid provenance_type")
    if not row.get("entity_group_id") and not row.get("entity_not_applicable_reason"):
        raise GateError(f"{row_id}: entity group missing without reason")
    if provenance == "ORIGINAL_HUMAN_SCENARIO_RESPONSE":
        _required(row, ("scenario_id", "scenario_family_id", "scenario_version"), row_id)
    elif row.get("scenario_id") or row.get("scenario_family_id"):
        raise GateError(f"{row_id}: scenario metadata contradicts provenance")
    text = normalize(row.get("text_clean"))
    if not text:
        raise GateError(f"{row_id}: empty text")
    if row["pii_review_status"] != "CLEARED" or row["provenance_review_status"] != "CLEARED":
        raise GateError(f"{row_id}: PII/provenance review not cleared")
    if row["annotation_status"] not in ("DOUBLE_LABELED", "ADJUDICATED", "SINGLE_LABELED"):
        raise GateError(f"{row_id}: annotation unresolved")
    if row.get("content_sha256") and row["content_sha256"] != hashlib.sha256(text.encode()).hexdigest():
        raise GateError(f"{row_id}: content hash mismatch")
    findings = _pii_findings(text)
    if findings:
        raise PIIQuarantineError(row_id, findings)
    return {**row, "text_clean": text}


def validate_evidence(row: dict, evidence: dict, environment: str) -> bool:
    row_id = row["row_id"]
    if not isinstance(evidence, dict) or evidence.get("row_id") != row_id:
        raise GateError(f"{row_id}: missing linked evidence")
    _required(evidence, ("receipt_id", "receipt_evidence_locator", "rights_reviewer_id",
                         "rights_reviewed_at", "notice_version", "form_version", "guideline_version"), row_id)
    for key in ("receipt_verified", "research_opt_in", "originality_attested", "no_ai_no_copy_attested"):
        if evidence.get(key) is not True:
            raise GateError(f"{row_id}: {key} not verified")
    if evidence.get("withdrawal_status") != "ACTIVE":
        raise GateError(f"{row_id}: consent withdrawn or unresolved")
    if evidence["guideline_version"] != row["guideline_version"]:
        raise GateError(f"{row_id}: guideline version mismatch")
    if evidence["form_version"] != row["form_version"]:
        raise GateError(f"{row_id}: form version mismatch")
    kaggle = evidence.get("private_kaggle_opt_in")
    if not isinstance(kaggle, bool):
        raise GateError(f"{row_id}: private Kaggle permission missing")
    return environment == "local" or kaggle


def validate_annotations(row: dict, evidence: dict) -> int:
    row_id = row["row_id"]
    assignments = evidence.get("annotations")
    if not isinstance(assignments, list) or not assignments:
        raise GateError(f"{row_id}: missing annotation assignments")
    ids = [a.get("annotator_id") for a in assignments if isinstance(a, dict)]
    if len(ids) != len(set(ids)) or any(not isinstance(x, str) or not x for x in ids):
        raise GateError(f"{row_id}: annotators not independent")
    for a in assignments:
        if a.get("label_proposed") not in LABELS or a.get("guideline_version") != row["guideline_version"]:
            raise GateError(f"{row_id}: invalid annotation label/version")
    if row["pool_candidate"] == "INDEPENDENT_TEST_CANDIDATE" and len(ids) < 2:
        raise GateError(f"{row_id}: test needs two independent annotators")
    labels = {a["label_proposed"] for a in assignments}
    if len(labels) > 1 or evidence.get("review_flag") not in (None, "CLEAR"):
        adjudication = evidence.get("adjudication")
        if not isinstance(adjudication, dict) or adjudication.get("final_label") != row["final_label"] or not adjudication.get("adjudicator_id") or adjudication["adjudicator_id"] in ids or not adjudication.get("reason"):
            raise GateError(f"{row_id}: adjudication missing/invalid")
    elif row["final_label"] not in labels:
        raise GateError(f"{row_id}: final label disagrees with annotation")
    if len(ids) >= 2 and row["annotation_status"] == "SINGLE_LABELED":
        raise GateError(f"{row_id}: annotation status inconsistent")
    if len(ids) == 1 and row["annotation_status"] != "SINGLE_LABELED":
        raise GateError(f"{row_id}: annotation status inconsistent")
    if len(labels) > 1 and row["annotation_status"] != "ADJUDICATED":
        raise GateError(f"{row_id}: disputed label must have ADJUDICATED status")
    return len(ids)


class UnionFind:
    def __init__(self, ids: list[str]):
        self.parent = {value: value for value in ids}

    def root(self, value: str) -> str:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def join(self, a: str, b: str) -> None:
        self.parent[self.root(b)] = self.root(a)


def group_and_dedupe(rows: list[dict]) -> tuple[list[dict], dict]:
    ids = [r["row_id"] for r in rows]
    if len(ids) != len(set(ids)):
        raise GateError("duplicate row_id across input files")
    uf = UnionFind(ids)
    first: dict[tuple[str, str], str] = {}
    for row in rows:
        for field in ("contributor_group_id", "entity_group_id", "scenario_family_id", "duplicate_cluster_id"):
            value = row.get(field)
            if value:
                key = (field, str(value))
                if key in first:
                    uf.join(row["row_id"], first[key])
                else:
                    first[key] = row["row_id"]
    duplicate_pairs = []
    for i, a in enumerate(rows):
        for b in rows[i + 1 :]:
            if is_near(a["text_clean"], b["text_clean"]):
                if a["final_label"] != b["final_label"] and a["pool_candidate"] != "PILOT" and b["pool_candidate"] != "PILOT":
                    raise GateError("exact/near duplicate has conflicting final labels; human review required")
                uf.join(a["row_id"], b["row_id"])
                duplicate_pairs.append((a, b))
                if {a["pool_candidate"], b["pool_candidate"]} == {"DEVELOPMENT_CANDIDATE", "INDEPENDENT_TEST_CANDIDATE"}:
                    raise GateError("cross-file exact/near duplicate between development and test")
    components: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        components[uf.root(row["row_id"])].append(row)
    pilot_roots = {root for root, members in components.items() if any(r["pool_candidate"] == "PILOT" for r in members)}
    for root, members in components.items():
        pools = {r["pool_candidate"] for r in members}
        if "DEVELOPMENT_CANDIDATE" in pools and "INDEPENDENT_TEST_CANDIDATE" in pools:
            raise GateError("development/test group leakage")
        group_id = hashlib.sha256("|".join(sorted(r["row_id"] for r in members)).encode()).hexdigest()[:24]
        for row in members:
            row["leakage_group_id"] = group_id
    excluded_pilot_related = {r["row_id"] for root in pilot_roots for r in components[root]}
    kept = [r for r in rows if r["row_id"] not in excluded_pilot_related]
    # All remaining exact/near duplicates belong to one group. Keep one canonical row.
    removed = set()
    for a, b in duplicate_pairs:
        if a["row_id"] not in excluded_pilot_related and b["row_id"] not in excluded_pilot_related:
            removed.add(max(a["row_id"], b["row_id"]))
    kept = [r for r in kept if r["row_id"] not in removed]
    return kept, {"pilot_and_related_excluded": len(excluded_pilot_related), "duplicate_rows_excluded": len(removed), "near_or_exact_pairs": len(duplicate_pairs)}


def check_support(dev: list[dict], test: list[dict]) -> dict:
    out = {}
    for name, rows, minimum, per_class in (("development", dev, 360, 120), ("independent_test", test, 90, 30)):
        counts = Counter(r["final_label"] for r in rows)
        domains = Counter(r["domain"] for r in rows)
        if len(rows) < minimum or any(counts[label] < per_class for label in LABELS) or any(domains[domain] == 0 for domain in DOMAINS):
            raise GateError(f"{name}: below MVP floor/support after filtering: total={len(rows)}, class={dict(counts)}, domain={dict(domains)}")
        out[name] = {"total": len(rows), "class": dict(counts), "domain": dict(domains), "groups": len({r["leakage_group_id"] for r in rows})}
    return out


def split_development(rows: list[dict], seed: int = 42) -> tuple[list[dict], list[dict]]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        groups[row["leakage_group_id"]].append(row)
    ordered = sorted(groups, key=lambda group: hashlib.sha256(f"{seed}:{group}".encode()).hexdigest())
    target = {label: sum(r["final_label"] == label for r in rows) * .20 for label in LABELS}
    val: set[str] = set()
    counts = Counter()
    total = Counter(r["final_label"] for r in rows)
    for group in ordered:
        candidate = Counter(r["final_label"] for r in groups[group])
        old = sum(abs(counts[label] - target[label]) for label in LABELS)
        new = sum(abs(counts[label] + candidate[label] - target[label]) for label in LABELS)
        if new < old and all(total[label] - counts[label] - candidate[label] >= 1 for label in LABELS):
            val.add(group)
            counts.update(candidate)
    train = [r for r in rows if r["leakage_group_id"] not in val]
    validation = [r for r in rows if r["leakage_group_id"] in val]
    if any(not any(r["final_label"] == label for r in validation) for label in LABELS):
        raise GateError("group-preserving validation split lacks a class; collect more independent groups")
    return train, validation


def demo_rows(path: Path) -> list[dict]:
    rows = read_jsonl(path)
    out = []
    for row in rows:
        if row.get("data_tier") != "DEMO_ONLY" or row.get("quality_claim_allowed") is not False or row.get("production_eligible") is not False or row.get("provenance") != "AUTHOR_WRITTEN_TECHNICAL_FIXTURE":
            raise GateError("fixture governance is not DEMO_ONLY")
        if row.get("label") not in LABELS or row.get("domain") not in DOMAINS or not row.get("id"):
            raise GateError("fixture ID/label/domain invalid")
        text = normalize(row.get("text"))
        if not text:
            raise GateError("fixture text empty")
        out.append({"row_id": row["id"], "text_clean": text, "final_label": row["label"], "domain": row["domain"], "pool_candidate": "DEMO_ONLY", "leakage_group_id": hashlib.sha256(row["id"].encode()).hexdigest()[:24]})
    if len({r["row_id"] for r in out}) != len(out):
        raise GateError("duplicate demo row_id")
    return out


def split_demo(rows: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    by_label = {label: sorted((r for r in rows if r["final_label"] == label), key=lambda r: hashlib.sha256(f"42:{r['row_id']}".encode()).hexdigest()) for label in LABELS}
    train, val, holdout = [], [], []
    for label in LABELS:
        items = by_label[label]
        if len(items) < 5:
            raise GateError("demo needs at least five rows per class")
        n_val = max(1, round(len(items) * .20))
        n_holdout = max(1, round(len(items) * .20))
        val.extend(items[:n_val])
        holdout.extend(items[n_val:n_val + n_holdout])
        train.extend(items[n_val + n_holdout:])
    return train, val, holdout


def public_rows(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        value = {key: row[key] for key in ("row_id", "text_clean", "final_label", "domain", "leakage_group_id")}
        value.update({"data_mode": "DEMO_ONLY" if row["pool_candidate"] == "DEMO_ONLY" else "RESEARCH_CANDIDATE",
                      "quality_claim_allowed": False, "production_eligible": False})
        out.append(value)
    return out


def write_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as output:
        for row in rows:
            output.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")
