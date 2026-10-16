A# HuGo Intelligence v1 - Kaggle quickstart for the attached Restaurant Reviews dataset.
# In Kaggle, copy each section beginning with "# %%" into one Code cell, in order.
# This is an English restaurant-review prototype, not the production recommender.

# %% 1. Imports and deterministic settings
from pathlib import Path
import json
import re
import unicodedata

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import ConfusionMatrixDisplay, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import FunctionTransformer
from sklearn.metrics.pairwise import cosine_similarity

SEED = 42
OUTPUT = Path("/kaggle/working/hugo_intelligence_v1")
OUTPUT.mkdir(parents=True, exist_ok=True)
np.random.seed(SEED)
print("Output:", OUTPUT)

# %% 2. Find the correct CSV by schema (do not blindly use files[0])
csv_files = list(Path("/kaggle/input").rglob("*.csv"))
print("CSV files found:")
for file in csv_files:
    print(" -", file)

selected_file = None
for file in csv_files:
    sample = pd.read_csv(file, nrows=3)
    normalized_columns = {str(c).strip().lower() for c in sample.columns}
    if {"restaurant", "review", "rating"}.issubset(normalized_columns):
        selected_file = file
        break

if selected_file is None:
    raise FileNotFoundError("Không tìm thấy CSV có đủ cột Restaurant, Review, Rating")

raw = pd.read_csv(selected_file)
raw.columns = [str(c).strip() for c in raw.columns]
print("Selected:", selected_file)
print("Shape:", raw.shape)
display(raw.head())

# %% 3. Audit before cleaning
audit = {
    "source_file": str(selected_file),
    "rows_raw": int(len(raw)),
    "columns": raw.columns.tolist(),
    "missing_by_column": raw.isna().sum().astype(int).to_dict(),
    "duplicate_rows": int(raw.duplicated().sum()),
}
print(json.dumps(audit, ensure_ascii=False, indent=2))
print("Rating values:")
print(raw["Rating"].value_counts(dropna=False).head(20))

# %% 4. Clean text and ratings without inventing data
def clean_text(value):
    value = unicodedata.normalize("NFKC", str(value or ""))
    value = re.sub(r"https?://\S+|www\.\S+", " ", value)
    value = re.sub(r"\S+@\S+", " [EMAIL] ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value

df = raw.copy()
df["Restaurant"] = df["Restaurant"].map(clean_text)
df["Review"] = df["Review"].map(clean_text)
df["Rating"] = pd.to_numeric(df["Rating"], errors="coerce")

before = len(df)
df = df.dropna(subset=["Rating"])
df = df[df["Rating"].between(1, 5)]
df = df[(df["Restaurant"].str.len() > 0) & (df["Review"].str.len() >= 3)]
df = df.drop_duplicates(subset=["Restaurant", "Review", "Rating"]).reset_index(drop=True)
df["sentiment"] = pd.cut(
    df["Rating"], bins=[0, 2, 3, 5], labels=["negative", "neutral", "positive"]
).astype(str)

quality = {
    **audit,
    "rows_clean": int(len(df)),
    "rows_removed": int(before - len(df)),
    "class_distribution": df["sentiment"].value_counts().to_dict(),
}
print(json.dumps(quality, ensure_ascii=False, indent=2))
display(df[["Restaurant", "Review", "Rating", "sentiment"]].head())

if df["sentiment"].value_counts().min() < 2:
    raise ValueError("Mỗi lớp sentiment cần ít nhất 2 mẫu để chia train/test có stratify")

df.to_csv(OUTPUT / "restaurant_reviews_clean.csv", index=False)
try:
    df.to_parquet(OUTPUT / "restaurant_reviews_clean.parquet", index=False)
except Exception as exc:
    print("Parquet skipped (CSV vẫn đã lưu):", exc)
with open(OUTPUT / "data_quality_report.json", "w", encoding="utf-8") as file:
    json.dump(quality, file, ensure_ascii=False, indent=2)

# %% 5. Split first, then fit: prevents vocabulary leakage
X_train, X_test, y_train, y_test = train_test_split(
    df["Review"],
    df["sentiment"],
    test_size=0.20,
    random_state=SEED,
    stratify=df["sentiment"],
)

features = FeatureUnion([
    ("word", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_df=0.98, sublinear_tf=True, max_features=40000)),
    ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=3, max_features=30000)),
])
model = Pipeline([
    ("features", features),
    ("classifier", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=SEED)),
])
model.fit(X_train, y_train)
predicted = model.predict(X_test)
macro_f1 = float(f1_score(y_test, predicted, average="macro"))
majority_baseline = float(y_test.value_counts(normalize=True).max())
print(classification_report(y_test, predicted, digits=4))
print("Macro F1:", round(macro_f1, 4))
print("Majority accuracy baseline:", round(majority_baseline, 4))

