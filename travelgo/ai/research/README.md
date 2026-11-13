# T09 Vietnamese sentiment research pipeline

Run from the repository root with Python 3.12+ and `python -m pip install -r ai/research/requirements.txt`. The historical B1/B2 script, notebook, registry and BLOCKED split manifest are separate and unchanged. This pipeline does not issue human consent, verify a person's identity, or approve a corpus. Current real eligible rows: **0** (T08).

## Contract `hugo-mvp-visent-research-v1`

`prepare` takes UTF-8 JSONL files for `DEVELOPMENT_CANDIDATE`, `INDEPENDENT_TEST_CANDIDATE`, and optionally `PILOT`. Each row follows T01 section 4.1: `row_id`, `text_clean`, `final_label`, `domain`, `pool_candidate`, batch/form/guideline versions, contributor/entity/scenario group metadata, provenance/source/method/date, PII/provenance review status, annotation status and `label_map_id`. Entity ID may be absent only with `entity_not_applicable_reason`; a human scenario requires scenario ID/family/version. Exact labels are **0 NEGATIVE, 1 NEUTRAL, 2 POSITIVE** per the existing label map; the JSONL stores canonical names. `content_sha256`, if supplied, must match NFC/whitespace-normalized text. The pipeline does not infer labels from rating or model output.

Restricted `--evidence` JSONL is keyed by `row_id` and holds only a local audit view: `receipt_id`, `receipt_evidence_locator`, `receipt_verified`, `notice_version`, `form_version`, `rights_reviewer_id`, `rights_reviewed_at`, `research_opt_in`, `private_kaggle_opt_in`, `originality_attested`, `no_ai_no_copy_attested`, `withdrawal_status`, `guideline_version`, `annotations` (annotator ID, proposed label, version), optional `review_flag` and `adjudication` (independent adjudicator ID, final label, reason). It must be generated from real restricted records by the human data custodian; these fields are **assertions to check**, not proof the CLI can authenticate. Never attach this file to Kaggle or commit it. No receipt, withdrawal token/hash, or evidence locator enters split JSONL or model output. The output manifest records only the evidence file SHA-256.

`--protocol` is a human-frozen JSON object with `guideline_version`, `guideline_status=FROZEN`, `agreement_policy_version`, `agreement_policy_status=FROZEN`, `test_custodian_id`, `model_selector_id`, `rights_reviewer_id`, `frozen_at`, `source_family`, and positive integer `min_groups_development`, `min_groups_test`, `min_domain_label_count`. These thresholds must be decided after pilot and before main annotation, as T01 requires. The CLI rejects missing/TODO values; it cannot authenticate the people named there. Development needs at least 20% double annotation after filtering; test needs two independent annotators for every row. Disagreement or flags require third-person adjudication. Human acceptance of agreement quality and PII clearance remains separate.

The PII regex scanner detects likely email, phone/long ID and URL, then rejects/quarantines flagged rows by ID and finding type. Optional `--quarantine-report <restricted-new-path.json>` writes only IDs and pattern categories; no raw match or text. It does not redact or certify PII-free text. NFC, zero-width removal and whitespace folding preserve Vietnamese diacritics and negation. Exact duplicate uses normalized casefold text; near duplicate uses character 5-gram Jaccard ≥0.90, with exact-only handling for very short strings. Contributor, entity, scenario family and duplicate links form connected leakage groups. Pilot-connected groups are removed from final pools. Cross-pool duplicates/group links fail; within-pool duplicates are removed before support. All split pairs are audited again. Pairwise comparison is O(n²), suitable for the MVP scale but may need an indexed candidate stage for larger corpora.

Research gate: development ≥360 and each class ≥120; independent test ≥90 and each class ≥30, all three domains represented; frozen domain × label and group minima; rights for the actual `local` or `kaggle` subset. For Kaggle, rows without explicit Kaggle opt-in are removed, then counts and leakage are checked again. No group is cut to meet a ratio. Manifest status is `AUTOMATED_GATES_PASS_HUMAN_SIGNOFF_REQUIRED`, never corpus PASS; model outputs remain `quality_claim_allowed=false`, `production_eligible=false` pending separate authorization.

