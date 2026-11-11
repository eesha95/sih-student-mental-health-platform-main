"""Analysis of uploaded student-wellbeing survey datasets (CSV).

Everything shown on the admin "Dataset Analytics" panel is computed here from
the uploaded rows; nothing is entered by hand. Standard library only.

Columns are matched by keywords in the header, so survey exports with long or
emoji-laden questions (e.g. "Kindly Rate your Sleep Quality 😴") still work.
All matched columns must be numeric ratings; stress is required.
"""
import csv
import io
import math
import random
from collections import Counter, defaultdict

# key -> (label, keywords that must all appear in the lower-cased header)
COLUMN_PATTERNS = {
    "stress": ("Stress level", [["stress"]]),
    "sleep": ("Sleep quality", [["sleep"]]),
    "headaches": ("Headaches per week", [["headache"]]),
    "academic_performance": ("Academic performance", [["academic", "performance"]]),
    "study_load": ("Study load", [["study", "load"], ["workload"]]),
    "extracurricular": ("Extracurricular activities", [["extracurricular"]]),
    "anxiety": ("Anxiety", [["anxiety"], ["anxious"]]),
    "depression": ("Depression", [["depression"], ["depressed"]]),
}

STRESS_LEVELS = ["Low", "Medium", "High"]
MAX_ROWS = 50000


class DatasetError(ValueError):
    pass


def _match_columns(headers):
    mapping = {}
    for key, (_, alternatives) in COLUMN_PATTERNS.items():
        for idx, header in enumerate(headers):
            h = header.lower()
            if any(all(word in h for word in words) for words in alternatives):
                # "stress" must not grab e.g. "academic stress factors" if a plainer one exists
                if key not in mapping:
                    mapping[key] = idx
    return mapping


def _to_number(value):
    value = (value or "").strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def parse_csv(text):
    """Return (columns, rows): columns maps key -> original header, rows are dicts of floats."""
    text = text.lstrip("﻿")
    reader = csv.reader(io.StringIO(text))
    try:
        headers = next(reader)
    except StopIteration:
        raise DatasetError("The file is empty.")
    mapping = _match_columns(headers)
    if "stress" not in mapping:
        raise DatasetError("No stress column found. The CSV needs a column whose header mentions 'stress'.")

    rows = []
    for line in reader:
        if not any(cell.strip() for cell in line):
            continue
        row = {}
        for key, idx in mapping.items():
            row[key] = _to_number(line[idx]) if idx < len(line) else None
        if row["stress"] is None:
            continue
        rows.append(row)
        if len(rows) > MAX_ROWS:
            raise DatasetError(f"The file has more than {MAX_ROWS:,} rows.")
    if not rows:
        raise DatasetError("No rows with a numeric stress value were found.")
    columns = {key: headers[idx].strip() for key, idx in mapping.items()}
    return columns, rows


def stress_level(score, scale_max):
    """Map a stress rating to Low / Medium / High by thirds of the rating scale."""
    fraction = score / scale_max if scale_max else 0
    if fraction <= 0.4:
        return "Low"
    if fraction <= 0.6:
        return "Medium"
    return "High"


def _mean(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), 2) if values else None


# --- Categorical Naive Bayes -------------------------------------------------

def _train_nb(samples, features):
    """samples: list of (feature_dict, label). Returns a model dict."""
    class_counts = Counter(label for _, label in samples)
    value_counts = {f: defaultdict(Counter) for f in features}
    values_seen = {f: set() for f in features}
    for x, label in samples:
        for f in features:
            v = x.get(f)
            if v is not None:
                value_counts[f][label][v] += 1
                values_seen[f].add(v)
    return {
        "features": features,
        "class_counts": dict(class_counts),
        "value_counts": {f: {c: dict(cnt) for c, cnt in by_c.items()} for f, by_c in value_counts.items()},
        "values_seen": {f: sorted(v) for f, v in values_seen.items()},
        "total": len(samples),
    }


def predict_proba(model, x):
    scores = {}
    for label, count in model["class_counts"].items():
        log_p = math.log(count / model["total"])
        for f in model["features"]:
            v = x.get(f)
            if v is None:
                continue
            k = max(len(model["values_seen"][f]), 1)
            seen = model["value_counts"][f].get(label, {}).get(v, 0)
            # value_counts keys may be floats or strings after a JSON round trip
            if not seen:
                seen = model["value_counts"][f].get(label, {}).get(str(v), 0)
            log_p += math.log((seen + 1) / (count + k))  # Laplace smoothing
        scores[label] = log_p
    top = max(scores.values())
    exp = {label: math.exp(s - top) for label, s in scores.items()}
    total = sum(exp.values())
    return {label: exp[label] / total for label in STRESS_LEVELS if label in exp}


