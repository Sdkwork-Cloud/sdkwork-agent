---
name: extract-props
version: '1.0.0'
author: sdkwork.com
description: Identify and catalog all props mentioned in script including their significance and usage. Use for production planning and prop management.
category: narrative
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: props objects items catalog significance
---

# Extract Props

## Purpose

Scan script to identify all physical objects, props, and items mentioned, including their narrative significance and production requirements.

## When to Use

- Creating prop lists for production
- Budgeting for props and set dressing
- Identifying hero props requiring special attention
- Planning prop continuity
- Set design and decoration

## Inputs

- `script` (string, required): Full script content
- `includeSetDressing` (boolean, optional): Include background/set dressing items (default: false)
- `categorizeBySignificance` (boolean, optional): Sort by narrative importance (default: true)

## Outputs

```json
{
  "props": [
    {
      "id": "prop_001",
      "name": "Vintage Pocket Watch",
      "category": "hero_prop",
      "significance": "high",
      "description": "Gold pocket watch, worn, engraved with initials",
      "firstAppearance": "Scene 2",
      "scenes": [2, 5, 8],
      "usage": [
        {
          "scene": 2,
          "action": "revealed_as_heirloom",
          "emotionalWeight": "nostalgia"
        },
        {
          "scene": 8,
          "action": "passed_to_next_generation",
          "emotionalWeight": "closure"
        }
      ],
      "requirements": {
        "period": "1940s",
        "condition": "worn_but_functional",
        "specialFeatures": "engraved_initials",
        "quantity": 2
      },
      "continuityNotes": "Must match in all scenes, check time shown"
    }
  ],
  "categories": {
    "hero_props": 3,
    "hand_props": 12,
    "set_dressing": 25,
    "costume_props": 5
  },
  "byScene": {
    "Scene 1": ["coffee_cup", "newspaper"],
    "Scene 2": ["vintage_pocket_watch", "letter"]
  }
}
```

## Prop Categories

- **hero_prop**: Central to story, requires special attention
- **hand_prop**: Characters handle/interact with
- **set_dressing**: Background environment items
- **costume_prop**: Worn or carried as accessory
- **practical_prop**: Functional (phones, weapons, etc.)
- **special_effect**: Requires VFX or special handling

## Instructions

1. Scan script for all object mentions
2. Identify prop category and significance
3. Extract descriptions and requirements
4. Track appearances across scenes
5. Note continuity requirements
6. Calculate quantities needed
7. Flag hero props for special attention
8. Organize by scene and category

## Examples

### Example 1: Mystery Story

**Input:**

```
Scene 1: Sarah holds an ANTIQUE KEY, examining it closely.
Scene 3: She uses the key to unlock a SECRET DRAWER.
Scene 7: The key breaks, revealing a hidden compartment.
```

**Output:**

```json
{
  "props": [
    {
      "id": "prop_001",
      "name": "Antique Key",
      "category": "hero_prop",
      "significance": "critical",
      "description": "Ornate antique key, brass, worn patina",
      "firstAppearance": "Scene 1",
      "scenes": [1, 3, 7],
      "usage": [
        {
          "scene": 1,
          "action": "examined",
          "emotionalWeight": "curiosity"
        },
        {
          "scene": 3,
          "action": "used_to_unlock",
          "emotionalWeight": "discovery"
        },
        {
          "scene": 7,
          "action": "breaks_reveals_secret",
          "emotionalWeight": "climax"
        }
      ],
      "requirements": {
        "material": "brass",
        "condition": "antique_worn",
        "specialFeatures": "breakable_mechanism",
        "quantity": 3
      },
      "continuityNotes": "Need intact version, breaking version, and broken version"
    }
  ]
}
```

### Example 2: Coffee Shop Scene

**Input:**

```
INT. COFFEE SHOP - DAY

Emma sits at a table with a LATTE and a worn NOTEBOOK.
She flips through pages filled with sketches.
Marcus approaches with two COFFEE CUPS.

EMMA
(looking up from notebook)
You remembered.

Marcus sets down the cups and pulls out a FOLDED PHOTOGRAPH.
```

**Output:**

```json
{
  "props": [
    {
      "id": "prop_001",
      "name": "Worn Notebook",
      "category": "hero_prop",
      "significance": "high",
      "description": "Leather-bound notebook, filled with sketches",
      "firstAppearance": "Scene 1",
      "scenes": [1],
      "usage": [
        {
          "scene": 1,
          "action": "flipped_through",
          "emotionalWeight": "personal_history"
        }
      ],
      "requirements": {
        "type": "sketchbook",
        "condition": "well_used",
        "contents": "filled_with_artwork"
      }
    },
    {
      "id": "prop_002",
      "name": "Latte",
      "category": "hand_prop",
      "significance": "low",
      "description": "Coffee in ceramic cup",
      "firstAppearance": "Scene 1",
      "scenes": [1]
    },
    {
      "id": "prop_003",
      "name": "Folded Photograph",
      "category": "hero_prop",
      "significance": "high",
      "description": "Old photograph, folded, showing two people",
      "firstAppearance": "Scene 1",
      "scenes": [1],
      "usage": [
        {
          "scene": 1,
          "action": "revealed",
          "emotionalWeight": "revelation"
        }
      ]
    }
  ]
}
```

## Error Handling

- Returns empty array if no props found
- Flags props with unclear descriptions
- Warns about potential continuity issues
- Identifies props requiring special effects
