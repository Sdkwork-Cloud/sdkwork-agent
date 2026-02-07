---
name: rewrite-script-style
description: Rewrite existing script with different tone, style, or genre while maintaining plot structure. Use for creating variations or adapting scripts.
license: Apache-2.0
compatibility: Works with standard screenplay formats
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: rewrite style tone genre adapt variation
---

# Rewrite Script Style

## Purpose

Transform an existing script's tone, style, or genre while preserving the core plot and structure.

## When to Use

- Creating genre variations
- Adjusting tone for different audiences
- Adapting scripts for platforms
- Creating comedic/dramatic versions
- Localization with cultural adaptation

## Inputs

- `script` (string, required): Original script content
- `targetStyle` (object, required):
  - `tone` (string): Target tone (comedic/dramatic/horror/etc.)
  - `genre` (string, optional): Target genre
  - `style` (string, optional): Writing style (naturalistic/stylized/poetic)
- `preserve` (array, optional): Elements to preserve (plot/characters/dialogue)

## Outputs

```json
{
  "rewrittenScript": "New styled script text...",
  "changes": {
    "dialogue": "modernized",
    "descriptions": "more_visual",
    "pacing": "faster",
    "tone": "shifted_from_dramatic_to_comedic"
  },
  "comparison": {
    "original": "ALEX: I cannot believe you did that.",
    "rewritten": "ALEX: You did WHAT? Are you kidding me?"
  },
  "preserved": ["plot_structure", "character_arcs"],
  "modified": ["dialogue_tone", "scene_descriptions", "pacing"]
}
```

## Style Transformations

### Tone Shifts

- **Dramatic → Comedic**: Add irony, exaggerate reactions, witty dialogue
- **Comedic → Dramatic**: Ground humor, add emotional weight
- **Romantic → Thriller**: Add tension, suspicion, danger
- **Modern → Period**: Adjust language, references, formality

### Genre Adaptations

- **Romance → Horror**: Same meet-cute, sinister undertones
- **Drama → Comedy**: Same conflicts, humorous handling
- **Thriller → Romance**: Same tension, romantic resolution

## Instructions

1. Analyze original script structure
2. Identify core plot points to preserve
3. Determine style transformation rules
4. Rewrite dialogue with new tone
5. Adjust action descriptions
6. Modify pacing as needed
7. Ensure character consistency
8. Review for plot integrity
9. Format properly
10. Generate comparison highlights

## Examples

### Example 1: Dramatic to Comedic

**Original:**

```
INT. COFFEE SHOP - DAY

Alex enters. He sees Jordan and freezes. Pain crosses his face.

                    ALEX
          (quietly)
          Jordan. I didn't expect to see you.

                    JORDAN
          (guarded)
          Alex. It's been a long time.

They stand in uncomfortable silence.
```

**Rewritten (Comedic):**

```
INT. COFFEE SHOP - DAY

Alex BURSTS through the door, coffee splashing everywhere.
He FREEZES. Jordan waves from behind the counter like this
is totally normal.

                    ALEX
          (spitting coffee)
          Jordan?! Of all the coffee shops in
          all the world...

                    JORDAN
          (grinning)
          You had to walk into mine. Yeah, I
          know. I saw that movie too.

Alex tries to wipe coffee off his expensive suit. Fails.

                    ALEX
          I'm... this isn't... I'm usually
          more coordinated.

                    JORDAN
          Clearly. What'll it be? And please,
          no more entrances. I just mopped.
```

### Example 2: Modern to 1940s Noir

**Original:**

```
SARAH checks her phone. A text from an unknown number.

                    SARAH
          Who is this?
```

**Rewritten (Noir):**

```
SARAH pulls a folded telegram from her purse. Her gloved
fingers tremble as she reads.

                    SARAH
          (voice low, dangerous)
          Who sent this?

She looks around the dim bar. Shadows everywhere. Anyone
could be watching.
```

## Transformation Options

| Aspect          | Options                                 |
| --------------- | --------------------------------------- |
| **Tone**        | Light, Dark, Ironic, Sincere, Sarcastic |
| **Pacing**      | Fast, Slow, Varied, Steady              |
| **Dialogue**    | Natural, Stylized, Minimal, Verbose     |
| **Description** | Visual, Literary, Sparse, Detailed      |
| **Era**         | Modern, Period, Futuristic, Timeless    |

## Preservation Levels

- **Plot**: Keep all major story beats
- **Characters**: Maintain core personalities
- **Dialogue**: Keep key lines, change delivery
- **Structure**: Preserve scene order
- **Themes**: Maintain underlying messages
