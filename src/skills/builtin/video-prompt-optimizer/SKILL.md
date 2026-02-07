---
name: video-prompt-optimizer
description: Optimize prompts for AI video generation models like Runway Gen-2, Pika Labs, Stable Video Diffusion. Creates detailed prompts for generating high-quality AI videos with proper motion, camera movements, and temporal coherence. Use when generating videos with AI models.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: ai-optimization
  tags: video generation prompt runway pika stable-video optimization motion
compatibility: Works with Runway Gen-2, Pika Labs, Stable Video Diffusion, and similar AI video generators
---

# Video Prompt Optimizer Skill

Transforms basic video descriptions into optimized prompts for AI video generation models, with focus on motion, camera work, and temporal coherence.

## When to Use

- Creating videos with Runway, Pika, or Stable Video Diffusion
- Need to specify motion and camera movements
- Want consistent scenes across video frames
- Optimizing for specific video qualities
- Creating cinematic or dynamic content
- Generating character animations

## Parameters

- `description` (string, required): Basic description of desired video
- `duration` (string, optional): Video length context
  - "short" (1-4 seconds), "medium" (5-10 seconds), "long" (10+ seconds)
- `motion` (string, optional): Type of movement
  - "static", "slow", "moderate", "fast", "dynamic"
  - "cinematic", "smooth", "choppy", "flowing"
- `camera` (string, optional): Camera movement
  - "static", "pan left/right", "tilt up/down", "dolly in/out"
  - "truck left/right", "pedestal up/down", "handheld", "gimbal"
  - "drone", "crane up/down", "zoom in/out"
- `style` (string, optional): Visual style
  - "cinematic", "documentary", "music video", "commercial"
  - "vlog", "animation", "vfx", "experimental"
- `lighting` (string, optional): Lighting conditions over time
  - "consistent", "changing", "golden hour", "blue hour"
  - "studio", "natural", "dramatic", "neon"
- `aspectRatio` (string, optional): Video proportions
  - "16:9" (standard), "9:16" (vertical/mobile), "1:1" (square)
  - "21:9" (cinematic), "4:3" (classic)
- `quality` (string, optional): Production value
  - "draft" - Quick concept
  - "standard" - Balanced (default)
  - "cinematic" - High production value
- `targetModel` (string, optional): Specific model optimization
  - "runway-gen2", "pika", "stable-video", "sora"

## Examples

### Basic Video Enhancement

```yaml
skill: video-prompt-optimizer
parameters:
  description: 'A car driving down a road'
```

**Output:**

```
A sleek sports car driving smoothly down a winding mountain road, moderate speed, scenic landscape with trees and mountains in background, natural daylight, smooth gimbal camera following the car from side angle, consistent lighting throughout, photorealistic, 4k quality, cinematic color grading, stable motion without jitter
```

### Cinematic Scene

```yaml
skill: video-prompt-optimizer
parameters:
  description: 'Person walking in a futuristic city'
  motion: 'cinematic'
  camera: 'dolly in'
  style: 'cinematic'
  lighting: 'neon'
  quality: 'cinematic'
```

**Output:**

```
Cinematic shot of a person walking confidently through a futuristic cyberpunk city at night, slow dolly in camera movement gradually focusing on the subject, towering holographic billboards and neon signs illuminating the scene with cyan and magenta lights, reflective wet streets, background city lights creating bokeh, dramatic atmospheric fog, smooth professional camera work, film grain texture, anamorphic lens flares, consistent neon lighting throughout the shot, 8k cinematic quality, Blade Runner aesthetic
```

### Nature Documentary Style

```yaml
skill: video-prompt-optimizer
parameters:
  description: 'Bird flying over ocean'
  motion: 'smooth'
  camera: 'drone'
  style: 'documentary'
  lighting: 'golden hour'
  aspectRatio: '16:9'
```

**Output:**

```
Beautiful aerial drone footage of a majestic seabird soaring gracefully over crystal clear ocean waters, smooth flowing motion following the bird's flight path, golden hour sunset lighting creating warm orange and pink reflections on water, gentle waves below, distant coastline visible, slow cinematic camera movement maintaining focus on the bird, professional nature documentary style, 4k resolution, stable footage without shake, consistent natural lighting, breathtaking scenery
```

### Character Animation

```yaml
skill: video-prompt-optimizer
parameters:
  description: 'Robot turning its head'
  motion: 'slow'
  camera: 'static'
  style: 'animation'
  quality: 'high'
```

**Output:**

```
Detailed 3D animation of a futuristic humanoid robot slowly turning its head from left to right, smooth mechanical joint movements with realistic servo sounds implied, metallic surface with wear and tear details, glowing LED eyes that shift focus, static camera angle at eye level, subtle background blur keeping focus on robot, consistent lighting from single source creating dramatic shadows, high-quality CGI render, Pixar-style animation quality, 60fps smooth motion, detailed texturing on metal surfaces
```

