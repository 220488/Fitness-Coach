"""
06_metrics — standard evaluation metrics for the three extraction systems.

Reads  data/03b_baseline/baseline.json      (baseline)
       data/03_exercises/exercises.json     (rules)
       data/04_llm/by_part.json             (LLM)
       web/src/data/tiers.json              (tiers the rule system derived)
       data/05_comparison/gold_tiers.json   (hand-adjudicated gold labels)
Writes data/05_comparison/metrics_report.md
       data/05_comparison/metrics_full.json

Metrics and why each is used here:

  Precision / Recall / F1
      For exercise extraction. There is no exhaustive list of "every exercise
      in the corpus", so recall against truth is not computable. Instead each
      pair is scored with one system as the reference — stated explicitly every
      time, because P and R swap when you swap the reference.

  Macro vs micro averaging
      Micro pools every exercise; macro averages the per-body-part scores.
      They differ here because body parts are very uneven (Glutes has 26
      exercises, Calves has 1), and macro stops the big ones dominating.

  Accuracy
      For tier classification against the 30 hand-adjudicated gold labels.

  Cohen's kappa
      For agreement between two systems with no ground truth. Raw agreement is
      misleading when one class dominates — 46% of tiers are "A", so two systems
      guessing "A" constantly would look like they agree. Kappa subtracts the
      agreement expected by chance.

  Confusion matrix
      Shows *which* tiers get confused, not just how often.

    python pipeline/06_metrics.py
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

# This file lives at <project>/web/pipeline/, so the project root — the
# directory holding data/ and web/ — is three levels up.
ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "05_comparison"

DISPLAY_PARTS = [
    "Chest", "Shoulders", "Triceps", "Back", "Biceps",
    "Forearms", "Quadriceps", "Hamstrings", "Glutes", "Calves",
]

MOVEMENT = re.compile(
    r"\b(press|bench|row|curl|squat|deadlift|raise|extension|fly|flye|pulldown|"
    r"pull[\s-]?down|pull[\s-]?up|chin[\s-]?up|push[\s-]?up|pushdown|dip|lunge|"
    r"thrust|bridge|shrug|kickback|crunch|plank|hinge|leg press|calf|carry|hang|"
    r"skull ?crusher|skullcrusher|step[\s-]?up|face pull|pullover|crossover)\b",
    re.I,
)


def norm_name(name: str) -> str:
    s = name.lower()
    for a, b in [
        (r"\bdb\b", "dumbbell"), (r"\bbb\b", "barbell"), (r"\brdls?\b", "romaniandeadlift"),
        (r"[\s-]?ups?\b", "up"), (r"[\s-]?downs?\b", "down"),
        (r"\bskull[\s-]?crushers?\b", "skullcrusher"), (r"\bdead[\s-]?lifts?\b", "deadlift"),
        (r"\b(one|single|1)[\s-]?arm\b", "singlearm"), (r"\bhigh[\s-]?bar\b", ""),
    ]:
        s = re.sub(a, b, s)
    return re.sub(r"s$", "", re.sub(r"[^a-z0-9]+", "", s))


# ------------------------------------------------------------------- metrics


def prf(predicted: set, reference: set) -> dict:
    """
    Precision, recall and F1 of `predicted` measured against `reference`.

    Reference is not ground truth here — it is simply the other system — so the
    caller must always report which direction was used.
    """
    tp = len(predicted & reference)
    fp = len(predicted - reference)
    fn = len(reference - predicted)
    p = tp / (tp + fp) if (tp + fp) else 0.0
    r = tp / (tp + fn) if (tp + fn) else 0.0
    f = 2 * p * r / (p + r) if (p + r) else 0.0
    return {"tp": tp, "fp": fp, "fn": fn, "precision": round(p, 3), "recall": round(r, 3), "f1": round(f, 3)}


def cohen_kappa(pairs: list[tuple[str, str]]) -> float | None:
    """
    Cohen's kappa for two raters over the same items.

    kappa = (observed - expected) / (1 - expected), where expected is the
    agreement you would get if both raters assigned labels independently at
    their own observed base rates. 1.0 is perfect, 0 is chance-level.
    """
    if not pairs:
        return None
    n = len(pairs)
    observed = sum(1 for a, b in pairs if a == b) / n
    a_counts = Counter(a for a, _ in pairs)
    b_counts = Counter(b for _, b in pairs)
    expected = sum((a_counts[k] / n) * (b_counts[k] / n) for k in set(a_counts) | set(b_counts))
    if expected == 1.0:
        return 1.0
    return round((observed - expected) / (1 - expected), 3)


def interpret_kappa(k: float | None) -> str:
    if k is None:
        return "—"
    for threshold, label in [(0.81, "almost perfect"), (0.61, "substantial"),
                             (0.41, "moderate"), (0.21, "fair"), (0.0, "slight")]:
        if k >= threshold:
            return label
    return "worse than chance"


def confusion(pairs: list[tuple[str, str]], labels: list[str]) -> list[list[int]]:
    index = {l: i for i, l in enumerate(labels)}
    m = [[0] * len(labels) for _ in labels]
    for a, b in pairs:
        if a in index and b in index:
            m[index[a]][index[b]] += 1
    return m


# ----------------------------------------------------------------- load data


def load() -> dict:
    base = json.loads((ROOT / "data/03b_baseline/baseline.json").read_text())["by_part"]
    rules_raw = json.loads((ROOT / "data/03_exercises/exercises.json").read_text())["by_part"]
    tiers = json.loads((ROOT / "web/src/data/tiers.json").read_text())
    llm_path = ROOT / "data/04_llm/by_part.json"
    llm_raw = json.loads(llm_path.read_text())["by_part"] if llm_path.exists() else {}

    systems = {
        "baseline": {p: [{"name": e["name"], "tier": e.get("tier"), "slug": e.get("slug", "")}
                         for e in items] for p, items in base.items()},
        "rules": {p: [{"name": e["name"], "slug": e["slug"],
                       "tier": (tiers.get(f"{p}/{e['slug']}") or {}).get("tier")}
                      for e in items] for p, items in rules_raw.items()},
    }
    if llm_raw:
        systems["llm"] = {p: [{"name": e["name"], "slug": e.get("slug", ""), "tier": e.get("tier")}
                              for e in items] for p, items in llm_raw.items()}
    return systems


def main() -> int:
    systems = load()
    names = [n for n in ("baseline", "rules", "llm") if n in systems]
    gold_path = OUT_DIR / "gold_tiers.json"
    gold_doc = json.loads(gold_path.read_text()) if gold_path.exists() else {"labels": {}}
    gold = {k: v["tier"] for k, v in gold_doc.get("labels", {}).items()}

    report: dict = {"systems": names}
    L: list[str] = [
        "# Evaluation metrics",
        "",
        f"Three systems — {', '.join(names)} — on 108 cleaned transcripts.",
        "",
        "## Metric choices",
        "",
        "| Metric | Used for | Why |",
        "|---|---|---|",
        "| Precision / Recall / F1 | exercise extraction | standard IE metrics; reference system stated each time |",
        "| Macro vs micro average | exercise extraction | body parts are very uneven (Glutes 26, Calves 1) |",
        "| Accuracy | tier classification | 30 hand-adjudicated gold labels |",
        "| Cohen's κ | system-vs-system agreement | raw agreement inflates when one class dominates (46% are \"A\") |",
        "| Confusion matrix | tier classification | shows *which* tiers are confused |",
        "",
    ]

    # ------------------------------------------- Task 1: extraction P/R/F1
    L += [
        "## Task 1 — Exercise extraction",
        "",
        "No exhaustive list of every exercise in the corpus exists, so recall",
        "against truth is not computable. Each pair is scored with one system as",
        "the reference; precision and recall swap if the reference swaps.",
        "",
        "### Against the rule-based system as reference",
        "",
        "| System | TP | FP | FN | Precision | Recall | F1 (micro) | F1 (macro) |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    ref_sys = "rules"
    for sysname in names:
        if sysname == ref_sys:
            continue
        pred_all, ref_all = set(), set()
        per_part_f1 = []
        for part in DISPLAY_PARTS:
            pred = {(part, norm_name(e["name"])) for e in systems[sysname].get(part, [])}
            ref = {(part, norm_name(e["name"])) for e in systems[ref_sys].get(part, [])}
            pred_all |= pred
            ref_all |= ref
            if ref or pred:
                per_part_f1.append(prf(pred, ref)["f1"])
        micro = prf(pred_all, ref_all)
        macro_f1 = round(sum(per_part_f1) / len(per_part_f1), 3) if per_part_f1 else 0.0
        report.setdefault("extraction_vs_rules", {})[sysname] = {**micro, "f1_macro": macro_f1}
        L.append(
            f"| {sysname} | {micro['tp']} | {micro['fp']} | {micro['fn']} | "
            f"{micro['precision']} | {micro['recall']} | {micro['f1']} | {macro_f1} |"
        )

    # Precision against the movement-word proxy — this one is reference-free.
    L += [
        "",
        "### Precision against a reference-free proxy",
        "",
        "An extracted item should name a movement. This needs no reference system.",
        "",
        "| System | Items | Name a movement | Precision |",
        "|---|---:|---:|---:|",
    ]
    for sysname in names:
        items = [e for part in DISPLAY_PARTS for e in systems[sysname].get(part, [])]
        hits = sum(1 for e in items if MOVEMENT.search(e["name"]))
        p = round(hits / len(items), 3) if items else 0.0
        report.setdefault("extraction_proxy", {})[sysname] = {"items": len(items), "valid": hits, "precision": p}
        L.append(f"| {sysname} | {len(items)} | {hits} | {p} |")
    L.append("")

    # ------------------------------------------------- Task 2: tier accuracy
    L += [
        "## Task 2 — Tier classification",
        "",
        f"Gold standard: **{len(gold)}** exercises, adjudicated from verbatim transcript",
        "quotes. Single annotator — see Limitations.",
        "",
        "| System | Scored | Correct | Accuracy |",
        "|---|---:|---:|---:|",
    ]
    tier_preds: dict[str, dict[str, str]] = {}
    for sysname in names:
        preds = {}
        for part in DISPLAY_PARTS:
            for e in systems[sysname].get(part, []):
                if e.get("tier") and e.get("slug"):
                    preds[f"{part}/{e['slug']}"] = e["tier"]
        tier_preds[sysname] = preds
        shared = [(gold[k], preds[k]) for k in gold if k in preds]
        correct = sum(1 for g, p in shared if g == p)
        acc = round(correct / len(shared), 3) if shared else None
        report.setdefault("tier_accuracy", {})[sysname] = {
            "scored": len(shared), "correct": correct, "accuracy": acc
        }
        L.append(f"| {sysname} | {len(shared)} | {correct} | {acc if acc is not None else '—'} |")

    majority = Counter(gold.values()).most_common(1)[0]
    L += [
        f"| majority-class floor (always \"{majority[0]}\") | {len(gold)} | {majority[1]} | "
        f"{round(majority[1]/len(gold), 3)} |",
        "",
    ]
    report["tier_accuracy"]["majority_floor"] = {
        "accuracy": round(majority[1] / len(gold), 3), "class": majority[0]
    }

    # ------------------------------------------------ Task 2b: kappa + matrix
    L += [
        "### Inter-system agreement (Cohen's κ)",
        "",
        "| Pair | Items | Raw agreement | κ | Interpretation |",
        "|---|---:|---:|---:|---|",
    ]
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            shared_keys = set(tier_preds[a]) & set(tier_preds[b])
            pairs = [(tier_preds[a][k], tier_preds[b][k]) for k in shared_keys]
            if not pairs:
                continue
            raw = sum(1 for x, y in pairs if x == y) / len(pairs)
            k = cohen_kappa(pairs)
            report.setdefault("kappa", {})[f"{a}_vs_{b}"] = {
                "n": len(pairs), "raw_agreement": round(raw, 3), "kappa": k
            }
            L.append(f"| {a} vs {b} | {len(pairs)} | {raw:.0%} | {k} | {interpret_kappa(k)} |")
    L.append("")

    labels = ["S", "A", "B", "C", "D", "F"]
    if "rules" in tier_preds and "llm" in tier_preds:
        shared_keys = set(tier_preds["rules"]) & set(tier_preds["llm"])
        pairs = [(tier_preds["rules"][k], tier_preds["llm"][k]) for k in shared_keys]
        m = confusion(pairs, labels)
        L += [
            "### Confusion matrix — rules (rows) vs LLM (columns)",
            "",
            "| | " + " | ".join(labels) + " |",
            "|---|" + "---:|" * len(labels),
        ]
        for i, row_label in enumerate(labels):
            L.append(f"| **{row_label}** | " + " | ".join(str(v) if v else "·" for v in m[i]) + " |")
        L.append("")
        report["confusion_rules_llm"] = {"labels": labels, "matrix": m}

    # ------------------------------------------------------------ limitations
    L += [
        "## Limitations",
        "",
        f"- **Single annotator.** All {len(gold)} gold labels were adjudicated by one person,",
        "  who had already seen both systems' outputs. Verdicts are quoted text",
        "  (\"going straight to F tier\") rather than judgement calls, which limits but",
        "  does not remove that bias. A second independent annotator would allow an",
        "  inter-annotator κ to be reported alongside the system κ.",
        "- **Gold set is small and not random across classes.** 30 labels, drawn from",
        "  exercises the rule system had already tiered, so exercises *missed* by that",
        "  system cannot appear in it. Recall on tier assignment is therefore not measured.",
        "- **Extraction recall is not measurable.** No exhaustive ground-truth list of",
        "  exercises in the corpus exists, so F1 against the rule system is agreement,",
        "  not correctness.",
        "- **The movement-word proxy is approximate.** It rewards naming a movement, so",
        "  a hallucinated-but-plausible exercise name would score as a true positive.",
        "",
    ]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "metrics_report.md").write_text("\n".join(L))
    (OUT_DIR / "metrics_full.json").write_text(json.dumps(report, indent=1))

    print("TIER ACCURACY vs gold (n=%d)" % len(gold))
    for k, v in report["tier_accuracy"].items():
        print(f"   {k:<18}{v.get('accuracy')}")
    print("\nCOHEN'S KAPPA")
    for k, v in report.get("kappa", {}).items():
        print(f"   {k:<22}n={v['n']:<4} raw={v['raw_agreement']}  k={v['kappa']}  ({interpret_kappa(v['kappa'])})")
    print("\nEXTRACTION (vs rules as reference)")
    for k, v in report.get("extraction_vs_rules", {}).items():
        print(f"   {k:<10}P={v['precision']} R={v['recall']} F1={v['f1']} (macro {v['f1_macro']})")
    print(f"\n-> {(OUT_DIR / 'metrics_report.md').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
