# Kling (可灵) Platform Guide

Complete guide for optimizing prompts for Kling AI image and video generation.

## Overview

**Best For:** Video generation, motion graphics, cinematic sequences, dynamic scenes
**Strengths:** Excellent temporal coherence, natural motion, camera movements
**Special Feature:** Both image AND video generation capabilities

## Key Differences from Image-Only Platforms

### Motion Awareness
Kling prompts should describe:
- **What moves:** Subject motion, object animation
- **How it moves:** Speed, direction, style of motion
- **Camera motion:** Pan, tilt, dolly, tracking shots

### Temporal Qualities
- Beginning state → End state
- Motion progression over time
- Cause and effect in motion

## Prompt Structure for Video

### Extended 6-Tier Architecture

**Tier 1 - Subject:**
```
Elegant ballerina in white tutu, graceful posture, 
extended arabesque position
```

**Tier 2 - Environment:**
```
Grand theater stage with red velvet curtains,
golden baroque ornamentation, empty audience seats visible
```

**Tier 3 - Lighting:**
```
Spotlight from above creating dramatic contrast,
warm golden light on dancer, deep shadows in background
```

**Tier 4 - Camera:**
```
Slow tracking shot circling the dancer,
gradual push-in from medium to close-up
```

**Tier 5 - Motion:**
```
Fluid pirouette rotation maintaining balance,
tutu fabric flowing with centrifugal force,
graceful arm movements following spin
```

**Tier 6 - Quality:**
```
Cinematic 4K video, smooth 60fps motion,
professional ballet performance, artistic cinematography
```

**Complete Video Prompt:**
```
Elegant ballerina in white tutu, graceful posture, extended arabesque position,
grand theater stage with red velvet curtains, golden baroque ornamentation,
spotlight from above creating dramatic contrast, warm golden light on dancer,
slow tracking shot circling the dancer, gradual push-in from medium to close-up,
fluid pirouette rotation maintaining balance, tutu fabric flowing with motion,
graceful arm movements following spin, 360-degree rotation in 5 seconds,
cinematic 4K video, smooth 60fps motion, professional ballet performance
```

## Motion Description Language

### Types of Motion

**Subject Motion:**
```
Walking slowly toward camera
Hair flowing in wind
Leaves falling and swirling
Water rippling outward
Smoke rising and dissipating
```

**Camera Motion:**
```
Slow pan left to right
Gradual dolly zoom effect
Gentle handheld shake
Smooth crane shot upward
360-degree orbit around subject
```

### Motion Qualities

**Speed Descriptors:**
- **Slow:** Gentle, gradual, lingering, deliberate
- **Medium:** Natural, flowing, steady, smooth
- **Fast:** Quick, rapid, sudden, swift
- **Variable:** Accelerating, decelerating, building

**Motion Styles:**
- **Fluid:** Water-like, continuous, graceful
- **Staccato:** Jerky, abrupt, sharp movements
- **Organic:** Natural, lifelike, biological
- **Mechanical:** Robotic, precise, repetitive

### Temporal Keywords

**Progression:**
```
Beginning with... transitioning to... ending with
Initially... gradually... finally
Starting from... progressing through... concluding at
```

**Duration:**
```
Brief moment captured
Extended sequence showing
5-second clip of
Slow-motion footage of
Time-lapse showing
```

## Camera Movement Vocabulary

### Basic Movements

| Movement | Description | Example |
|----------|-------------|---------|
| Pan | Horizontal rotation | "Slow pan right revealing cityscape" |
| Tilt | Vertical rotation | "Gradual tilt up to show sky" |
| Dolly | Forward/backward | "Dolly in closer to face" |
| Truck | Left/right lateral | "Truck left following walking subject" |
| Pedestal | Up/down vertical | "Pedestal up from ground level" |
| Roll | Rotation around lens | "Dutch angle roll creating tension" |

### Complex Movements

**Orbit:**
```
Smooth 180-degree orbit around subject,
complete 360-degree rotation,
circling clockwise from low angle
```

**Tracking:**
```
Tracking shot following subject movement,
parallel tracking maintaining distance,
leading tracking anticipating motion
```