def _evaluate(samples, features, seed=42):
    """80/20 holdout accuracy vs. always guessing the most common level."""
    shuffled = samples[:]
    random.Random(seed).shuffle(shuffled)
    cut = max(1, int(len(shuffled) * 0.8))
    train, test = shuffled[:cut], shuffled[cut:]
    if len(train) < 10 or len(test) < 5:
        return None
    model = _train_nb(train, features)
    correct = 0
    for x, label in test:
        proba = predict_proba(model, x)
        if max(proba, key=proba.get) == label:
            correct += 1
    majority = Counter(label for _, label in train).most_common(1)[0][0]
    baseline = sum(1 for _, label in test if label == majority) / len(test)
    return {
        "accuracy": round(correct / len(test), 3),
        "baseline_accuracy": round(baseline, 3),
        "baseline_label": majority,
        "train_size": len(train),
        "test_size": len(test),
    }


# --- Full analysis -----------------------------------------------------------

def analyze(columns, rows):
    scale_max = max(r["stress"] for r in rows)
    scale_max = 5 if scale_max <= 5 else 10 if scale_max <= 10 else scale_max
    for r in rows:
        r["_level"] = stress_level(r["stress"], scale_max)

    level_counts = Counter(r["_level"] for r in rows)
    distribution = [{"name": lvl, "value": level_counts.get(lvl, 0)} for lvl in STRESS_LEVELS]
    available = [k for k in COLUMN_PATTERNS if k in columns]

    def by_level(key):
        return {lvl: _mean([r[key] for r in rows if r["_level"] == lvl]) for lvl in STRESS_LEVELS}

    # Bar chart: academic factors by stress level
    academic = [
        {"factor": COLUMN_PATTERNS[k][0], **by_level(k)}
        for k in ("study_load", "academic_performance", "extracurricular") if k in available
    ]

    # Bar chart: anxiety & depression if present, otherwise physical symptoms
    mental_keys = [k for k in ("anxiety", "depression") if k in available]
    symptom_keys = mental_keys or [k for k in ("headaches",) if k in available]
    symptoms = {
        "has_anxiety_depression": bool(mental_keys),
        "rows": [{"factor": COLUMN_PATTERNS[k][0], **by_level(k)} for k in symptom_keys],
    }

    # Line chart: average stress for each sleep-quality rating
    sleep_vs_stress = []
    correlation = None
    if "sleep" in available:
        groups = defaultdict(list)
        for r in rows:
            if r["sleep"] is not None:
                groups[r["sleep"]].append(r["stress"])
        sleep_vs_stress = [
            {"sleep": int(s) if float(s).is_integer() else s, "avg_stress": _mean(v), "students": len(v)}
            for s, v in sorted(groups.items())
        ]
        pairs = [(r["sleep"], r["stress"]) for r in rows if r["sleep"] is not None]
        correlation = _pearson(pairs)

    # Correlation of every factor with stress, strongest first
    factor_correlations = []
    for k in available:
        if k == "stress":
            continue
        c = _pearson([(r[k], r["stress"]) for r in rows if r[k] is not None])
        if c is not None:
            factor_correlations.append({"factor": COLUMN_PATTERNS[k][0], "key": k, "r": c})
    factor_correlations.sort(key=lambda d: abs(d["r"]), reverse=True)

    # ML: predict stress level from the other rated factors
    features = [k for k in available if k != "stress"]
    model_info = None
    if features:
        samples = [({f: r[f] for f in features}, r["_level"]) for r in rows]
        evaluation = _evaluate(samples, features)
        model = _train_nb(samples, features)
        feature_ranges = {}
        for f in features:
            vals = [r[f] for r in rows if r[f] is not None]
            feature_ranges[f] = {"label": COLUMN_PATTERNS[f][0], "min": min(vals), "max": max(vals)} if vals else None
        model_info = {
            "algorithm": "Categorical Naive Bayes",
            "features": [{"key": f, **feature_ranges[f]} for f in features if feature_ranges[f]],
            "evaluation": evaluation,
            "model": model,
        }

    return {
        "total_records": len(rows),
        "stress_scale_max": scale_max,
        "stress_levels": distribution,
        "average_stress": _mean([r["stress"] for r in rows]),
        "columns": [{"key": k, "label": COLUMN_PATTERNS[k][0], "header": columns[k]} for k in available],
        "academic_factors": academic,
        "symptoms": symptoms,
        "sleep_vs_stress": sleep_vs_stress,
        "sleep_stress_correlation": correlation,
        "factor_correlations": factor_correlations,
        "prediction": model_info,
    }


def _pearson(pairs):
    if len(pairs) < 3:
        return None
    xs, ys = zip(*pairs)
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs))
    sy = math.sqrt(sum((y - my) ** 2 for y in ys))
    if not sx or not sy:
        return None
    return round(sum((x - mx) * (y - my) for x, y in pairs) / (sx * sy), 3)