### Product Showcase

```yaml
skill: video-prompt-optimizer
parameters:
  description: 'Smartphone rotating showing features'
  motion: 'smooth'
  camera: 'static with rotation'
  style: 'commercial'
  lighting: 'studio'
  aspectRatio: '9:16'
```

**Output:**

```
Professional commercial product video of a modern smartphone rotating smoothly in center frame, 360-degree rotation showing front screen, back cameras, and side profile, clean studio lighting with soft shadows, static camera with product rotation, premium device with reflective glass back, screen displaying vibrant interface, seamless looping motion, commercial advertising quality, sharp focus throughout, consistent white background, 4k resolution, smooth 60fps rotation, Apple-style product presentation
```

### Dynamic Action

```yaml
skill: video-prompt-optimizer
parameters:
  description: 'Dancer performing'
  motion: 'dynamic'
  camera: 'handheld'
  style: 'music video'
  lighting: 'dramatic'
```

**Output:**

```
Dynamic music video shot of an energetic dancer performing powerful choreography, fast-paced fluid movements with jumps and spins, handheld camera style with intentional subtle motion for energy, dramatic spotlight lighting creating strong contrasts and shadows, smoke effects in background, quick cuts implied through motion, vibrant colorful stage lighting that changes with the beat, close-up shots mixed with full body, high energy atmosphere, professional dance video production, 4k resolution, dynamic motion blur on fast movements
```

## Camera Movement Reference

### Basic Movements

- **Static**: Fixed camera position
- **Pan**: Horizontal rotation (left/right)
- **Tilt**: Vertical rotation (up/down)
- **Zoom**: Change focal length (in/out)

### Advanced Movements

- **Dolly**: Camera moves forward/backward
- **Truck**: Camera moves left/right
- **Pedestal**: Camera moves up/down
- **Crane**: Large vertical movements
- **Handheld**: Natural human movement
- **Gimbal**: Smooth stabilized movement
- **Drone**: Aerial perspective

### Cinematic Techniques

- **Rack focus**: Shifting focus between subjects
- **Whip pan**: Fast pan for transition effect
- **Tracking**: Following a moving subject
- **Dolly zoom**: Vertigo effect
- **Steadicam**: Smooth walking shots

## Motion Types

### Speed

- **Static**: No movement
- **Slow**: Graceful, deliberate motion
- **Moderate**: Natural speed
- **Fast**: Quick, energetic motion
- **Dynamic**: Varied speed changes

### Quality

- **Smooth**: Fluid, professional motion
- **Flowing**: Continuous graceful movement
- **Choppy**: Staccato or erratic
- **Cinematic**: Film-like quality

## Temporal Considerations

### Consistency

- Maintain lighting across frames
- Keep colors consistent
- Preserve subject appearance
- Stable camera work

### Motion Coherence

- Smooth transitions between movements
- Realistic physics
- Natural acceleration/deceleration
- Appropriate motion blur

## Model-Specific Tips

### Runway Gen-2

- Excellent at cinematic shots
- Good with camera movements
- Handles complex scenes well

### Pika Labs

- Great for character animations
- Good motion coherence
- Supports various aspect ratios

### Stable Video Diffusion

- More control with detailed prompts
- Good for specific camera work
- Benefits from image conditioning

### Sora (OpenAI)

- Highly capable with complex scenes
- Good temporal consistency
- Handles long sequences well

## Best Practices

1. **Specify Motion**: Always describe how things move
2. **Camera Work**: Detail camera movements and angles
3. **Temporal Consistency**: Ensure lighting/subjects stay consistent
4. **Realistic Physics**: Describe natural motion patterns
5. **Quality Modifiers**: Use "smooth", "cinematic", "professional"
6. **Duration Awareness**: Match motion complexity to video length

## Common Issues & Solutions

| Issue               | Solution                                       |
| ------------------- | ---------------------------------------------- |
| Flickering          | Add "consistent lighting", "stable exposure"   |
| Morphing            | Add "temporal coherence", "consistent subject" |
| Jittery             | Add "smooth motion", "gimbal stabilized"       |
| Blurry              | Add "sharp focus", "high shutter speed"        |
| Inconsistent colors | Add "consistent color grading"                 |

## Output Format

Returns an enhanced video prompt with:

- Subject and action details
- Camera movement specifications
- Motion characteristics
- Lighting conditions
- Style and quality modifiers
- Technical specifications

## Notes

- Video generation is more complex than images
- Motion coherence is critical
- Shorter videos generally more stable
- Camera movement adds dynamism
- Lighting consistency prevents flickering
- Iterative refinement often needed
