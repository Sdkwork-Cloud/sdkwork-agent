---
name: polish-dialogue
description: Refine and polish dialogue for naturalness, character voice consistency, and emotional impact. Use to improve script dialogue quality.
license: Apache-2.0
compatibility: Works with any script format
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: polish dialogue refine improve natural character voice
---

# Polish Dialogue

## Purpose

Refine dialogue to ensure naturalness, character consistency, emotional authenticity, and subtext.

## When to Use

- First draft dialogue refinement
- Character voice consistency checks
- Emotional beat enhancement
- Removing exposition-heavy dialogue
- Adding subtext and nuance
- Final dialogue polish before production

## Inputs

- `script` (string, required): Script with dialogue to polish
- `focus` (string, optional): "naturalness" | "character" | "emotion" | "subtext" | "all"
- `characters` (array, optional): Character voice definitions
- `intensity` (string, optional): "light" | "moderate" | "heavy"

## Outputs

```json
{
  "polishedScript": "Improved script with refined dialogue...",
  "changes": [
    {
      "scene": 2,
      "character": "ALEX",
      "original": "I am very angry at you because you did that thing yesterday",
      "polished": "You really went there, didn't you? After everything?",
      "improvements": ["show_dont_tell", "subtext", "emotional_authenticity"]
    },
    {
      "scene": 3,
      "character": "JORDAN",
      "original": "I feel sad about our breakup",
      "polished": "I kept your mug. The chipped one. Don't know why.",
      "improvements": ["subtext", "specificity", "character_voice"]
    }
  ],
  "statistics": {
    "linesPolished": 23,
    "expositionRemoved": 5,
    "subtextAdded": 8,
    "naturalnessScore": {
      "before": 0.72,
      "after": 0.91
    }
  },
  "characterVoices": {
    "ALEX": {
      "traits": ["indirect", "emotional", "defensive"],
      "patterns": ["questions", "deflection", "metaphors"]
    },
    "JORDAN": {
      "traits": ["direct", "vulnerable", "observant"],
      "patterns": ["statements", "specifics", "silences"]
    }
  }
}
```

## Dialogue Improvement Areas

### 1. Naturalness

- **Remove**: On-the-nose exposition
- **Add**: Interruptions, overlaps, false starts
- **Fix**: Overly complete sentences
- **Include**: Natural speech patterns, filler words

### 2. Character Voice

- **Consistency**: Same vocabulary and patterns
- **Distinctiveness**: Unique to each character
- **Background**: Reflect education, region, profession
- **Emotion**: Voice changes with emotional state

### 3. Subtext

- **Show, Don't Tell**: Actions speak louder
- **Implication**: What's unsaid matters
- **Conflict**: Characters avoid direct confrontation
- **Revelation**: Information emerges organically

### 4. Pacing

- **Brevity**: Cut to the chase
- **Pauses**: Silence is dialogue too
- **Rhythm**: Varied line lengths
- **Urgency**: Match pacing to scene tension

### 5. Emotion

- **Authenticity**: Genuine emotional responses
- **Specificity**: Concrete details over abstractions
- **Progression**: Emotions build and shift
- **Restraint**: Sometimes less is more

## Instructions

1. **Analyze Current Dialogue**
   - Identify on-the-nose exposition
   - Note unnatural speech patterns
   - Check character voice consistency
   - Mark missed emotional opportunities

2. **Apply Natural Speech Patterns**
   - Add interruptions and overlaps
   - Include false starts and corrections
   - Use contractions and informal language
   - Vary sentence length and structure

3. **Enhance Character Voice**
   - Define each character's speech patterns
   - Add signature words or phrases
   - Reflect background and personality
   - Ensure consistency throughout

4. **Add Subtext**
   - Replace exposition with implication
   - Show emotions through actions
   - Create tension between what's said and meant
   - Use silence and pauses effectively

5. **Refine Emotional Beats**
   - Ensure authentic emotional responses
   - Build emotional progression
   - Use specific, concrete language
   - Avoid melodrama

6. **Final Polish**
   - Read dialogue aloud
   - Check rhythm and flow
   - Verify character consistency
   - Ensure clarity without obviousness

## Examples

### Example 1: Adding Subtext

**Before:**

```
                    ALEX
          I am angry because you left me five
          years ago and I never understood why.

                    JORDAN
          I left because you prioritized your
          career over our relationship.
```

**After:**

```
Alex picks up Jordan's coffee cup. Studies it.

                    ALEX
          You still take it black.

                    JORDAN
          Some things don't change.

                    ALEX
          (setting cup down)
          Some things do.

A beat. Jordan looks at the cup, then at Alex.

                    JORDAN
          The promotion. The Tokyo office. You
          made your choice.

                    ALEX
          I made a lot of choices.

Alex's hand trembles slightly. Jordan notices.
```

### Example 2: Character Voice Distinction

**Before:** (Both characters sound the same)

```
                    ALEX
          I believe we should discuss our
          situation rationally.

                    JORDAN
          I agree that rational discussion would
          be beneficial for us.
```

**After:** (Distinct voices)

```
                    ALEX
          Can we just... talk? Without the
          yelling this time?

                    JORDAN
          Talk. Right. Because that worked so
          well before.

                    ALEX
          Jordan, please. I'm trying here.

Jordan crosses arms. Looks away.

                    JORDAN
          Trying. Yeah. You're always trying.
          After the fact.
```

### Example 3: Natural Speech Patterns

**Before:** (Too formal)

```
                    SARAH
          I did not expect to encounter you in
          this location at this particular time.
```

**After:** (Natural)

```
                    SARAH
          Oh. Wow. Didn't expect to run into you
          here.

She checks her phone, then back at him.

                    SARAH (CONT'D)
          Or... ever, really.
```

### Example 4: Emotional Progression

**Before:** (Static emotion)

```
                    EMMA
          I am sad. I am very sad about this
          situation. I feel heartbroken.
```

**After:** (Emotional journey)

```
Emma picks up the photo. Her hand shakes.

                    EMMA
          You kept this?

She laughs. It sounds broken.

                    EMMA (CONT'D)
          After everything, you kept this?

She puts it down. Carefully. Like it might shatter.

                    EMMA (CONT'D)
          (quietly)
          I threw mine away. First week.

A tear escapes. She doesn't wipe it.

                    EMMA (CONT'D)
          I was trying to be strong.
```

## Common Dialogue Problems

| Problem             | Example                                      | Solution                     |
| ------------------- | -------------------------------------------- | ---------------------------- |
| **On-the-nose**     | "I am angry"                                 | Show anger through action    |
| **Exposition dump** | "As you know, when we met five years ago..." | Reveal through conflict      |
| **Same voice**      | All characters sound identical               | Give distinct vocabularies   |
| **Too complete**    | Full grammatical sentences                   | Use fragments, interruptions |
| **No subtext**      | Characters say exactly what they mean        | Layer meaning beneath words  |
| **Melodrama**       | Overwrought emotional declarations           | Restraint and specificity    |

## Polish Checklist

- [ ] Each character has distinct voice
- [ ] Dialogue reveals character through speech patterns
- [ ] Subtext present, not everything stated directly
- [ ] Natural speech patterns (interruptions, false starts)
- [ ] Emotional authenticity
- [ ] Specific details over abstractions
- [ ] Pacing matches scene energy
- [ ] Silence used effectively
- [ ] No unnecessary exposition
- [ ] Reads naturally aloud
