# Built-in Skills Directory Structure

This directory contains built-in skills following the **Agent Skills Specification**.

## Naming Convention

**Format**: `{language}-{platform?}-{role}`

### Language/Framework Codes

| Code | Language/Framework | Description |
|------|-------------------|-------------|
| `react` | React | React ecosystem (TypeScript/JavaScript) |
| `vue` | Vue | Vue ecosystem (TypeScript/JavaScript) |
| `flutter` | Flutter | Flutter/Dart cross-platform |
| `kotlin` | Kotlin | Kotlin for Android |
| `swift` | Swift | Swift for iOS/macOS |
| `arkts` | ArkTS | ArkTS for HarmonyOS |
| `mini` | Mini Program | Cross-platform mini programs |

### Platform Codes

| Code | Platform | Description |
|------|----------|-------------|
| `web` | PC Web | Desktop web applications |
| `h5` | Mobile Web | Mobile web apps, PWA |
| `backend` | Admin Panel | Backend admin systems |
| `android` | Android | Android native |
| `ios` | iOS | iOS native |
| `harmony` | HarmonyOS | HarmonyOS native |

### Role Codes

| Code | Role | Description |
|------|------|-------------|
| `architect` | Architect | Design + Create + Refactor + Optimize |
| `fixer` | Fixer | Bug fixing and troubleshooting |
| `creator` | Creator | Project scaffolding and generation |

---

## Directory Structure

```
src/skills/builtin/
├── echo/                        # Debug utility
├── code-review/                 # Code review assistant
├── image-prompt-engineer/       # AI image prompt generator
├── video-director/              # Video production assistant
├── video-prompt-engineer/       # AI video prompt generator
│
├── react-web-architect/         # React PC web architect ✅
├── react-backend-architect/     # React admin panel architect ✅
├── react-h5-architect/          # React mobile web architect ✅
│
├── mini-architect/              # Mini program architect 📋
├── flutter-architect/           # Flutter architect 📋
├── kotlin-android-architect/    # Kotlin Android architect 📋
├── swift-ios-architect/         # Swift iOS architect 📋
├── arkts-harmony-architect/     # ArkTS HarmonyOS architect 📋
│
├── index.ts                     # TypeScript implementations
└── loader.ts                    # Skill loader
```

---

## Skill Categories

### React Architecture Skills

| Skill | Language | Platform | Capabilities |
|-------|----------|----------|--------------|
| `react-web-architect` | React/TS | PC Web | Design, Create, Refactor, Optimize |
| `react-backend-architect` | React/TS | Admin Panel | Design, Create, Refactor, Secure |
| `react-h5-architect` | React/TS | Mobile Web | Design, Create, Refactor, Enhance |

### Mobile Architecture Skills

| Skill | Language | Platform | Capabilities |
|-------|----------|----------|--------------|
| `mini-architect` | TS/JS | Mini Program | Design, Create, Refactor, Cross-Platform |
| `flutter-architect` | Dart | Cross-Platform | Design, Create, Refactor, Integrate |
| `kotlin-android-architect` | Kotlin | Android | Design, Create, Refactor, Modernize |
| `swift-ios-architect` | Swift | iOS | Design, Create, Refactor, Modernize |
| `arkts-harmony-architect` | ArkTS | HarmonyOS | Design, Create, Refactor, Distribute |

### Content Generation Skills

| Skill | Target | Description |
|-------|--------|-------------|
| `image-prompt-engineer` | AI Images | Midjourney, Jimeng, NanoBanana prompts |
| `video-prompt-engineer` | AI Videos | Runway, Pika, Kling prompts |
| `video-director` | Video Production | Storyboards, scripts, shot lists |

### Utility Skills

| Skill | Target | Description |
|-------|--------|-------------|
| `echo` | Debug | Echo back input for testing |
| `code-review` | Development | Code review and suggestions |

---

## Platform Coverage

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Platform Coverage                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Web Platform (React)                                                   │
│   ├── react-web-architect        (PC Frontend)           ✅ Ready       │
│   └── react-backend-architect    (Admin Panel)           ✅ Ready       │
│                                                                          │
│   Mobile Platform                                                        │
│   ├── react-h5-architect         (Mobile Web/PWA)        ✅ Ready       │
│   ├── mini-architect             (Mini Programs)         📋 Planned     │
│   ├── flutter-architect          (Flutter Apps)          📋 Planned     │
│   ├── kotlin-android-architect   (Android Native)        📋 Planned     │
│   ├── swift-ios-architect        (iOS Native)            📋 Planned     │
│   └── arkts-harmony-architect    (HarmonyOS)             📋 Planned     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architect Capabilities

All `*-architect` skills support four core capabilities:

| Capability | Description |
|------------|-------------|
| **Design** | Architecture design, pattern selection, technology decisions |
| **Create** | Project scaffolding, boilerplate generation, initial setup |
| **Refactor** | Code restructuring, migration, optimization |
| **Specialize** | Platform-specific features (Secure, Enhance, Modernize, etc.) |

---

## Progressive Disclosure

Following the Agent Skills Specification:

1. **Metadata** (~100 tokens): Loaded at startup
   - `name` and `description` from frontmatter
2. **Instructions** (<5000 tokens): Loaded when skill is activated
   - Full SKILL.md body
3. **Resources** (as needed): Loaded on demand
   - `scripts/`, `references/`, `assets/` directories

---

## References

- [Agent Skills Specification](https://agentskills.io/specification)