**Crane/Jib:**
```
Sweeping crane shot from ground to aerial,
high-angle descent revealing scene,
dramatic upward crane movement
```

**Handheld:**
```
Subtle handheld documentary style,
natural breathing motion,
professional steadicam smoothness
```

### Zoom Techniques

**Standard Zoom:**
```
Slow zoom in on subject,
gradual zoom out revealing context
```

**Dolly Zoom (Vertigo Effect):**
```
Dolly zoom effect - camera moving back while zooming in,
breathing background effect
```

**Rack Focus:**
```
Focus pull from foreground to background,
rack focus shifting attention between subjects
```

## Content Types and Best Practices

### Character Animation

**What Works Well:**
- Natural walking, running, dancing
- Hair and clothing movement
- Facial expressions (subtle)
- Hand gestures

**Prompt Pattern:**
```
[Character], [pose/action], [environment],
[natural movement description], [clothing dynamics],
[camera following movement], [motion quality]
```

**Example:**
```
Young woman walking through autumn forest,
brown hair flowing behind in gentle breeze,
scarf fluttering with movement,
falling leaves swirling around her,
steady tracking shot from side,
smooth natural motion, 4K cinematic
```

### Nature and Environment

**What Works Well:**
- Water (waves, waterfalls, rain)
- Clouds and sky movement
- Trees swaying in wind
- Fire and smoke
- Weather effects

**Prompt Pattern:**
```
[Scene], [environmental elements],
[natural motion - wind, water, fire],
[atmospheric movement],
[time-lapse or real-time],
[wide establishing shot]
```

**Example:**
```
Dramatic ocean waves crashing on rocky shore,
white foam spraying upward with impact,
seagulls gliding on wind currents,
clouds moving swiftly across sky,
time-lapse showing tide coming in,
wide shot from cliff above
```

### Product and Object

**What Works Well:**
- Product rotations
- Liquid pours
- Mechanical movements
- Opening/closing actions
- Light interactions

**Prompt Pattern:**
```
[Product], [setting],
[demo movement - rotation, opening],
[light reflections changing],
[smooth controlled motion],
[360-degree showcase]
```

**Example:**
```
Luxury watch on black velvet surface,
slow 360-degree rotation showing all angles,
hands moving smoothly marking time,
crystal face reflecting changing light,
smooth product photography motion
```

### Abstract and Effects

**What Works Well:**
- Particle systems
- Light beams and rays
- Liquid simulations
- Energy effects
- Transitions

**Prompt Pattern:**
```
[Abstract concept], [visual elements],
[dynamic motion pattern],
[p evolving shapes],
[color transitions],
[hypnotic flow]
```

**Example:**
```
Flowing liquid gold forming organic shapes,
continuous morphing and reforming,
light reflecting off undulating surface,
mesmerizing fluid dynamics,
slow hypnotic motion, seamless loop
```

## Technical Specifications

### Recommended Settings

**Duration:**
- Standard: 5 seconds
- Optimal: 5-10 seconds
- Maximum: 10 seconds (for best quality)

**Motion Strength:**
- **Low (20-40%):** Subtle, gentle motion
- **Medium (50-70%):** Natural, balanced motion
- **High (80-100%):** Dramatic, intense motion

**Aspect Ratios:**
- 16:9 (Landscape video)
- 9:16 (Portrait/mobile)
- 1:1 (Square)
- 21:9 (Cinematic)

### Frame Rate
- Default: 24-30 fps
- Smooth motion: 60 fps
- Slow-motion effect: 120+ fps (if supported)

## Image-to-Video Workflow

### Using Static Images

**Process:**
1. Generate or upload base image
2. Add motion description
3. Specify camera movement
4. Define temporal progression

**Prompt Structure:**
```
[Base image description],
[what comes to life/moves],
[camera movement],
[duration and pacing]
```

**Example:**
```
Static portrait of elderly craftsman in workshop,
tools and hands beginning to move as he works,
gentle focus on hand movements and tool use,
subtle breathing and facial expressions,
steady camera slowly pushing in,
5-second cinematic sequence
```

## Common Video Prompt Patterns

### Cinematic Sequence
```
[Establishing shot],
[intr
