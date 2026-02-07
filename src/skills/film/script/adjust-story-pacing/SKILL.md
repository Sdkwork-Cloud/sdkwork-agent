---
name: adjust-story-pacing
description: Analyze and adjust story pacing for optimal emotional impact and engagement. Use to fix pacing issues and enhance narrative rhythm.
license: Apache-2.0
compatibility: Works with any narrative structure
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: pacing rhythm story structure timing engagement
---

# Adjust Story Pacing

## Purpose

Analyze and optimize story pacing to ensure proper emotional buildup, engagement, and narrative flow.

## When to Use

- Scripts feeling too slow or rushed
- Emotional beats not landing
- Audience engagement issues
- Structural rhythm problems
- Genre-specific pacing requirements
- Platform-specific timing needs

## Inputs

- `script` (string, required): Script to analyze and adjust
- `targetPacing` (string, optional): "faster" | "slower" | "balanced"
- `focusAreas` (array, optional): Specific scenes or acts to adjust
- `genre` (string, optional): For genre-specific pacing conventions

## Outputs

```json
{
  "adjustedScript": "Pacing-optimized script...",
  "analysis": {
    "currentPacing": {
      "overall": "too_slow",
      "act1": "appropriate",
      "act2": "sluggish",
      "act3": "rushed"
    },
    "sceneTiming": [
      {
        "scene": 1,
        "currentDuration": "45s",
        "recommendedDuration": "30s",
        "issue": "excessive_description"
      },
      {
        "scene": 4,
        "currentDuration": "20s",
        "recommendedDuration": "45s",
        "issue": "emotional_beat_rushed"
      }
    ],
    "engagementCurve": [
      { "point": "opening", "level": 0.8 },
      { "point": "act1_end", "level": 0.6 },
      { "point": "midpoint", "level": 0.4 },
      { "point": "climax", "level": 0.9 },
      { "point": "resolution", "level": 0.7 }
    ]
  },
  "adjustments": [
    {
      "type": "trim",
      "location": "Scene 1",
      "description": "Removed 3 lines of atmospheric description",
      "timeSaved": "15s"
    },
    {
      "type": "expand",
      "location": "Scene 4",
      "description": "Added reaction beats to emotional moment",
      "timeAdded": "25s"
    },
    {
      "type": "restructure",
      "location": "Act 2",
      "description": "Moved revelation earlier to maintain tension"
    }
  ],
  "recommendations": [
    "Consider adding a midpoint twist to re-engage audience",
    "Scene 3 could benefit from a visual montage",
    "The argument in Scene 5 needs more breathing room"
  ]
}
```

## Pacing Elements

### 1. Scene Duration

- **Too Short**: Rushed, underdeveloped
- **Too Long**: Dragging, losing focus
- **Just Right**: Complete beat, maintains interest

### 2. Emotional Beats

- **Setup**: Adequate preparation
- **Build**: Gradual escalation
- **Peak**: Maximum impact
- **Release**: Proper resolution

### 3. Information Flow

- **Exposition**: Spread naturally
- **Revelations**: Timed for impact
- **Twists**: Set up and payoff
- **Climax**: Proper buildup

### 4. Rhythm Variation

- **Fast**: Action, conflict, urgency
- **Slow**: Emotion, reflection, intimacy
- **Contrast**: Alternating speeds
- **Punctuation**: Key moments land

## Pacing by Genre

| Genre        | Opening         | Build              | Climax           | Resolution |
| ------------ | --------------- | ------------------ | ---------------- | ---------- |
| **Thriller** | Quick hook      | Steady tension     | Rapid escalation | Brief      |
| **Romance**  | Character intro | Emotional build    | Peak emotion     | Satisfying |
| **Comedy**   | Setup joke      | Escalating gags    | Biggest laugh    | Tag        |
| **Drama**    | Establish world | Deepening conflict | Catharsis        | Reflection |
| **Horror**   | Normalcy        | Creeping dread     | Intense scare    | Unease     |

## Instructions

### Analysis Phase

1. **Map Scene Durations**
   - Calculate estimated time per scene
   - Identify unusually long/short scenes
   - Note pacing patterns

2. **Check Emotional Arcs**
   - Are beats properly set up?
   - Is emotional progression natural?
   - Do climaxes have adequate buildup?

3. **Analyze Engagement**
   - Identify potential slow points
   - Check for repetitive beats
   - Note where tension drops

4. **Review Information Flow**
   - Is exposition too concentrated?
   - Are revelations properly timed?
   - Is the audience ahead/behind characters?

### Adjustment Phase

1. **Trim Fat**
   - Cut unnecessary description
   - Remove redundant dialogue
   - Tighten transitions

2. **Expand Key Moments**
   - Add reaction beats
   - Include pauses and silences
   - Deepen emotional moments

