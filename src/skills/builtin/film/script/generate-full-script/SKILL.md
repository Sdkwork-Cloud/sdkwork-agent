---
name: generate-full-script
description: Generate a complete production-ready script from story outline, concept, or requirements. Use to create scripts from ideation phase outputs.
license: Apache-2.0
compatibility: Requires creative writing and screenplay formatting capabilities
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: generate create write script screenplay dialogue
---

# Generate Full Script

## Purpose

Create a complete, production-ready script from story outlines, concepts, or creative briefs.

## When to Use

- Creating scripts from story ideas
- Expanding outlines into full scripts
- Generating scripts from creative briefs
- Producing first drafts for review
- Creating variations of existing concepts

## Inputs

- `outline` (object, required):
  - `concept` (string): Story concept or synopsis
  - `characters` (array): Character descriptions
  - `plotPoints` (array): Key story beats
- `parameters` (object, optional):
  - `duration` (string): Target duration (e.g., "3-5 minutes")
  - `genre` (string): Genre/style
  - `tone` (string): Emotional tone
  - `format` (string): Script format standard

## Outputs

```json
{
  "script": "Complete formatted screenplay text...",
  "metadata": {
    "title": "The Coffee Shop Reunion",
    "genre": "Romance",
    "duration": "4.5 minutes",
    "pages": 4,
    "scenes": 5,
    "characters": 2
  },
  "structure": {
    "acts": [
      {
        "act": 1,
        "scenes": "1-2",
        "description": "Setup and Inciting Incident"
      },
      {
        "act": 2,
        "scenes": "3-4",
        "description": "Confrontation and Rising Action"
      },
      {
        "act": 3,
        "scene": "5",
        "description": "Climax and Resolution"
      }
    ]
  },
  "characterAppearances": {
    "ALEX": [1, 2, 3, 4, 5],
    "JORDAN": [1, 2, 3, 4, 5]
  },
  "productionNotes": [
    "Primary location: Coffee shop interior",
    "Time: Late afternoon/early evening",
    "Props needed: Coffee cups, menu, phone"
  ]
}
```

## Script Generation Process

1. **Analyze Input**
   - Parse outline and requirements
   - Identify genre conventions
   - Determine pacing needs

2. **Structure Development**
   - Map plot points to scenes
   - Balance act lengths
   - Plan emotional beats

3. **Scene Writing**
   - Write scene headings
   - Craft action descriptions
   - Develop dialogue
   - Add transitions

4. **Character Voice**
   - Ensure distinct voices
   - Maintain consistency
   - Show personality through dialogue

5. **Polish & Format**
   - Apply screenplay formatting
   - Refine descriptions
   - Check pacing
   - Add production notes

## Instructions

1. Review input outline thoroughly
2. Identify genre-specific conventions
3. Calculate scene count for target duration
4. Create scene breakdown
5. Write each scene:
   - Scene heading (INT./EXT., location, time)
   - Action description (visual, concise)
   - Character introductions
   - Dialogue (natural, purposeful)
   - Transitions (if needed)
6. Ensure emotional arc progression
7. Add production-relevant details
8. Format according to standards
9. Review for consistency
10. Generate metadata and notes

## Examples

### Example 1: Romance Script

**Input:**

```json
{
  "outline": {
    "concept": "Two former lovers meet by chance at a coffee shop",
    "characters": [
      {
        "name": "Alex",
        "description": "30s, corporate lawyer, reserved",
        "arc": "realizing what he lost"
      },
      {
        "name": "Jordan",
        "description": "30s, barista, artistic, warm",
        "arc": "showing contentment"
      }
    ],
    "plotPoints": [
      "Alex enters coffee shop",
      "Recognizes Jordan",
      "Awkward conversation",
      "Discussion of breakup",
      "Exchange numbers"
    ]
  },
  "parameters": {
    "duration": "3-4 minutes",
    "genre": "romance",
    "tone": "nostalgic_hopeful"
  }
}
```

**Output:** (Excerpt)

```
FADE IN:

INT. COFFEE SHOP - LATE AFTERNOON

Warm afternoon light filters through large windows. The
coffee shop bustles with the after-work crowd.

ALEX (30s, tailored suit, carrying briefcase) enters and
joins the line. He checks his phone, then glances up at
the menu board.

His eyes freeze on JORDAN (30s, behind the counter,
artistic, warm smile) who is taking an order.

Alex's face goes through a cascade of emotions: shock,
recognition, then something softer. Nostalgia.

Jordan finishes with the customer and turns. Their eyes
meet. Jordan's smile falters for just a moment.

                    JORDAN
          Alex?

                    ALEX
          Jordan. Wow. Hi.

Jordan recovers, professional smile back in place.

                    JORDAN
          What can I get you?

                    ALEX
          Just... coffee. Black.

Jordan nods, turns to prepare it. Alex watches him work.

                    ALEX (CONT'D)
          You work here now?

                    JORDAN
          I own it, actually. Well, co-own.
          Remember how I always talked about
          opening a place?

                    ALEX
          I remember.

A beat. The unspoken weight of their history hangs in the
air.

Jordan hands over the coffee. Their fingers brush. Both
pull back quickly.

                    JORDAN
          That'll be $4.50.

Alex pays, but doesn't move away from the counter.

                    ALEX
          Jordan... about what happened...

Jordan's expression closes slightly.

                    JORDAN
          Alex, it's been five years. Ancient
          history.

                    ALEX
          Is it? Because I still think about
          it. About us. About how I...

He stops himself. Jordan looks at him, really looks at
him, for the first time.

                    JORDAN
          You what?

                    ALEX
          How I made the biggest mistake of my
          life.

Silence. The coffee shop noise seems to fade away.

Jordan's eyes soften. He pulls out his phone.

                    JORDAN
          Give me your number. Not for... just
          to talk. Sometime.

Alex smiles, the first genuine smile we've seen.

                    ALEX
          I'd like that.

He takes out his phone. They exchange numbers.

                    JORDAN
          Take care of yourself, Alex.

                    ALEX
          You too, Jordan.

Alex turns to leave, then stops. Looks back.

                    ALEX (CONT'D)
          The place looks great. Really. I'm
          happy for you.

Jordan smiles, real and warm.

                    JORDAN
          Thanks. That means a lot.

Alex exits. Jordan watches him go, then turns back to work.
But there's a new lightness in his step.

FADE OUT.
```

### Example 2: Thriller Script

**Input:**

```json
{
  "outline": {
    "concept": "Someone finds a phone showing tomorrow's news",
    "characters": [
      {
        "name": "Maya",
        "description": "28, journalist, curious, skeptical"
      }
    ],
    "plotPoints": [
      "Finds phone",
      "Sees future news",
      "Tries to prevent accident",
      "Discovers she caused it",
      "Tragic ending"
    ]
  },
  "parameters": {
    "duration": "5 minutes",
    "genre": "thriller",
    "tone": "suspenseful_dark"
  }
}
```

## Duration Guidelines

| Duration | Pages | Scenes | Words     |
| -------- | ----- | ------ | --------- |
| 1-2 min  | 1-2   | 2-3    | 150-300   |
| 3-5 min  | 3-5   | 4-6    | 450-750   |
| 5-8 min  | 5-8   | 6-10   | 750-1200  |
| 8-10 min | 8-10  | 8-12   | 1200-1500 |

## Best Practices

- Show, don't tell
- Every scene must advance story
- Dialogue reveals character
- Visual storytelling优先
- Pacing matches genre
- Leave room for actor interpretation
