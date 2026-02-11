---
name: generate-sound-effects
version: '1.0.0'
author: sdkwork.com
description: Generate sound effect requirements and design for scenes. Use for sound design and audio post-production.
category: audio
license: Apache-2.0
compatibility: Works with sound design systems
metadata:
  tags: sound effects SFX audio design foley
---

# Generate Sound Effects

## Purpose

Create detailed sound effect requirements and design specifications for scenes, including ambient sounds, Foley, and special effects.

## When to Use

- Sound design planning
- Foley recording sessions
- Sound effect libraries
- Audio post-production
- World-building through sound

## Inputs

- `scene` (object, required): Scene description
- `location` (string, required): Location type
- `action` (string, required): Key actions in scene

## Outputs

```json
{
  "soundDesign": {
    "ambience": {
      "base": "coffee_shop_interior",
      "elements": ["murmured_conversations", "espresso_machine", "gentle_music_background"],
      "volume": "low_to_medium",
      "character": "warm_intimate"
    },
    "foley": [
      {
        "action": "door_opens",
        "sound": "cafe_door_bell_chime",
        "timing": "0:03",
        "volume": "medium"
      },
      {
        "action": "footsteps",
        "sound": "heels_on_wood_floor",
        "timing": "0:04-0:08",
        "volume": "medium"
      },
      {
        "action": "chair_scrape",
        "sound": "wood_chair_floor",
        "timing": "0:15",
        "volume": "medium"
      }
    ],
    "spotEffects": [
      {
        "description": "coffee_cup_set_down",
        "timing": "0:22",
        "volume": "quiet"
      }
    ]
  },
  "technical": {
    "sampleRate": "48kHz",
    "bitDepth": "24bit",
    "format": "WAV"
  }
}
```

## Sound Categories

- **Ambience**: Background environment
- **Foley**: Character movement sounds
- **Spot Effects**: Specific sound events
- **Design Elements**: Stylized sounds
- **Music**: Score and source music

## Instructions

1. Analyze scene location
2. Identify ambient sounds
3. Map character actions
4. Plan Foley requirements
5. Note special effects
6. Determine timing
7. Set volume levels
8. Create sound list

## Examples

### Example 1: Coffee Shop Scene

**Input:**

```
Scene: Coffee shop reunion
Location: Cozy cafe
Actions: ["enter", "walk", "sit", "talk"]
```

**Output:**

```json
{
  "soundDesign": {
    "ambience": {
      "layer1": {
        "type": "base_room_tone",
        "sound": "coffee_shop_interior_hum",
        "character": "warm_acoustic",
        "volume": "-20dB"
      },
      "layer2": {
        "type": "activity",
        "sounds": [
          "distant_murmured_conversations",
          "espresso_machine_steam",
          "milk_frother",
          "gentle_clinking_cups"
        ],
        "volume": "-25dB",
        "spatial": "surround_360"
      },
      "layer3": {
        "type": "atmosphere",
        "sound": "soft_jazz_background_music",
        "volume": "-30dB",
        "character": "warm_intimate"
      }
    },
    "foley": [
      {
        "cue": "Door entry",
        "time": "0:02",
        "sounds": [
          {
            "type": "door_open",
            "sound": "wood_door_with_bell",
            "volume": "-15dB"
          },
          {
            "type": "footsteps",
            "sound": "heels_wood_floor_approach",
            "duration": "4s",
            "volume": "-18dB"
          }
        ]
      },
      {
        "cue": "Sitting",
        "time": "0:08",
        "sounds": [
          {
            "type": "chair",
            "sound": "wood_chair_scrape_floor",
            "volume": "-16dB"
          },
          {
            "type": "clothing",
            "sound": "fabric_seat_rustle",
            "volume": "-25dB"
          }
        ]
      },
      {
        "cue": "Handbag",
        "time": "0:10",
        "sound": "leather_bag_set_down",
        "volume": "-20dB"
      },
      {
        "cue": "Coffee interaction",
        "time": "0:25",
        "sounds": [
          {
            "type": "cup",
            "sound": "ceramic_cup_saucer",
            "volume": "-22dB"
          },
          {
            "type": "liquid",
            "sound": "coffee_pour_light",
            "volume": "-24dB"
          }
        ]
      }
    ],
    "spotEffects": [
      {
        "cue": "Phone buzz",
        "time": "0:45",
        "sound": "phone_vibrate_table",
        "volume": "-20dB",
        "notes": "Brief, ignored by characters"
      }
    ],
    "designElements": [
      {
        "purpose": "Emotional emphasis",
        "time": "1:30",
        "sound": "subtle_string_harmonics",
        "volume": "-35dB",
        "notes": "Under dialogue, emotional moment"
      }
    ]
  },
  "technicalSpecs": {
    "sampleRate": "48kHz",
    "bitDepth": "24bit",
    "format": "WAV",
    "channels": "stereo_ambience_mono_spot"
  },
  "mixNotes": [
    "Keep ambience present but not distracting",
    "Foley should feel natural, not exaggerated",
    "Avoid competing with dialogue frequencies",
    "Warm EQ on room tone"
  ]
}
```

### Example 2: Suspense Scene

**Input:**

```
Scene: Walking alone at night
Location: Empty street
Actions: ["footsteps", "looking around", "door"]
```

**Output:**

```json
{
  "soundDesign": {
    "ambience": {
      "base": "urban_night_atmosphere",
      "elements": ["distant_traffic_hum", "occasional_dog_bark", "wind_through_buildings"],
      "character": "isolated_ominous"
    },
    "foley": [
      {
        "action": "footsteps",
        "sound": "heels_concrete_echo",
        "character": "lonely_reverberant"
      }
    ],
    "designElements": [
      {
        "type": "subtle_tension",
        "sound": "low_frequency_rumble",
        "volume": "very_low"
      }
    ]
  }
}
```

## Error Handling

- Returns basic design if scene unclear
- Flags missing critical sounds
- Warns about frequency conflicts
- Suggests alternatives
