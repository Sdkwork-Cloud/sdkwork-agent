---
name: generate-dialogue-audio
version: '1.0.0'
author: sdkwork.com
description: Generate audio direction and voice synthesis prompts for dialogue. Use for voice recording and AI voice generation.
category: audio
license: Apache-2.0
compatibility: Works with voice synthesis and recording systems
metadata:
  tags: dialogue audio voice synthesis recording direction
---

# Generate Dialogue Audio

## Purpose

Create detailed audio direction for dialogue recording, including emotional delivery, timing, and technical specifications for voice synthesis or live recording.

## When to Use

- Voice recording sessions
- AI voice generation
- ADR (Automated Dialogue Replacement)
- Dubbing direction
- Audio post-production

## Inputs

- `dialogue` (string, required): Dialogue line or scene
- `character` (object, required): Character voice profile
- `context` (object, optional): Scene context and emotion

## Outputs

```json
{
  "line": "It's really you...",
  "audioDirection": {
    "emotion": "nostalgic_wonder",
    "intensity": 7,
    "pace": "slow_awestruck",
    "volume": "soft_intimate",
    "tone": "breathless_wondering",
    "subtext": "After all these years, I can't believe you're here"
  },
  "technical": {
    "pitch": "slight_rise_on_you",
    "speed": 0.85,
    "pauses": [
      {
        "after": "really",
        "duration": "0.5s",
        "type": "breath_catch"
      }
    ],
    "emphasis": ["really", "you"],
    "breathing": "audible_catch_before_line"
  },
  "performance": {
    "objective": "Convey disbelief mixed with hope",
    "action": "Let the years of longing color the words",
    "physicality": "softened_expression, searching_eyes",
    "deliveryNotes": "Start soft, let wonder build, end on breathless hope"
  },
  "synthesisPrompt": "Soft breathless voice, nostalgic emotional tone, slight pause after 'really', wonder and vulnerability, intimate speaking volume"
}
```

## Audio Elements

- **Emotion**: Primary feeling
- **Pace**: Speed of delivery
- **Volume**: Loudness level
- **Tone**: Quality of voice
- **Pitch**: Vocal frequency
- **Pauses**: Breaks in speech

## Instructions

1. Analyze dialogue and context
2. Determine emotional core
3. Plan pacing and timing
4. Note technical requirements
5. Describe physical performance
6. Create synthesis prompt
7. Mark emphasis points
8. Provide direction notes

## Examples

### Example 1: Emotional Reunion

**Input:**

```
Dialogue: "It's really you..."
Context: First seeing someone after 5 years
Character: Emma, emotional, vulnerable
```

**Output:**

```json
{
  "line": "It's really you...",
  "audioDirection": {
    "primaryEmotion": "nostalgic_wonder",
    "secondaryEmotions": ["relief", "fear", "hope"],
    "intensity": 8,
    "arc": "breathless_to_wonder",
    "pace": "very_slow",
    "volume": "soft_almost_whisper",
    "tone": "breathless_awestruck",
    "subtext": "All my dreams, all my fears, and here you are",
    "undercurrent": "Can I trust this moment?"
  },
  "technical": {
    "pitch": {
      "start": "normal",
      "middle": "slight_rise",
      "end": "soft_fall"
    },
    "speed": 0.8,
    "pauses": [
      {
        "after": "It's",
        "duration": "0.3s",
        "type": "breath_catch"
      },
      {
        "after": "really",
        "duration": "0.6s",
        "type": "emotional_processing"
      }
    ],
    "emphasis": {
      "primary": "really",
      "secondary": "you",
      "technique": "slight_lengthening"
    },
    "breathing": "audible_sharp_intake_before_line",
    "vibrato": "slight_on_final_word"
  },
  "performance": {
    "objective": "Show years of longing in three words",
    "action": "Search his face while speaking",
    "innerLife": "Memories flooding back, heart racing",
    "physicality": "eyes_widening, slight_lean_forward",
    "deliveryNotes": "Let the silence speak. The pause is as important as the words."
  },
  "synthesisPrompt": "Soft emotional female voice, breathless quality, nostalgic wonder, intimate volume, slight tremor on 'you', 80% speed, emotional intensity 0.8",
  "recordingNotes": "Allow actor to find the moment. May need multiple takes to capture the breathless quality."
}
```

### Example 2: Confrontation

**Input:**

```
Dialogue: "You left without a word!"
Context: Angry confrontation about past
Character: Emma, hurt and angry
```

**Output:**

```json
{
  "line": "You left without a word!",
  "audioDirection": {
    "primaryEmotion": "controlled_anger",
    "secondaryEmotions": ["hurt", "betrayal", "abandonment"],
    "intensity": 9,
    "arc": "controlled_to_explosive",
    "pace": "measured_then_accelerating",
    "volume": "starts_normal_ends_loud",
    "tone": "firm_accusatory",
    "subtext": "Do you know what you did to me?"
  },
  "technical": {
    "pitch": {
      "start": "controlled_lower",
      "middle": "rising_anger",
      "end": "peak_accusation"
    },
    "speed": {
      "start": 0.9,
      "end": 1.1
    },
    "pauses": [],
    "emphasis": {
      "primary": ["left", "word"],
      "technique": "forceful_attack"
    },
    "breathing": "sharp_intake_before",
    "volume": {
      "start": "medium",
      "peak": "loud",
      "technique": "crescendo"
    }
  },
  "performance": {
    "objective": "Make him feel the pain",
    "action": "Attack with words",
    "innerLife": "Years of hurt boiling over",
    "physicality": "pointing_accusing, forward_lean",
    "deliveryNotes": "Control the anger - let it build, don't start at maximum"
  },
  "synthesisPrompt": "Female voice building anger, controlled to forceful, accusatory tone, crescendo volume, emphasis on 'left' and 'word', emotional intensity 0.9"
}
```

## Error Handling

- Returns basic direction if context unclear
- Flags impossible vocal ranges
- Warns about synthesis limitations
- Suggests alternative approaches
