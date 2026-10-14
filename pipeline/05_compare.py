"""
05_compare — evaluate three methods on the same corpus.

Reads  data/03b_baseline/baseline.json    (naive baseline)
       data/03_exercises/exercises.json   (rules + lexicon)
       data/04_llm/by_part.json           (LLM — optional, skipped if absent)
       web/src/data/tiers.json            (tiers derived by the rule system)
Writes data/05_comparison/report.md
       data/05_comparison/metrics.json

Three conditions, identical input, same three tasks:

    baseline  verbatim chapter titles, last-tier-match, first-equipment-keyword
    rules     gazetteer + normalisation + pragmatic tier classification
    llm       a generative model reading the same transcripts

IMPORTANT — there is no surviving human gold standard. Tiers were hand-labelled
once, before the classifier was written, but those labels lived only in a working
file that was later replaced by the derived data and never committed. So
`tiers.json` is the RULE SYSTEM'S OWN OUTPUT: scoring the rule system against it
would be circular and is not done here.

Instead this reports AGREEMENT between independent methods. Where the rule system
and the LLM — which share no code, no lexicon and no heuristics — converge, that
convergence is the evidence. Extraction quality uses an interpretable proxy
(does the extracted item name a movement?) rather than a claimed gold standard.

    python pipeline/05_compare.py
"""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

# This file lives at <project>/web/pipeline/, so the project root — the
# directory holding data/ and web/ — is three levels up.
ROOT = Path(__file__).resolve().parents[2]
BASELINE_PATH = ROOT / "data" / "03b_baseline" / "baseline.json"
RULES_PATH = ROOT / "data" / "03_exercises" / "exercises.json"
LLM_PATH = ROOT / "data" / "04_llm" / "by_part.json"
TIERS_PATH = ROOT / "web" / "src" / "data" / "tiers.json"
OUT_DIR = ROOT / "data" / "05_comparison"

DISPLAY_PARTS = [
    "Chest", "Shoulders", "Triceps", "Back", "Biceps",
    "Forearms", "Quadriceps", "Hamstrings", "Glutes", "Calves",
]

# Proxy for "is this actually an exercise?" — it must name a movement. Used to
# score extraction quality where no human-labelled gold standard exists.
MOVEMENT = re.compile(
    r"\b(press|bench|row|curl|squat|deadlift|raise|extension|fly|flye|pulldown|"
    r"pull[\s-]?down|pull[\s-]?up|chin[\s-]?up|push[\s-]?up|pushdown|dip|lunge|"
    r"thrust|bridge|shrug|kickback|crunch|plank|hinge|leg press|calf|carry|hang|"
    r"skull ?crusher|skullcrusher|step[\s-]?up|face pull|pullover|crossover)\b",
    re.I,
)


def norm_name(name: str) -> str:
    """Fold names so spelling differences don't register as disagreement."""
    s = name.lower()
    for pattern, replacement in [
        (r"\bdb\b", "dumbbell"), (r"\bbb\b", "barbell"),
        (r"\brdls?\b", "romaniandeadlift"),
        (r"[\s-]?ups?\b", "up"), (r"[\s-]?downs?\b", "down"),
        (r"\bskull[\s-]?crushers?\b", "skullcrusher"),
        (r"\bdead[\s-]?lifts?\b", "deadlift"),
        (r"\b(one|single|1)[\s-]?arm\b", "singlearm"),
    ]:
        s = re.sub(pattern, replacement, s)
    s = re.sub(r"[^a-z0-9]+", "", s)
    return re.sub(r"s$", "", s)


def norm_kit(kit: str) -> set[str]:
    atoms = set()
    for atom, pattern in [
        ("smith", r"smith"), ("hacksquat", r"hack squat"), ("legpress", r"leg press"),
        ("legcurl", r"leg curl"), ("legextension", r"leg extension"),
        ("pulldown", r"pull ?down|pulldown"), ("cable", r"cable|pulley"),
        ("preacher", r"preacher"), ("pullupbar", r"pull ?up bar"),
        ("rack", r"rack|cage"), ("bench", r"bench"), ("dumbbell", r"dumbbell"),
        ("barbell", r"barbell"), ("ezbar", r"ez bar"), ("kettlebell", r"kettlebell"),
        ("band", r"band"), ("machine", r"machine"), ("bodyweight", r"bodyweight"),
    ]:
        if re.search(pattern, kit, re.I):
            atoms.add(atom)
    return atoms or {"unknown"}


def pct(a: int, b: int) -> str:
    return f"{a/b*100:.0f}%" if b else "—"