ConfusionMatrixDisplay.from_predictions(y_test, predicted, cmap="Blues", xticks_rotation=30)
plt.tight_layout()
plt.savefig(OUTPUT / "confusion_matrix.png", dpi=160)
plt.show()

metrics = {
    "model": "word_char_tfidf_logistic_regression",
    "seed": SEED,
    "train_rows": int(len(X_train)),
    "test_rows": int(len(X_test)),
    "macro_f1": macro_f1,
    "majority_accuracy_baseline": majority_baseline,
    "warning": "Labels are derived from stars, so this measures star-text agreement, not human-annotated sentiment.",
}
joblib.dump(model, OUTPUT / "review_sentiment_en_v1.joblib")
with open(OUTPUT / "review_sentiment_metrics.json", "w", encoding="utf-8") as file:
    json.dump(metrics, file, ensure_ascii=False, indent=2)

# %% 6. Bayesian quality score: avoids ranking a place with one 5-star review first
restaurant = df.groupby("Restaurant").agg(
    mean_rating=("Rating", "mean"),
    review_count=("Rating", "size"),
    review_text=("Review", lambda values: " ".join(values.astype(str).head(100))),
).reset_index()

global_mean = float(df["Rating"].mean())
minimum_evidence = max(5.0, float(restaurant["review_count"].quantile(0.60)))
restaurant["bayesian_rating"] = (
    restaurant["review_count"] / (restaurant["review_count"] + minimum_evidence) * restaurant["mean_rating"]
    + minimum_evidence / (restaurant["review_count"] + minimum_evidence) * global_mean
)
restaurant["quality_score_0_1"] = ((restaurant["bayesian_rating"] - 1) / 4).clip(0, 1)
restaurant.sort_values(["bayesian_rating", "review_count"], ascending=False).to_csv(
    OUTPUT / "restaurant_quality_scores.csv", index=False
)
display(restaurant.sort_values(["bayesian_rating", "review_count"], ascending=False).head(10))

# %% 7. Content + quality recommendation demo
# Change this text to test another preference. This is not yet personalized by user history.
USER_PREFERENCE = "good food friendly service affordable price nice ambience family"
content_vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")
item_vectors = content_vectorizer.fit_transform(restaurant["review_text"])
preference_vector = content_vectorizer.transform([USER_PREFERENCE])
restaurant["content_score_0_1"] = cosine_similarity(preference_vector, item_vectors).ravel()
restaurant["final_score_0_1"] = (
    0.65 * restaurant["content_score_0_1"] + 0.35 * restaurant["quality_score_0_1"]
)
recommendations = restaurant.sort_values(["final_score_0_1", "review_count"], ascending=False)
recommendations[[
    "Restaurant", "final_score_0_1", "content_score_0_1", "quality_score_0_1",
    "bayesian_rating", "review_count"
]].head(10).to_csv(OUTPUT / "recommendation_demo.csv", index=False)
display(recommendations[[
    "Restaurant", "final_score_0_1", "content_score_0_1", "quality_score_0_1",
    "bayesian_rating", "review_count"
]].head(10))

# %% 8. Final gate and artifact list
checks = {
    "csv_detected_by_schema": selected_file is not None,
    "clean_rows_positive": len(df) > 0,
    "three_sentiment_classes": df["sentiment"].nunique() == 3,
    "model_file_exists": (OUTPUT / "review_sentiment_en_v1.joblib").exists(),
    "recommendations_created": (OUTPUT / "recommendation_demo.csv").exists(),
}
print(json.dumps(checks, ensure_ascii=False, indent=2))
print("Artifacts:")
for file in sorted(OUTPUT.iterdir()):
    print(" -", file.name, file.stat().st_size, "bytes")
if not all(checks.values()):
    raise RuntimeError("Notebook chưa PASS tất cả kiểm tra cuối")
print("PASS: prototype Kaggle đã chạy hết. Chưa được gọi là production AI.")
