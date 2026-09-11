#!/usr/bin/env python3
"""
Rana — validate that every exercise_key referenced in data/slots.json actually
exists in data/exercises.json. This is the check PRD rana-prd-v1-910 section 4
asks for: "every key referenced anywhere must exist in the library... run it in
CI, or at minimum as a pre-commit step." Fails loudly (non-zero exit, printed
list of every dangling reference) rather than letting a bad swap option fail
silently in the app.

No third-party dependencies — reads the committed JSON only, not the .xlsx, so
it can run anywhere data/ is checked out.

Run: python3 scripts/validate_library.py
"""
import json
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def main():
    exercises = json.loads((DATA_DIR / "exercises.json").read_text())
    slots_doc = json.loads((DATA_DIR / "slots.json").read_text())

    valid_keys = {e["exercise_key"] for e in exercises}
    if len(valid_keys) != len(exercises):
        print("VALIDATION FAILED: duplicate exercise_key values in exercises.json", file=sys.stderr)
        sys.exit(1)

    slot_ids = {s["slot_id"] for s in slots_doc["slots"]}

    errors = []
    for opt in slots_doc["slot_options"]:
        if opt["slot_id"] not in slot_ids:
            errors.append(f"slot_option references unknown slot_id {opt['slot_id']}")
        if opt["exercise_key"] not in valid_keys:
            errors.append(f"slot {opt['slot_id']}: exercise_key '{opt['exercise_key']}' not in exercises.json")

    if errors:
        print(f"VALIDATION FAILED: {len(errors)} problem(s)", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        sys.exit(1)

    print(f"OK — {len(exercises)} exercises, {len(slots_doc['slots'])} slots, "
          f"{len(slots_doc['slot_options'])} slot_options all resolve cleanly.")


if __name__ == "__main__":
    main()
