---
name: annotate-shot-emotions
version: '1.0.0'
author: sdkwork.com
description: Annotate shots with emotional beats and performance direction. Use for actor preparation and directing guidance.
category: scene
license: Apache-2.0
compatibility: Works with any script format
metadata:
  tags: emotions performance directing actors beats
---

# Annotate Shot Emotions

## Purpose

Add emotional annotations and performance direction to shots, helping actors and directors understand the emotional beats and character intentions.

## When to Use

- Actor preparation and rehearsals
- Director's shot planning
- Performance notes
- Emotional continuity tracking
- Character development guidance

## Inputs

- `shot` (object, required): Shot information
- `character` (string, required): Character to analyze
- `context` (object, optional): Scene context and previous scenes

## Outputs

```json
{
  "shot": {
    "number": 3,
    "type": "close_up"
  },
  "emotionalAnnotations": {
    "primaryEmotion": "bittersweet_nostalgia",
    "intensity": 7,
    "subEmotions": ["hope", "fear", "regret"],
    "emotionalArc": "rising_to_peak",
    "beat": "recognition_moment"
  },
  "performanceDirection": {
    "objective": "Convey years of unspoken feelings",
    "action": "Search his face for the boy she once knew",
    "obstacle": "Fear of being hurt again",
    "tactics": [
      "Start with tentative hope",
      "Let pain flicker across face",
      "End with guarded openness"
    ],
    "physicality": {
      "posture": "slightly_defensive",
      "breathing": "shallow_nervous",
      "eyes": "searching_then_softening",
      "hands": "clenched_then_releasing"
    }
  },
  "dialogueNotes": {
    "line": "It's really you...",
    "subtext": "I've dreamed of this moment",
    "delivery": "soft_wondering",
    "pace": "slow_deliberate",
    "emphasis": ["really", "you"]
  },
  "blocking": {
    "movement": "lean_in_slightly",
    "spatialRelationship": "intimate_distance",
    "eyeLine": "direct_then_away_then_back"
  },
  "continuity": {
    "fromPrevious": "guarded_approach",
    "toNext": "vulnerable_openness",
    "emotionalState": "transitioning"
  }
}
```

## Emotional Elements

- **Primary Emotion**: Dominant feeling
- **Intensity**: Scale 1-10
- **Sub-emotions**: Underlying feelings
- **Arc**: Rising, falling, steady
- **Beat**: Story moment type

## Performance Direction

- **Objective**: Character's goal
- **Action**: What they're doing
- **Obstacle**: What's in the way
- **Tactics**: How they try
- **Physicality**: Body expression

## Instructions

1. Analyze shot context in scene
2. Identify primary emotion
3. Determine emotional intensity
4. Define character objective
5. Plan physical expression
6. Note dialogue subtext
7. Plan blocking and movement
8. Ensure emotional continuity

## Examples

### Example 1: Reunion Recognition

**Input:**

```
Shot: Close-up Emma
Context: First seeing Marcus after 5 years
Line: "It's really you..."
```

**Output:**

```json
{
  "shot": {
    "number": 3,
    "type": "close_up",
    "description": "Emma recognizes Marcus"
  },
  "emotionalAnnotations": {
    "primaryEmotion": "bittersweet_wonder",
    "intensity": 8,
    "subEmotions": ["relief", "fear", "love", "pain"],
    "emotionalArc": "shock_to_wonder",
    "beat": "recognition_climax"
  },
  "performanceDirection": {
    "objective": "Acknowledge the impossible - he's really here",
    "action": "Drink in his presence while guarding her heart",
    "obstacle": "Years of hurt and the fear of reopening wounds",
    "tactics": [
      "Initial shock - freeze",
      "Eyes search his face for changes",
      "Soft smile breaks through despite herself",
      "Catch herself, rebuild walls slightly"
    ],
    "physicality": {
      "posture": "initially_frozen_then_leans_in",
      "breathing": "catches_breath_then_shallow",
      "eyes": "wide_wonder_then_searching",
      "mouth": "slight_tremble_then_controlled_smile",
      "hands": "clench_then_release_at_sides"
    }
  },
  "dialogueNotes": {
    "line": "It's really you...",
    "subtext": "After all this time, all my dreams, you're actually here",
    "delivery": "breathless_wonder",
    "pace": "slow_awestruck",
    "emphasis": ["really"],
    "tone": "disbelief_mixed_with_hope"
  },
  "blocking": {
    "movement": "lean_in_2_inches_then_catch_herself",
    "spatialRelationship": "intimate_but_guarded",
    "eyeLine": "hold_gaze_then_glance_away_then_back"
  },
  "continuity": {
    "fromPrevious": "approaching_with_trepidation",
    "toNext": "guarded_but_hopeful_conversation",
    "emotionalState": "peak_vulnerability"
  },
  "notes": "This is the emotional anchor of the scene. Allow time for the moment to land."
}
```

### Example 2: Argument Peak

**Input:**

```
Shot: Medium two-shot
Context: Emma confronts Marcus about the past
Line: "You left without a word!"
```

**Output:**

```json
{
  "shot": {
    "number": 5,
    "type": "medium_two_shot"
  },
  "emotionalAnnotations": {
    "primaryEmotion": "righteous_anger",
    "intensity": 9,
    "subEmotions": ["hurt", "betrayal", "abandonment"],
    "emotionalArc": "building_to_explosion",
    "beat": "confrontation_peak"
  },
  "performanceDirection": {
    "objective": "Make him feel the pain he caused",
    "action": "Attack with words while fighting tears",
    "obstacle": "Fear of showing how much she still cares",
    "tactics": [
      "Build energy through the line",
      "Use anger to mask hurt",
      "Challenge him to defend himself",
      "Don't back down"
    ],
    "physicality": {
      "posture": "confrontational_forward",
      "gestures": "pointing_accusing",
      "voice": "controlled_then_rising",
      "eyes": "fierce_then_glistening",
      "breathing": "rapid_angry"
    }
  },
  "dialogueNotes": {
    "line": "You left without a word!",
    "subtext": "Do you know what you did to me? The years of wondering?",
    "delivery": "controlled_anger_exploding",
    "pace": "measured_then_accusatory",
    "emphasis": ["left", "word"],
    "volume": "starts_normal_ends_loud"
  },
  "blocking": {
    "movement": "step_forward_invading_space",
    "spatialRelationship": "confrontational_close",
    "gesture": "points_at_his_chest"
  },
  "notes": "High emotional stakes. Ensure safety and support for actors."
}
```

## Error Handling

- Returns basic annotations if context unclear
- Flags emotionally demanding scenes
- Warns about continuity breaks
- Suggests rehearsal time
