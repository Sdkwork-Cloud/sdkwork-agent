---
name: validate-script-completeness
description: Validate that a script contains all required elements for production. Use to check scripts before moving to storyboard or production phases.
license: Apache-2.0
compatibility: Works with standard screenplay formats
metadata:
  version: '1.0.0'
  author: sdkwork.com
  category: script
  tags: validate completeness check production-ready requirements
---

# Validate Script Completeness

## Purpose

Check that a script contains all necessary elements for production readiness.

## When to Use

- Before production approval
- After script generation
- Quality assurance checks
- Handoff to production team
- Client delivery validation

## Inputs

- `script` (string, required): Script content to validate
- `requirements` (object, optional):
  - `minScenes` (number): Minimum scene count
  - `maxScenes` (number): Maximum scene count
  - `minCharacters` (number): Minimum character count
  - `targetDuration` (string): Expected duration range

## Outputs

```json
{
  "isComplete": true,
  "score": 0.92,
  "checks": {
    "structure": {
      "passed": true,
      "hasOpening": true,
      "hasClimax": true,
      "hasResolution": true,
      "actBalance": "good"
    },
    "content": {
      "passed": true,
      "hasDialogue": true,
      "hasAction": true,
      "hasTransitions": true,
      "sceneCount": 8,
      "characterCount": 3
    },
    "format": {
      "passed": true,
      "properHeadings": true,
      "properDialogue": true,
      "properSpacing": true
    },
    "production": {
      "passed": false,
      "locationsIdentified": true,
      "propsListed": false,
      "costumeNotes": false,
      "timeOfDayClear": true
    }
  },
  "issues": [
    {
      "severity": "warning",
      "category": "production",
      "message": "Props not listed for Scene 3",
      "location": "Scene 3"
    },
    {
      "severity": "info",
      "category": "content",
      "message": "Consider adding more visual description",
      "location": "Scene 5"
    }
  ],
  "recommendations": [
    "Add prop list for production planning",
    "Include costume descriptions",
    "Specify time of day for all scenes"
  ]
}
```

## Validation Categories

### Structure

- [ ] Has clear beginning, middle, end
- [ ] Contains inciting incident
- [ ] Has rising action
- [ ] Contains climax
- [ ] Has resolution
- [ ] Proper act balance

### Content

- [ ] Has dialogue
- [ ] Has action descriptions
- [ ] Character introductions
- [ ] Scene transitions
- [ ] Proper pacing

### Format

- [ ] Scene headings (sluglines)
- [ ] Character names in CAPS
- [ ] Proper dialogue formatting
- [ ] Action paragraphs
- [ ] Transitions (if needed)

### Production

- [ ] Locations specified
- [ ] Time of day clear
- [ ] Props identified
- [ ] Costume notes
- [ ] Special effects noted

## Instructions

1. Parse script structure
2. Check for required structural elements
3. Verify content completeness
4. Validate formatting standards
5. Check production readiness
6. Calculate completeness score
7. Generate prioritized issue list
8. Provide actionable recommendations

## Examples

### Example 1: Complete Script

**Input:** Full 5-minute romantic drama script

**Output:**

```json
{
  "isComplete": true,
  "score": 0.95,
  "checks": {
    "structure": { "passed": true },
    "content": { "passed": true },
    "format": { "passed": true },
    "production": { "passed": true }
  },
  "issues": [],
  "recommendations": ["Script is production-ready"]
}
```

### Example 2: Incomplete Script

**Input:** Script missing resolution

**Output:**

```json
{
  "isComplete": false,
  "score": 0.65,
  "checks": {
    "structure": {
      "passed": false,
      "hasResolution": false
    },
    "content": { "passed": true },
    "format": { "passed": true },
    "production": {
      "passed": false,
      "propsListed": false
    }
  },
  "issues": [
    {
      "severity": "error",
      "category": "structure",
      "message": "Script missing resolution/climax",
      "location": "Ending"
    },
    {
      "severity": "warning",
      "category": "production",
      "message": "No prop list provided",
      "location": "General"
    }
  ]
}
```

## Scoring

| Score     | Status    | Action                  |
| --------- | --------- | ----------------------- |
| 0.90-1.00 | Excellent | Production ready        |
| 0.75-0.89 | Good      | Minor fixes needed      |
| 0.60-0.74 | Fair      | Significant issues      |
| 0.00-0.59 | Poor      | Major revision required |