def load_systems() -> dict[str, dict[str, list[dict]]]:
    """Normalise all three outputs into {system: {part: [ {name, tier, equipment, is_top} ]}}."""
    systems: dict[str, dict[str, list[dict]]] = {}

    base = json.loads(BASELINE_PATH.read_text())["by_part"]
    systems["baseline"] = {
        p: [{"name": e["name"], "tier": e.get("tier"), "equipment": e.get("equipment", "Unknown"),
             "is_top": e.get("is_top", False)} for e in items]
        for p, items in base.items()
    }

    rules = json.loads(RULES_PATH.read_text())["by_part"]
    gold = json.loads(TIERS_PATH.read_text())
    systems["rules"] = {
        p: [{"name": e["name"],
             "tier": (gold.get(f"{p}/{e['slug']}") or {}).get("tier"),
             "equipment": e["equipment"]["needs"],
             "is_top": e.get("is_top", e.get("isTop", False))} for e in items]
        for p, items in rules.items()
    }

    if LLM_PATH.exists():
        llm = json.loads(LLM_PATH.read_text())
        systems["llm"] = {
            p: [{"name": e["name"], "tier": e.get("tier"), "equipment": e.get("equipment", "Unknown"),
                 "is_top": e.get("is_top", False)} for e in items]
            for p, items in llm["by_part"].items()
        }
    return systems


