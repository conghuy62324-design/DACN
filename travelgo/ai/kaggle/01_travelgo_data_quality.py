# HuGo Intelligence - validate a private TravelGo export attached to Kaggle.
# Copy each # %% section into a Kaggle Code cell in order.

# %% 1. Locate the manifest and exported files
from pathlib import Path
import json
import pandas as pd

OUTPUT = Path("/kaggle/working/hugo_travelgo_clean")
OUTPUT.mkdir(parents=True, exist_ok=True)
manifests = list(Path("/kaggle/input").rglob("manifest.json"))
if len(manifests) != 1:
    raise RuntimeError(f"Cần đúng 1 manifest.json của TravelGo, tìm thấy {len(manifests)}")

source = manifests[0].parent
with open(manifests[0], encoding="utf-8") as file:
    manifest = json.load(file)
print(json.dumps(manifest, ensure_ascii=False, indent=2))

if manifest.get("containsDirectIdentifiers") is not False:
    raise RuntimeError("Từ chối dữ liệu chưa xác nhận loại bỏ định danh trực tiếp")
if manifest.get("googleMapsContentIncluded") is not False:
    raise RuntimeError("Từ chối dataset chứa Google Maps Content")

# %% 2. Schema and integrity checks
required = {
    "items.csv": {"id", "item_type", "title", "city", "price", "rating", "review_count"},
    "reviews.csv": {"id", "item_id", "item_type", "user_hash", "rating", "comment", "created_at"},
    "events.csv": {"id", "user_hash", "session_hash", "item_id", "item_type", "event_type", "occurred_at"},
    "impressions.csv": {"id", "request_id", "session_hash", "item_id", "item_type", "rank_position", "score", "model_version"},
    "blog_mentions.csv": {"id", "title", "content", "source"},
}
frames = {}
report = {"datasetVersion": manifest.get("datasetVersion"), "files": {}, "errors": []}
for filename, columns in required.items():
    path = source / filename
    if not path.exists():
        report["errors"].append(f"Missing {filename}")
        continue
    frame = pd.read_csv(path)
    frames[filename] = frame
    missing = sorted(columns - set(frame.columns))
    report["files"][filename] = {"rows": int(len(frame)), "missingColumns": missing}
    if missing:
        report["errors"].append(f"{filename}: missing {missing}")

items = frames.get("items.csv", pd.DataFrame())
reviews = frames.get("reviews.csv", pd.DataFrame())
events = frames.get("events.csv", pd.DataFrame())
if not items.empty:
    duplicate_items = int(items["id"].duplicated().sum())
    report["duplicateItemIds"] = duplicate_items
    if duplicate_items:
        report["errors"].append("items.csv contains duplicate IDs")
if not reviews.empty:
    report["reviewsWithInvalidRating"] = int((~pd.to_numeric(reviews["rating"], errors="coerce").between(1, 5)).sum())
if not events.empty:
    allowed_events = {
        "SEARCH", "VIEW", "CLICK", "FAVORITE", "UNFAVORITE", "ADD_TO_TRIP", "REMOVE_FROM_TRIP",
        "BOOKING_CREATED", "BOOKING_CONFIRMED", "BOOKING_COMPLETED", "BOOKING_CANCELLED",
        "REVIEW_CREATED", "MAP_OPENED", "ROUTE_VIEWED",
    }
    report["unknownEventTypes"] = sorted(set(events["event_type"].dropna()) - allowed_events)

with open(OUTPUT / "validation_report.json", "w", encoding="utf-8") as file:
    json.dump(report, file, ensure_ascii=False, indent=2)
print(json.dumps(report, ensure_ascii=False, indent=2))
if report["errors"]:
    raise RuntimeError("Dataset validation FAIL; xem validation_report.json")

# %% 3. Save normalized Parquet files for later notebooks
for filename, frame in frames.items():
    frame.to_parquet(OUTPUT / filename.replace(".csv", ".parquet"), index=False)
print("PASS: TravelGo export hợp lệ. Đây là data gate, chưa huấn luyện recommender.")
for file in sorted(OUTPUT.iterdir()):
    print(" -", file)
