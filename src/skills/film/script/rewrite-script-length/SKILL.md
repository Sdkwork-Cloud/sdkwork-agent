---
name: rewrite-script-length
description: Expand or condense script to target duration while maintaining story integrity. Use for adapting scripts to time constraints.
license: Apache-2.0
compatibility: Works with standard screenplay formats
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: rewrite length duration expand condense edit
---

# Rewrite Script Length

## Purpose

Adjust script length to meet specific duration requirements by expanding or condensing content.

## When to Use

- Meeting platform time limits
- Adapting to slot requirements
- Expanding shorts to longer form
- Condensing features to shorts
- Creating multiple versions

## Inputs

- `script` (string, required): Original script
- `targetDuration` (string, required): Target duration (e.g., "3 minutes")
- `strategy` (string, optional): "expand" | "condense" | "auto"
- `priorities` (array, optional): Elements to prioritize (dialogue/action/emotion)

## Outputs

```json
{
  "rewrittenScript": "Length-adjusted script...",
  "originalStats": {
    "duration": "5.2 minutes",
    "pages": 5,
    "scenes": 8,
    "wordCount": 850
  },
  "newStats": {
    "duration": "3.0 minutes",
    "pages": 3,
    "scenes": 5,
    "wordCount": 520
  },
  "changes": [
    {
      "type": "removed",
      "element": "Scene 3 - Secondary conversation",
      "impact": "low"
    },
    {
      "type": "condensed",
      "element": "Scene 5 - Extended argument",
      "originalLines": 25,
      "newLines": 12
    },
    {
      "type": "trimmed",
      "element": "Action descriptions throughout",
      "savings": "30 seconds"
    }
  ],
  "preserved": ["Opening scene", "Inciting incident", "Climax", "Resolution"]
}
```

## Condensing Strategies

### 1. Scene Consolidation

- Merge adjacent scenes with same location
- Remove transitional scenes
- Combine minor characters

### 2. Dialogue Trimming

- Cut redundant lines
- Remove filler words
- Get to the point faster
- Use subtext over exposition

### 3. Description Reduction

- Tighten action paragraphs
- Focus on essential visuals
- Remove atmospheric padding

### 4. Pacing Acceleration

- Jump into scenes later
- Exit scenes earlier
- Use transitions (CUT TO, SMASH CUT)

## Expanding Strategies

### 1. Scene Addition

- Add transitional scenes
- Expand off-screen moments
- Deepen subplots

### 2. Dialogue Enrichment

- Add subtext layers
- Include pauses and reactions
- Expand emotional beats

### 3. Description Enhancement

- Add sensory details
- Expand visual storytelling
- Include character internal states

### 4. Pacing Deceleration

- Enter scenes earlier
- Linger on emotional moments
- Add breathing room

## Instructions

### For Condensing:

1. Calculate required reduction percentage
2. Identify essential vs. optional scenes
3. Remove or merge non-essential scenes
4. Trim dialogue to core meaning
5. Tighten action descriptions
6. Accelerate scene pacing
7. Verify plot coherence
8. Check emotional impact

### For Expanding:

1. Calculate required expansion percentage
2. Identify moments needing depth
3. Add transitional scenes
4. Enrich dialogue and subtext
5. Expand visual descriptions
6. Deepen character moments
7. Maintain pacing balance
8. Verify engagement

## Examples

### Example 1: Condense 5min to 3min

**Original Scene (45 seconds):**

```
INT. COFFEE SHOP - DAY

Alex enters the warm coffee shop. The afternoon sun streams
through large windows. He takes a moment to look around,
adjusting his coat. He notices the menu board above the
counter. He walks toward the line, checking his phone. He
waits patiently, looking at the pastries in the display
case. Finally, he reaches the front and looks up.

He freezes. His face changes. There, behind the counter,
is Jordan.

                    ALEX
          Jordan?

                    JORDAN
          Alex. Wow. Hi.

They stare at each other. The moment stretches. Other
customers move around them but they don't notice.

                    ALEX
          I didn't know you worked here.

                    JORDAN
          I own it, actually. Well, co-own.

                    ALEX
          That's... that's great. Really.

More silence. Awkward but also something else. Something
that used to be there.
```

**Condensed (20 seconds):**

```
INT. COFFEE SHOP - DAY

Alex enters, joins the line. He looks up at the menu and
FREEZES. Jordan stands behind the counter.

                    ALEX
          Jordan?

                    JORDAN
          Alex. Wow.

A beat. The weight of history between them.

                    JORDAN (CONT'D)
          I own the place now. Co-own.

                    ALEX
          That's great. Really great.
```

### Example 2: Expand 2min to 5min

**Original (Brief):**

```
They argue. Alex leaves angry. Jordan cries.
```

**Expanded:**

```
The argument builds slowly, then explodes.

                    ALEX
          You never believed in me!

                    JORDAN
          I believed in you! I just didn't
          believe in us becoming this!

                    ALEX
          What? Successful?

                    JORDAN
          Cold! Ambitious! Someone who'd
          choose a promotion over...

Jordan stops. Tears in his eyes.

                    JORDAN (CONT'D)
          Over us.

Silence. Alex's anger deflates.

                    ALEX
          (quiet)
          I thought you'd be proud.

Jordan shakes his head, turns away.

                    JORDAN
          I was. I was so proud. Until I
          realized I wasn't part of your
          future anymore. Just your past.

Alex reaches out, but Jordan moves away.

                    JORDAN (CONT'D)
          I can't do this again, Alex. I
          can't be your history lesson.

Jordan exits to the back room. Alex stands alone, hand
still outstretched. He lets it drop.

He walks out. The door chimes. Jordan watches from the
back, tears falling freely now.
```

## Length Guidelines

| Target | Approach          | Typical Changes                     |
| ------ | ----------------- | ----------------------------------- |
| -50%   | Heavy condense    | Remove scenes, trim dialogue        |
| -25%   | Moderate condense | Trim descriptions, tighten dialogue |
| +25%   | Moderate expand   | Add descriptions, enrich dialogue   |
| +50%   | Heavy expand      | Add scenes, deepen subplots         |
| +100%  | Major expansion   | New subplots, additional acts       |