## Run the technical demo locally

```powershell
python -m ai.research.pipeline prepare --mode demo --output-dir ai/artifacts/t09_demo_snapshot_NEW
python -m ai.research.pipeline select --manifest ai/artifacts/t09_demo_snapshot_NEW/manifest.json --output ai/artifacts/t09_demo_snapshot_NEW/selection.json
python -m ai.research.pipeline evaluate --manifest ai/artifacts/t09_demo_snapshot_NEW/manifest.json --selection ai/artifacts/t09_demo_snapshot_NEW/selection.json --output-dir ai/artifacts/t09_demo_eval_NEW
```

Use fresh output directory names. The demo has 27 train, 9 validation and 9 **DEMO_HOLDOUT** rows; it never passes the research floor. Selection reads only train/validation and tries majority, word, char and combined TF-IDF+LR with LR `C` in 0.5/1/2. Tie break is fixed: higher validation Macro-F1, then majority/word/char/combined, then smaller C. Evaluation refits each prespecified family with its validation-frozen configuration on development, evaluates the holdout once, and never reselects from test. The selected model is reloaded from joblib and predictions compared. Only load your own verified joblib files; pickle can execute code.

## Research handoff after real collection

The custodian runs `prepare`, keeping the independent test output outside the selector directory:

```powershell
python -m ai.research.pipeline prepare --mode research --environment local --development <dev.jsonl> --independent-test <test.jsonl> --pilot <pilot.jsonl> --evidence <restricted-audit.jsonl> --protocol <frozen-protocol.json> --output-dir <new-selector-snapshot-dir> --test-output-dir <new-restricted-test-dir>
```

For Kaggle eligible data, use `--environment kaggle`; this filters on private Kaggle consent and reruns support. It does **not** upload anything. After verifying receipts/withdrawal, PII review, annotation, group audit and inventory, the custodian may provide an approval JSON with `status=APPROVED`, `manifest_sha256`, `approved_by`, `approved_at`, `environment`. The selector uses only the selector snapshot:

```powershell
python -m ai.research.pipeline select --manifest <new-selector-snapshot-dir>/manifest.json --approval <custodian-approval.json> --output <new-selector-snapshot-dir>/selection.json
```

Before releasing the test file, the custodian records the exact `selection_sha256`, `manifest_sha256`, `locked_by`, `locked_at` in a separate selection-lock JSON. Only then run:

```powershell
python -m ai.research.pipeline evaluate --manifest <new-selector-snapshot-dir>/manifest.json --selection <new-selector-snapshot-dir>/selection.json --approval <custodian-approval.json> --selection-lock <custodian-selection-lock.json> --test-file <new-restricted-test-dir>/independent_test.jsonl --output-dir <new-evaluation-dir>
```

The CLI verifies hashes, protocol, frozen validation choice, split inventories and group/duplicate overlap. File access controls, receipt authenticity, test custody and single opening of the real test remain responsibilities of the human custodian. Do not use test results to revise grid, preprocessing or labels. The final evaluation includes per-class support, confusion matrix, group bootstrap 95% CI, fixed ablation results, runtime, dependency versions, model card and reload parity. CI on the demo is illustrative only.

## Kaggle CPU demo package

Attach only `ai/research/{__init__.py,data.py,pipeline.py,requirements.txt,t09_kaggle_cpu_demo.ipynb}`, `ai/configs/vietnamese_sentiment_label_map.json` and `ai/fixtures/vietnamese_sentiment_demo.jsonl`, preserving `ai/` layout. **Include `requirements.txt`** because the pipeline hashes it when preparing and selecting; install/check its four CPU dependencies before running. The notebook searches recursively under `/kaggle/input` for exactly one pipeline, verifies the required files, prints Python/dependency versions, runs the three demo CLI stages with CPU/Internet Off, and writes only to a new directory under `/kaggle/working`. If that directory exists, set `T09_OUTPUT_ROOT` to a new `/kaggle/working/...` path; the notebook will not delete or overwrite old results. Do not attach `--evidence`, real test files, DB exports, receipts, tokens, credentials or backups. T09 has not executed the new notebook on Kaggle.
