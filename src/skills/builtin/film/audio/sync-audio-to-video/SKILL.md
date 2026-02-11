---
name: sync-audio-to-video
version: '1.0.0'
author: sdkwork.com
description: Synchronize audio elements with video timing and lip movements. Use for ADR and audio post-production.
category: audio
license: Apache-2.0
compatibility: Works with audio-video sync systems
metadata:
  tags: sync audio video lip-sync ADR timing
---

# Sync Audio to Video

## Purpose

Create detailed synchronization specifications for aligning audio elements with video timing, including dialogue, effects, and music.

## When to Use

- ADR (Automated Dialogue Replacement)
- Sound effects timing
- Music scoring
- Lip-sync correction
- Audio post-production

## Inputs

- `video` (object, required): Video clip information
- `audioElements` (array, required): Audio to sync
- `syncType` (string, optional): 'lip_sync' | 'sound_effects' | 'music' (default: 'lip_sync')

## Outputs

```json
{
  "syncSpecification": {
    "videoDuration": "4.5_seconds",
    "frameRate": "24fps",
    "totalFrames": 108
  },
  "syncPoints": [
    {
      "type": "lip_sync",
      "time": "0:00:01:12",
      "frame": 36,
      "event": "M_sound_start",
      "audio": "Marcus",
      "video": "lip_closure_open"
    },
    {
      "type": "sound_effect",
      "time": "0:00:02:00",
      "frame": 48,
      "event": "cup_set_down",
      "audio": "ceramic_on_wood",
      "video": "cup_contact_table"
    }
  ],
  "lipSync": {
    "character": "Marcus",
    "dialogue": "Emma...",
    "phonemes": [
      {
        "sound": "EH",
        "frame": 36,
        "mouthShape": "open_mid"
      },
      {
        "sound": "M",
        "frame": 38,
        "mouthShape": "closed"
      },
      {
        "sound": "AH",
        "frame": 40,
        "mouthShape": "open_wide"
      }
    ]
  }
}
```

## Sync Types

- **Lip-sync**: Dialogue matching mouth movements
- **Sound effects**: SFX timing to actions
- **Music**: Score alignment with picture
- **Foley**: Movement sounds
- **ADR**: Replacement dialogue

## Instructions

1. Analyze video timing
2. Identify sync events
3. Map phonemes for dialogue
4. Time sound effects
5. Align music cues
6. Create sync points
7. Note tolerances
8. Provide technical specs

## Examples

### Example 1: Dialogue Sync

**Input:**

```
Video: Close-up of Marcus speaking
Dialogue: "Emma..."
Duration: 1.5 seconds
```

**Output:**

```json
{
  "syncSpecification": {
    "clip": "Scene_1_Marcus_CU",
    "duration": "1.5_seconds",
    "frameRate": "24fps",
    "totalFrames": 36,
    "startTimecode": "01:00:05:00"
  },
  "lipSync": {
    "character": "Marcus",
    "dialogue": "Emma...",
    "breakdown": [
      {
        "phoneme": "EH",
        "sound": "e_start",
        "frames": [0, 1, 2],
        "mouthShape": "open_mid_front",
        "jaw": "slight_drop",
        "lips": "relaxed"
      },
      {
        "phoneme": "M",
        "sound": "m_nasal",
        "frames": [3, 4],
        "mouthShape": "closed",
        "jaw": "neutral",
        "lips": "pressed_together"
      },
      {
        "phoneme": "AH",
        "sound": "a_open",
        "frames": [5, 6, 7, 8],
        "mouthShape": "open_wide",
        "jaw": "dropped",
        "lips": "relaxed_open"
      },
      {
        "phoneme": "pause",
        "sound": "ellipsis",
        "frames": [9, 10, 11],
        "mouthShape": "slight_close",
        "expression": "thoughtful_trail_off"
      }
    ],
    "performanceNotes": "Let the pause breathe. The ellipsis is as important as the name."
  },
  "syncPoints": [
    {
      "type": "audio_start",
      "frame": 0,
      "time": "00:00:00:00",
      "event": "inhale_before_speaking"
    },
    {
      "type": "vowel_start",
      "frame": 0,
      "time": "00:00:00:00",
      "event": "EH_sound",
      "priority": "critical"
    },
    {
      "type": "consonant",
      "frame": 3,
      "time": "00:00:00:03",
      "event": "M_closure",
      "priority": "high"
    },
    {
      "type": "vowel_peak",
      "frame": 5,
      "time": "00:00:00:05",
      "event": "AH_open",
      "priority": "critical"
    }
  ],
  "tolerances": {
    "lipSync": "2_frames",
    "soundEffects": "1_frame",
    "music": "4_frames"
  },
  "technical": {
    "sampleRate": "48kHz",
    "bitDepth": "24bit",
    "syncMethod": "timecode",
    "reference": "video_picture"
  }
}
```

### Example 2: Sound Effects Sync

**Input:**

```
Video: Door closing
Effect: Door slam
Time: 2.5 seconds in
```

**Output:**

```json
{
  "syncSpecification": {
    "event": "door_close",
    "videoTime": "00:00:02:12",
    "frame": 60
  },
  "syncPoints": [
    {
      "type": "impact",
      "frame": 60,
      "time": "00:00:02:12",
      "event": "door_contact_frame",
      "audio": "door_slam_impact",
      "priority": "critical",
      "tolerance": "1_frame"
    },
    {
      "type": "reverb_tail",
      "frame": 61,
      "time": "00:00:02:13",
      "event": "reverb_start",
      "audio": "room_reverb",
      "priority": "medium"
    }
  ]
}
```

## Error Handling

- Returns basic sync if video unclear
- Flags impossible sync requirements
- Warns about tight tolerances
- Suggests alternative timing
