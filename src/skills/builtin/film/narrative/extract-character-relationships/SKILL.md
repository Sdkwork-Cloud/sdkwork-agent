---
name: extract-character-relationships
version: '1.0.0'
author: sdkwork.com
description: Map relationships between characters including dynamics, conflicts, and emotional arcs. Use to understand character interactions and story structure.
category: narrative
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: relationships dynamics conflicts interactions arcs
---

# Extract Character Relationships

## Purpose

Analyze script to identify and map all relationships between characters, including their dynamics, conflicts, and how they evolve throughout the story.

## When to Use

- Understanding character dynamics
- Planning relationship arcs
- Identifying conflicts and tensions
- Casting chemistry considerations
- Directing relationship scenes

## Inputs

- `script` (string, required): Full script content
- `characters` (array, optional): Pre-extracted character list
- `includeDynamics` (boolean, optional): Include relationship dynamics analysis (default: true)

## Outputs

```json
{
  "relationships": [
    {
      "id": "rel_001",
      "characterA": "ALEX",
      "characterB": "JORDAN",
      "type": "romantic",
      "subtype": "former_lovers",
      "status": "complicated",
      "dynamics": {
        "powerBalance": "equal",
        "emotionalIntensity": "high",
        "conflictLevel": "medium",
        "chemistry": "strong"
      },
      "arc": {
        "start": "estranged",
        "middle": "reconnecting",
        "end": "reconciled",
        "transformation": "from_pain_to_healing"
      },
      "keyScenes": [1, 3, 5, 8],
      "conflicts": [
        {
          "type": "misunderstanding",
          "cause": "past_breakup",
          "resolution": "Scene 8"
        }
      ],
      "emotions": ["love", "hurt", "hope", "fear"],
      "history": "Dated in college, separated 5 years ago"
    }
  ],
  "relationshipMap": {
    "ALEX": ["JORDAN", "MOTHER"],
    "JORDAN": ["ALEX", "BEST_FRIEND"],
    "MOTHER": ["ALEX"]
  },
  "dynamicsSummary": {
    "totalRelationships": 4,
    "romantic": 1,
    "familial": 1,
    "friendship": 1,
    "professional": 1
  }
}
```

## Relationship Types

- **romantic**: Love interests, couples, former partners
- **familial**: Parent-child, siblings, extended family
- **friendship**: Close friends, acquaintances
- **professional**: Colleagues, boss-employee, mentor-student
- **antagonistic**: Enemies, rivals, opponents
- **complex**: Multi-faceted relationships

## Instructions

1. Identify all character pairs with interactions
2. Analyze dialogue for relationship cues
3. Determine relationship type and status
4. Map emotional dynamics and power balance
5. Track relationship arc through story
6. Identify key scenes for each relationship
7. Extract conflicts and resolutions
8. Build relationship network map

## Examples

### Example 1: Romance Reunion

**Input:**

```
Scene 1: Alex and Jordan meet after 5 years
Scene 3: They argue about the past breakup
Scene 5: Jordan reveals the truth
Scene 8: They reconcile
```

**Output:**

```json
{
  "relationships": [
    {
      "id": "rel_001",
      "characterA": "ALEX",
      "characterB": "JORDAN",
      "type": "romantic",
      "subtype": "former_lovers_reconnecting",
      "status": "evolving",
      "dynamics": {
        "powerBalance": "shifting",
        "emotionalIntensity": "very_high",
        "conflictLevel": "high_then_resolved",
        "chemistry": "undeniable"
      },
      "arc": {
        "start": "hurt_and_guarded",
        "middle": "confronting_pain",
        "end": "forgiveness_and_hope",
        "transformation": "broken_to_healed"
      },
      "keyScenes": [1, 3, 5, 8],
      "conflicts": [
        {
          "type": "betrayal_misunderstanding",
          "cause": "miscommunication_5_years_ago",
          "peak": "Scene 3",
          "resolution": "Scene 5_revelation"
        }
      ],
      "emotions": ["love", "hurt", "anger", "regret", "hope", "forgiveness"],
      "history": "College sweethearts, painful breakup, 5 years apart"
    }
  ]
}
```

### Example 2: Family Drama

**Input:**

```
Scene 2: Sarah argues with her mother about career
Scene 4: Mother reveals health issues
Scene 6: Sarah chooses family over promotion
Scene 9: They make peace
```

**Output:**

```json
{
  "relationships": [
    {
      "id": "rel_001",
      "characterA": "SARAH",
      "characterB": "MOTHER",
      "type": "familial",
      "subtype": "mother_daughter",
      "status": "strained_then_repaired",
      "dynamics": {
        "powerBalance": "shifts_from_mother_to_equal",
        "emotionalIntensity": "high",
        "conflictLevel": "medium",
        "chemistry": "deep_love_masked_by_tension"
      },
      "arc": {
        "start": "conflict_and_distance",
        "middle": "crisis_brings_clarity",
        "end": "acceptance_and_appreciation",
        "transformation": "resentment_to_gratitude"
      },
      "keyScenes": [2, 4, 6, 9],
      "conflicts": [
        {
          "type": "generational_expectations",
          "cause": "career_vs_family_expectations",
          "peak": "Scene 2",
          "resolution": "Scene 6_sacrifice"
        }
      ],
      "emotions": ["love", "frustration", "worry", "guilt", "pride", "gratitude"],
      "history": "Traditional mother, ambitious daughter, ongoing tension"
    }
  ]
}
```

## Error Handling

- Returns empty relationships if insufficient interaction
- Flags isolated characters with no relationships
- Warns about one-sided relationships
- Identifies potential relationship inconsistencies
