# Extension Guide
How to extend and customize the video-prompt-engineer skill.

---

## Adding New Platforms

### Step 1: Create Platform File
Create a new file in `references/` named `platform-[platform-name].md`

### Step 2: Platform File Structure
```markdown
# Platform Guide - [Platform Name]
[Platform name] video generation platform guide.

---

## Platform Overview
**Company:** [Company Name]
**Strengths:**
- Strength 1
- Strength 2

**Best For:**
- Use case 1
- Use case 2

---

## Prompt Guidelines
[Platform-specific guidelines here]

---

## Key Parameters
### Duration
- Minimum: X seconds
- Maximum: Y seconds
- Recommended: Z seconds

### Aspect Ratios
- 16:9
- 9:16
- 1:1

---

## Example
[Example JSON output here]
```

### Step 3: Update SKILL.md
Add the platform to:
- `Step 1: Detect Platform(s)` table
- `Progressive Loading Strategy` - Which Files to Load When?
- `References` section

---

## Adding New Generation Modes

1. Create a new guide file in `references/`
2. Add detection keywords to `SKILL.md` - Step 0
3. Add to `Progressive Loading Strategy`
4. Add examples to corresponding `output-examples-*.md`

---

## Adding New Styles

1. Update `style-reference.md`
2. Add detection keywords to `SKILL.md`
3. Add style examples if needed

---

## Skill Structure Recap

```
video-prompt-engineer/
├── SKILL.md (Main skill file)
├── references/
│   ├── core-workflow.md
│   ├── input-guidelines.md
│   ├── output-examples-quickstart.md
│   ├── output-examples-basics.md
│   ├── output-examples-image-to-video.md
│   ├── output-examples-frames.md
│   ├── output-examples-multi-frame.md
│   ├── output-examples-universal.md
│   ├── image-to-video-guide.md
│   ├── frame-control-guide.md
│   ├── multi-frame-guide.md
│   ├── universal-reference-guide.md
│   ├── style-reference.md
│   ├── negative-prompts-library.md
│   ├── platform-kling.md
│   ├── platform-vidu.md
│   ├── platform-jimeng.md
│   ├── platform-sora.md
│   ├── platform-google.md
│   ├── platform-runway.md
│   ├── platform-pika.md
│   └── extension-guide.md
└── assets/templates/
    (video prompt templates here)
```