3. **Restructure**
   - Move scenes for better flow
   - Reorder revelations
   - Adjust act breaks

4. **Add Variation**
   - Insert faster moments in slow sections
   - Slow down for emotional impact
   - Create rhythmic contrast

## Examples

### Example 1: Fixing Slow Opening

**Before:** (Opening drags)

```
FADE IN:

EXT. CITY STREET - DAY

The bustling metropolis. Skyscrapers tower. Traffic flows.
People walk. Coffee shops line the streets. A dog barks.
Children play. The sun shines. It's a Tuesday.

INT. COFFEE SHOP - DAY

The cozy interior. Warm lighting. Wooden furniture. The
aroma of coffee. Customers chat. Baristas work. The menu
board displays options. Music plays softly.

Alex enters. He looks around. He walks to the counter. He
waits in line. He checks his phone. He reaches the front.

                    ALEX
          Hi. Coffee, please.
```

**After:** (Immediate engagement)

```
FADE IN:

INT. COFFEE SHOP - DAY

ALEX (30s, suit, rushed) bursts through the door, phone
to his ear.

                    ALEX
          (into phone)
          I'll have the contracts by three—

He stops. Freezes. His face changes.

There, behind the counter: JORDAN. Their eyes meet.

The coffee shop noise seems to fade.

                    ALEX (CONT'D)
          (quiet, to Jordan)
          Jordan.
```

### Example 2: Expanding Rushed Emotional Moment

**Before:** (Too fast)

```
                    ALEX
          I never stopped loving you.

                    JORDAN
          I know. Me neither.

They kiss.
```

**After:** (Proper emotional weight)

```
Alex's words hang in the air. Jordan stares at him.

                    JORDAN
          Don't. Don't say that if you don't—

                    ALEX
          I do. I have. Every day for five
          years.

Jordan's composure cracks. He looks away, blinking.

                    JORDAN
          You have a funny way of showing it.

                    ALEX
          I know. I was stupid. I was scared.
          I thought success would fill...
          (beat)
          It doesn't. Nothing does.

Jordan turns back. Tears in his eyes, but he's smiling.

                    JORDAN
          You really kept that photo?

Alex nods. Pulls out his wallet. The worn photo.

                    ALEX
          Every day.

Jordan reaches out. Takes Alex's hand.

                    JORDAN
          Idiot.

                    ALEX
          Yeah.

                    JORDAN
          My idiot?

Alex laughs. Wet, relieved.

                    ALEX
          If you'll have me.

Jordan pulls him close. They kiss, soft and slow, like
they have all the time in the world.
```

### Example 3: Adding Midpoint Twist

**Before:** (Flat middle)

```
Act 2: They date. Things go well. They fall in love.
Then minor conflict.
```

**After:** (Engaging midpoint)

```
Act 2A: They date. Things go well. They're falling in love.

MIDPOINT TWIST:
Alex discovers Jordan has been offered a job in Paris.
He was going to tell Alex... after they fell in love.
Manipulation or protection? Trust is shattered.

Act 2B: Can they rebuild? Is the relationship real or
just Jordan's exit strategy? Tension escalates.
```

## Pacing Problems and Solutions

| Problem                | Symptom                 | Solution                           |
| ---------------------- | ----------------------- | ---------------------------------- |
| **Sagging Middle**     | Audience loses interest | Add midpoint twist or raise stakes |
| **Rushed Climax**      | No emotional impact     | Add buildup scenes                 |
| **Slow Opening**       | Hard to get into        | Start in media res                 |
| **Uneven Acts**        | One act drags           | Redistribute content               |
| **No Breathing Room**  | Exhausting pace         | Add quiet moments                  |
| **Predictable Rhythm** | Boring pattern          | Vary scene lengths                 |

## Platform-Specific Pacing

### TikTok/Reels (15-60s)

- Hook in first 3 seconds
- One clear beat
- Fast payoff
- No subplots

### YouTube Shorts (30-60s)

- Quick setup
- Single twist or emotional turn
- Satisfying conclusion

### Traditional Short Film (3-10 min)

- Full 3-act structure
- Character development
- Multiple beats
- Emotional arc

### Feature Film (90+ min)

- Complex structure
- Subplots
- Deep character work
- Multiple arcs

## Pacing Checklist

- [ ] Opening grabs attention immediately
- [ ] First act establishes without dragging
- [ ] Second act maintains engagement
- [ ] Midpoint shifts energy or raises stakes
- [ ] Third act builds to climax
- [ ] Climax has proper buildup
- [ ] Resolution satisfies without overstaying
- [ ] Scene lengths vary for rhythm
- [ ] Emotional beats have proper weight
- [ ] Information revealed at optimal times
- [ ] No repetitive beats
- [ ] Contrast between fast and slow moments
