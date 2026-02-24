# Output Examples - Quick Reference

Quick reference and JSON structure guide. Load this first, then load category-specific examples as needed.

## Quick Reference

All 34 examples are organized by category:

| File to Load | Examples | Content |
|--------------|----------|---------|
| `output-examples-basics.md` | 1-12 | Basic usage, multi-platform, simple portraits/landscapes |
| `output-examples-video-production.md` | 13-18 | 定妆照、三视图、场景、人物+场景、产品、纯背景 |
| `output-examples-grids.md` | 19-26 | 宫格示例（按时间分段 + 剧情规划） |
| `output-examples-categories.md` | 27-34 | 时尚人像、团体照、cosplay、风景、动物、产品、美食 |

---

## JSON Structure Reference

**ALL examples follow this EXACT structure:**

```json
{
  "platforms": ["platform-name-1", "platform-name-2"],
  "prompts": {
    "platform-name-1": {
      "type": "image",
      "prompt": "prompt text here",
      "style": "style-name",
      "parameters": "--ar 16:9 --v 6.1",
      "negative": "what to exclude",
      "video_ready": true
    }
  }
}
```

**Field Rules:**

- `platforms`: Array of platform names (lowercase, hyphenated: `midjourney`, `jimeng`, `nano-banana`, `default`)
- `type`: Always `"image"`
- `prompt`: Required - the actual prompt text
- `style`: Required - detected or default style
- `parameters`: Optional - platform-specific parameters
- `negative`: Optional - negative prompt
- `video_ready`: Optional - boolean, only when user requests video-ready

**DO NOT include:**

- `elements` field (removed for consistency)
- Any other extra fields

---

## Which Example File to Load?

| User Input Contains | Load This File |
|-----------------|----------------|
| Basic prompt, simple use | `output-examples-basics.md` |
| 定妆照、三视图、场景、视频制作 | `output-examples-video-production.md` |
| 宫格、九宫格、storyboard | `output-examples-grids.md` |
| 时尚、团体、cosplay、风景、动物、产品、美食 | `output-examples-categories.md` |
