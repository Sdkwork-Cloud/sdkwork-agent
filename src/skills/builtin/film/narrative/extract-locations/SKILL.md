---
name: extract-locations
version: '1.0.0'
author: sdkwork.com
description: Extract and catalog all locations mentioned in script with descriptions and requirements. Use for location scouting and production planning.
category: narrative
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: locations settings places scenes environments
---

# Extract Locations

## Purpose

Identify and catalog all locations, settings, and environments mentioned in the script for production planning and location scouting.

## When to Use

- Location scouting and selection
- Set design and construction planning
- Budget estimation for locations
- Scheduling based on location availability
- Permit and logistics planning

## Inputs

- `script` (string, required): Full script content
- `includeInteriorExterior` (boolean, optional): Separate interior/exterior counts (default: true)
- `detailLevel` (string, optional): 'basic' | 'detailed' | 'comprehensive' (default: 'detailed')

## Outputs

```json
{
  "locations": [
    {
      "id": "loc_001",
      "name": "Coffee Shop",
      "type": "interior",
      "description": "Cozy neighborhood cafe, warm lighting, vintage decor",
      "scenes": [1, 3, 7],
      "sceneCount": 3,
      "requirements": {
        "size": "medium",
        "features": ["counter", "tables", "window_seating", "kitchen_visible"],
        "atmosphere": "warm_inviting",
        "lighting": "natural_plus_warm_artificial"
      },
      "timeOfDay": ["day", "evening"],
      "characters": ["EMMA", "MARCUS", "BARISTA"],
      "props": ["coffee_cups", "tables", "chairs", "menu_board"],
      "notes": "Needs to accommodate 3-4 actors, visible street through window"
    }
  ],
  "summary": {
    "totalLocations": 5,
    "interior": 3,
    "exterior": 2,
    "interiorExterior": 0,
    "primaryLocation": "Coffee Shop",
    "mostScenes": "Coffee Shop (3 scenes)"
  },
  "byScene": {
    "Scene 1": {
      "location": "Coffee Shop",
      "type": "interior",
      "time": "day"
    }
  }
}
```

## Location Types

- **interior**: Indoor locations
- **exterior**: Outdoor locations
- **interior_exterior**: Both (e.g., house with yard)
- **vehicle**: Cars, buses, etc.
- **stage**: Theatrical or constructed sets
- **virtual**: CGI or virtual environments

## Instructions

1. Parse scene headings for location names
2. Extract descriptions from action lines
3. Identify INT/EXT and time of day
4. Map characters to locations
5. List required features and props
6. Calculate scene counts per location
7. Determine primary vs. secondary locations
8. Note special requirements or constraints

## Examples

### Example 1: Urban Drama

**Input:**

```
INT. COFFEE SHOP - DAY

Emma works behind the counter...

EXT. CITY STREET - NIGHT

Marcus walks alone in the rain...

INT. EMMA'S APARTMENT - NIGHT

Small studio, art everywhere...
```

**Output:**

```json
{
  "locations": [
    {
      "id": "loc_001",
      "name": "Coffee Shop",
      "type": "interior",
      "description": "Neighborhood cafe, counter service, seating area",
      "scenes": [1],
      "sceneCount": 1,
      "requirements": {
        "size": "medium",
        "features": ["counter", "seating", "kitchen_area"],
        "atmosphere": "casual_urban"
      },
      "timeOfDay": ["day"],
      "characters": ["EMMA"]
    },
    {
      "id": "loc_002",
      "name": "City Street",
      "type": "exterior",
      "description": "Urban street, wet from rain, city lights",
      "scenes": [2],
      "sceneCount": 1,
      "requirements": {
        "features": ["sidewalk", "street_lights", "buildings"],
        "atmosphere": "moody_urban",
        "weather": "rainy"
      },
      "timeOfDay": ["night"],
      "characters": ["MARCUS"]
    },
    {
      "id": "loc_003",
      "name": "Emma's Apartment",
      "type": "interior",
      "description": "Small studio apartment, artistic decor",
      "scenes": [3],
      "sceneCount": 1,
      "requirements": {
        "size": "small",
        "features": ["bed", "art_supplies", "window"],
        "atmosphere": "cozy_artistic"
      },
      "timeOfDay": ["night"],
      "characters": ["EMMA"]
    }
  ],
  "summary": {
    "totalLocations": 3,
    "interior": 2,
    "exterior": 1
  }
}
```

## Error Handling

- Returns empty array if no locations found
- Flags vague location descriptions
- Warns about locations with many scenes (scheduling concern)
- Identifies potential location duplicates
