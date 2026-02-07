---
name: translate
description: Translate text between languages. Use when users need to translate content, understand foreign language text, or communicate in different languages. Supports multiple languages with automatic language detection.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: language
  tags: translate translation language i18n localization
compatibility: Works with any LLM provider that supports multilingual capabilities
---

# Translate Skill

Translates text between languages using the agent's LLM capabilities. Supports automatic language detection and maintains context and tone.

## When to Use

- User asks to translate text to another language
- Need to understand foreign language content
- Communicating with international users
- Localizing content for different markets
- Learning new languages

## Parameters

- `text` (string, required): The text to translate
- `targetLanguage` (string, required): Target language code or name
  - Examples: "en", "zh", "es", "fr", "de", "ja", "ko"
  - Full names also accepted: "English", "Chinese", "Spanish"
- `sourceLanguage` (string, optional): Source language (auto-detected if not provided)
- `preserveFormatting` (boolean, optional): Keep original formatting (default: true)
- `formality` (string, optional): Formality level
  - "formal" - Business/formal language
  - "informal" - Casual conversation
  - "neutral" - Standard (default)

## Examples

### Basic Translation

```yaml
skill: translate
parameters:
  text: 'Hello, how are you?'
  targetLanguage: 'zh'
```

**Output:**

```
你好，你好吗？
```

### With Source Language

```yaml
skill: translate
parameters:
  text: 'Bonjour le monde'
  sourceLanguage: 'fr'
  targetLanguage: 'en'
```

**Output:**

```
Hello world
```

### Formal Business Translation

```yaml
skill: translate
parameters:
  text: 'Please review the attached document'
  targetLanguage: 'ja'
  formality: 'formal'
```

**Output:**

```
添付書類をご確認ください
```

### Multi-paragraph Translation

```yaml
skill: translate
parameters:
  text: |
    First paragraph here.
    Second paragraph here.
  targetLanguage: 'es'
  preserveFormatting: true
```

## Supported Languages

Common language codes:

- `en` - English
- `zh` - Chinese (Simplified)
- `zh-TW` - Chinese (Traditional)
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `ko` - Korean
- `ru` - Russian
- `pt` - Portuguese
- `it` - Italian
- `ar` - Arabic
- `hi` - Hindi

## Notes

- Automatic language detection works for most common languages
- Preserves markdown formatting by default
- Maintains context across multiple sentences
- Handles idioms and colloquialisms appropriately
- For technical content, consider using specialized translation tools
