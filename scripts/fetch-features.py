"""Fetch all class and subclass features from dnd5eapi.co and regenerate
src/data/exports/features.json in the app's local format.

The API's subclass indexes (one SRD subclass per class) match the short local
subclass ids; SUBCLASS_ALIASES additionally maps them onto the longer-named
duplicates in subclasses.json so features resolve for either id.
"""
import json
import time
import requests

BASE_URL = "https://www.dnd5eapi.co/api/2014/features"
OUTPUT_FILE = "src/data/exports/features.json"

SUBCLASS_ALIASES = {
    "berserker": ["berserker", "path_of_berserker"],
    "lore": ["lore", "college_of_lore"],
    "life": ["life", "life_domain"],
    "land": ["land", "circle_of_land"],
    "champion": ["champion"],
    "open-hand": ["open-hand"],
    "devotion": ["devotion", "oath_of_devotion"],
    "hunter": ["hunter"],
    "thief": ["thief"],
    "draconic": ["draconic", "draconic_sorcery"],
    "fiend": ["fiend", "the_fiend"],
    "evocation": ["evocation", "evocation_school"],
}


def fetch_all_features():
    print("Fetching feature index...")
    index = requests.get(BASE_URL).json()
    results = index.get("results", [])
    print(f"Found {len(results)} features")

    features = []
    for i, entry in enumerate(results):
        try:
            data = requests.get(f"{BASE_URL}/{entry['index']}").json()
        except requests.RequestException as e:
            print(f"Error fetching {entry['index']}: {e}")
            continue

        name = data["name"]
        level = data.get("level", 1)
        desc = "\n\n".join(data.get("desc", []))
        class_id = data.get("class", {}).get("index", "")
        subclass_id = (data.get("subclass") or {}).get("index")

        if subclass_id:
            for local_id in SUBCLASS_ALIASES.get(subclass_id, [subclass_id]):
                features.append({
                    "id": f"{local_id}_{data['index']}",
                    "source_id": local_id,
                    "source_type": "subclass",
                    "level_required": level,
                    "name": name,
                    "description": desc,
                })
        else:
            features.append({
                "id": f"{class_id}_{data['index']}",
                "source_id": class_id,
                "source_type": "class",
                "level_required": level,
                "name": name,
                "description": desc,
            })

        if (i + 1) % 40 == 0:
            print(f"Processed {i + 1}/{len(results)}...")
        time.sleep(0.05)

    return features


if __name__ == "__main__":
    features = fetch_all_features()
    class_count = sum(1 for f in features if f["source_type"] == "class")
    sub_count = len(features) - class_count
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(features, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(features)} features ({class_count} class, {sub_count} subclass) to {OUTPUT_FILE}")
