---
name: generate-character-voice
version: '1.0.0'
author: sdkwork.com
description: Generate voice profile and characteristics for characters. Use for voice casting and audio direction.
category: audio
license: Apache-2.0
compatibility: Works with voice generation systems
metadata:
  tags: voice character audio casting profile
---

# Generate Character Voice

## Purpose

Create detailed voice profiles for characters including vocal characteristics, speech patterns, and emotional range for voice casting and direction.

## When to Use

- Voice actor casting
- Voice synthesis configuration
- Audio direction
- Character development
- Dubbing planning

## Inputs

- `character` (object, required): Character information
- `age` (number, optional): Character age
- `gender` (string, optional): Character gender
- `personality` (array, optional): Personality traits

## Outputs

```json
{
  "voiceProfile": {
    "pitch": "medium_low",
    "range": "octave_and_half",
    "timbre": "warm_resonant",
    "texture": "smooth_with_subtle_roughness",
    "ageSound": "30s_mature",
    "gender": "female"
  },
  "speechPatterns": {
    "pace": "measured_deliberate",
    "rhythm": "thoughtful_pauses",
    "emphasis": "emotional_words_stressed",
    "articulation": "clear_precise",
    "accent": "neutral_american",
    "dialect": "standard"
  },
  "emotionalRange": {
    "neutral": "calm_composed",
    "happy": "warm_genuine",
    "sad": "soft_vulnerable",
    "angry": "controlled_intensity",
    "fearful": "tight_restrained",
    "surprised": "breathless_wonder"
  },
  "castingNotes": "Seek voice actor with emotional depth, capable of subtle nuance",
  "synthesisParameters": {
    "basePitch": 180,
    "pitchVariation": 20,
    "speed": 0.95,
    "emotionIntensity": 0.7
  }
}
```

## Voice Characteristics

- **Pitch**: High, medium, low ranges
- **Timbre**: Quality and color of voice
- **Texture**: Smooth, rough, breathy
- **Range**: Vocal flexibility
- **Age**: Perceived age in voice

## Instructions

1. Analyze character profile
2. Determine vocal characteristics
3. Map speech patterns
4. Define emotional range
5. Note special qualities
6. Create casting description
7. Set synthesis parameters
8. Provide direction notes

## Examples

### Example 1: Protagonist Voice

**Input:**

```json
{
  "character": {
    "name": "Emma",
    "age": 28,
    "gender": "female",
    "traits": ["thoughtful", "vulnerable", "strong"]
  }
}
```

**Output:**

```json
{
  "voiceProfile": {
    "pitch": "medium",
    "range": "wide_expressive",
    "timbre": "warm_clear",
    "texture": "smooth_with_emotional_cracks",
    "ageSound": "late_20s_young_adult",
    "gender": "female",
    "distinctiveFeatures": ["slight_huskiness_when_emotional", "musical_quality"]
  },
  "speechPatterns": {
    "pace": "varies_with_emotion",
    "normal": "measured_thoughtful",
    "excited": "quicker_lighter",
    "upset": "slower_deliberate",
    "rhythm": "natural_conversational",
    "emphasis": "emotional_words",
    "articulation": "clear_educated",
    "accent": "neutral_with_subtle_regional",
    "vocabulary": "intelligent_accessible"
  },
  "emotionalRange": {
    "neutral": "warm_approachable",
    "happy": "bright_genuine_laugh",
    "sad": "soft_cracking_vulnerable",
    "angry": "controlled_firm",
    "fearful": "tight_quiet",
    "surprised": "breathless_wonder",
    "determined": "strong_resolute"
  },
  "sampleLines": [
    {
      "emotion": "nostalgic",
      "line": "It's really you...",
      "delivery": "soft_wondering_breathless"
    },
    {
      "emotion": "confrontational",
      "line": "You left without a word!",
      "delivery": "controlled_anger_building"
    }
  ],
  "castingNotes": "Seek actress with emotional range, capable of conveying vulnerability and strength. Voice should feel authentic and relatable.",
  "synthesisParameters": {
    "basePitch": 195,
    "pitchVariation": 25,
    "speed": 0.92,
    "emotionIntensity": 0.75,
    "clarity": 0.9
  }
}
```

### Example 2: Antagonist Voice

**Input:**

```json
{
  "character": {
    "name": "The Stranger",
    "age": 40,
    "gender": "male",
    "traits": ["mysterious", "threatening", "controlled"]
  }
}
```

**Output:**

```json
{
  "voiceProfile": {
    "pitch": "low",
    "range": "narrow_controlled",
    "timbre": "dark_resonant",
    "texture": "smooth_oily",
    "ageSound": "40s_mature",
    "gender": "male",
    "distinctiveFeatures": ["slight_echo_quality", "deliberate_pacing"]
  },
  "speechPatterns": {
    "pace": "very_slow_deliberate",
    "rhythm": "measured_threatening",
    "emphasis": "key_words_drawing_out",
    "articulation": "precise_calculated",
    "accent": "ambiguous_international",
    "tone": "controlled_menace"
  },
  "emotionalRange": {
    "neutral": "cold_observant",
    "threatening": "quiet_intense",
    "amused": "dark_dry",
    "angry": "controlled_explosive"
  },
  "castingNotes": "Voice actor with commanding presence, able to convey threat through restraint rather than volume. Distinctive voice preferred.",
  "synthesisParameters": {
    "basePitch": 110,
    "pitchVariation": 10,
    "speed": 0.85,
    "emotionIntensity": 0.6,
    "effects": ["subtle_reverb"]
  }
}
```

## Error Handling

- Returns basic profile if character unclear
- Flags conflicting characteristics
- Warns about synthesis limitations
- Suggests alternatives