def main() -> int:
    for path in (BASELINE_PATH, RULES_PATH):
        if not path.exists():
            print(f"missing {path.relative_to(ROOT)} — run the earlier stage first")
            return 1

    systems = load_systems()
    names = [n for n in ("baseline", "rules", "llm") if n in systems]
    gold = json.loads(TIERS_PATH.read_text())

    metrics: dict = {"systems": names, "tasks": {}}
    L: list[str] = [
        "# Evaluation — baseline vs rule-based vs LLM",
        "",
        f"Systems compared: {', '.join(names)}"
        + ("" if "llm" in names else "  \n_(LLM extraction not yet run — see pipeline/04_llm_extract.py)_"),
        "",
        "All three read the same 108 cleaned transcripts and perform the same three",
        "tasks. The baseline is the naive method: verbatim chapter titles, last",
        "`\"<letter> tier\"` match, first equipment keyword, ranked by order of",
        "appearance.",
        "",
    ]

    # ------------------------------------------------- Task 1: extraction volume
    L += [
        "## Task 1 — Exercise extraction",
        "",
        "No human-labelled gold standard exists for this task, so quality is scored",
        "by an interpretable proxy: an extracted item should name a movement",
        "(press, row, squat, curl…). Items like \"Intro\" or \"Anatomy\" fail it.",
        "",
        "| System | Items extracted | Name a movement | Precision proxy |",
        "|---|---:|---:|---:|",
    ]
    for sysname in names:
        items = [e for part in DISPLAY_PARTS for e in systems[sysname].get(part, [])]
        valid = sum(1 for e in items if MOVEMENT.search(e["name"]))
        metrics["tasks"].setdefault("extraction", {})[sysname] = {
            "items": len(items), "valid": valid,
            "precision_proxy": round(valid / len(items), 3) if items else None,
        }
        L.append(f"| {sysname} | {len(items)} | {valid} | {pct(valid, len(items))} |")
    L.append("")

    # --------------------------------------------------- Task 1b: top-3 quality
    L += [
        "### Top-3 quality (what the app actually shows)",
        "",
        "| System | Top-3 slots | Name a movement | Usable |",
        "|---|---:|---:|---:|",
    ]
    for sysname in names:
        tops = [e for part in DISPLAY_PARTS for e in systems[sysname].get(part, []) if e["is_top"]]
        valid = sum(1 for e in tops if MOVEMENT.search(e["name"]))
        metrics["tasks"].setdefault("top3", {})[sysname] = {
            "slots": len(tops), "valid": valid,
            "usable": round(valid / len(tops), 3) if tops else None,
        }
        L.append(f"| {sysname} | {len(tops)} | {valid} | {pct(valid, len(tops))} |")
    L += ["", "Example top-3 per system (Quadriceps):", ""]
    for sysname in names:
        tops = [e["name"] for e in systems[sysname].get("Quadriceps", []) if e["is_top"]][:3]
        L.append(f"- **{sysname}**: {', '.join(tops) if tops else '—'}")
    L.append("")

    # ------------------------------------------------------ Task 2: tier accuracy
    dist = Counter(v["tier"] for v in gold.values())
    majority, majority_n = dist.most_common(1)[0]
    gold_lookup = {}
    rules_by_slug = json.loads(RULES_PATH.read_text())["by_part"]
    for part, items in rules_by_slug.items():
        for e in items:
            g = gold.get(f"{part}/{e['slug']}")
            if g:
                gold_lookup[(part, norm_name(e["name"]))] = g["tier"]

    L += [
        "## Task 2 — Tier assignment",
        "",
        "**No human gold standard survives.** Tiers were hand-labelled once, before",
        "the classifier existed, but those labels were never committed and have been",
        "lost. `tiers.json` is the rule system's own output, so scoring the rule",
        "system against it would be circular — that is not done here.",
        "",
        "What is measurable is **agreement between independent methods**. The rule",
        "classifier and the LLM share no code, lexicon or heuristics, so convergence",
        "is meaningful evidence; the majority-class result is the floor any method",
        "must clear.",
        "",
        "| Comparison | Exercises compared | Agree | Agreement |",
        "|---|---:|---:|---:|",
        f"| majority-class floor (always \"{majority}\") | {sum(dist.values())} | {majority_n} | "
        f"{pct(majority_n, sum(dist.values()))} |",
    ]

    ref = {}
    for part, items in rules_by_slug.items():
        for e in items:
            g = gold.get(f"{part}/{e['slug']}")
            if g:
                ref[(part, norm_name(e["name"]))] = g["tier"]

    for sysname in names:
        if sysname == "rules":
            continue  # would be comparing the rule system to itself
        scored = correct = 0
        for part in DISPLAY_PARTS:
            for e in systems[sysname].get(part, []):
                key = (part, norm_name(e["name"]))
                if key in ref and e.get("tier"):
                    scored += 1
                    if e["tier"] == ref[key]:
                        correct += 1
        metrics["tasks"].setdefault("tiers", {})[f"{sysname}_vs_rules"] = {
            "compared": scored, "agree": correct,
            "agreement": round(correct / scored, 3) if scored else None,
        }
        L.append(f"| {sysname} vs rules | {scored} | {correct} | {pct(correct, scored)} |")

    metrics["tasks"].setdefault("tiers", {})["majority_floor"] = {
        "agreement": round(majority_n / sum(dist.values()), 3), "class": majority,
    }
    L += [
        "",
        f"Tier distribution across the {sum(dist.values())} tiers the rule system assigned: {dict(dist)}",
        "",
    ]

    # -------------------------------------------------------- Task 3: equipment
    L += [
        "## Task 3 — Equipment",
        "",
        "| System | Items | Resolved | Coverage |",
        "|---|---:|---:|---:|",
    ]
    for sysname in names:
        items = [e for part in DISPLAY_PARTS for e in systems[sysname].get(part, [])]
        resolved = sum(1 for e in items if e["equipment"] and e["equipment"].lower() != "unknown")
        metrics["tasks"].setdefault("equipment", {})[sysname] = {
            "items": len(items), "resolved": resolved,
            "coverage": round(resolved / len(items), 3) if items else None,
        }
        L.append(f"| {sysname} | {len(items)} | {resolved} | {pct(resolved, len(items))} |")
    L.append("")

    # ------------------------------------------- Cross-system agreement (if LLM)
    if "llm" in names:
        L += ["## Agreement between rules and LLM", "", "| Body part | Both | Rules only | LLM only | Jaccard |", "|---|---:|---:|---:|---:|"]
        tb = tr = tl = 0
        for part in DISPLAY_PARTS:
            r = {norm_name(e["name"]) for e in systems["rules"].get(part, [])}
            l = {norm_name(e["name"]) for e in systems["llm"].get(part, [])}
            both, ronly, lonly = len(r & l), len(r - l), len(l - r)
            tb += both; tr += ronly; tl += lonly
            L.append(f"| {part} | {both} | {ronly} | {lonly} | {pct(both, len(r | l))} |")
        L.append(f"| **Total** | **{tb}** | **{tr}** | **{tl}** | **{pct(tb, tb+tr+tl)}** |")
        L.append("")
        metrics["tasks"]["agreement_rules_llm"] = {
            "both": tb, "rules_only": tr, "llm_only": tl,
            "jaccard": round(tb / (tb + tr + tl), 3) if (tb + tr + tl) else None,
        }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "report.md").write_text("\n".join(L))
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics, indent=1))

    print(f"systems compared: {', '.join(names)}\n")
    for task in ("extraction", "top3", "tiers", "equipment"):
        if task in metrics["tasks"]:
            row = metrics["tasks"][task]
            parts = [
                f"{k}="
                + str(next((v[m] for m in ("precision_proxy", "usable", "agreement", "coverage") if v.get(m) is not None), "—"))
                for k, v in row.items() if isinstance(v, dict)
            ]
            print(f"  {task:<12} " + "  ".join(parts))
    print(f"\n-> {(OUT_DIR / 'report.md').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
