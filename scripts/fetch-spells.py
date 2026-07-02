import requests
import json
import time
from typing import List, Dict, Any

BASE_URL = "https://www.dnd5eapi.co/api/spells"
OUTPUT_FILE = "all_spells_with_damage.json"

def fetch_all_spells() -> List[Dict[str, Any]]:
    """Fetch all spells from D&D 5e API with damage information."""
    
    # Step 1: Fetch master index list
    print("Fetching spell index from API...")
    response = requests.get(BASE_URL)
    response.raise_for_status()
    index_data = response.json()
    
    spells = index_data.get('results', [])
    print(f"Found {len(spells)} spells in index")
    
    all_spells = []
    spells_with_damage = 0
    
    # Step 2: Iterate through each spell index
    for i, spell in enumerate(spells):
        spell_index = spell['index']
        spell_url = f"{BASE_URL}/{spell_index}"
        
        try:
            # Fetch detailed spell data
            response = requests.get(spell_url)
            response.raise_for_status()
            spell_data = response.json()
            
            # Step 3: Parse and retain damage object if present
            if 'damage' in spell_data and spell_data['damage']:
                spells_with_damage += 1
            # If no damage object, that's fine - utility/healing spells won't have it
            
            all_spells.append(spell_data)
            
            # Progress indicator
            if (i + 1) % 20 == 0:
                print(f"Processed {i + 1}/{len(spells)} spells...")
            
            # Step 2: Add 0.05 second delay to prevent rate limits
            time.sleep(0.05)
            
        except requests.RequestException as e:
            print(f"Error fetching spell {spell_index}: {e}")
            continue
    
    # Step 5: Print breakdown
    print(f"\n{'='*50}")
    print(f"Total spells saved: {len(all_spells)}")
    print(f"Spells with damage metrics: {spells_with_damage}")
    print(f"Spells without damage (utility/healing): {len(all_spells) - spells_with_damage}")
    print(f"{'='*50}\n")
    
    return all_spells

def save_spells(spells: List[Dict[str, Any]], filename: str):
    """Save spells to JSON file."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(spells, f, indent=2, ensure_ascii=False)
    print(f"Saved spells to {filename}")

if __name__ == "__main__":
    spells = fetch_all_spells()
    save_spells(spells, OUTPUT_FILE)
