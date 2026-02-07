---
name: prompt-optimizer
description: Optimize and improve system prompts for AI agents. Use when creating or refining agent instructions, improving prompt clarity, or maximizing agent performance. Analyzes prompts and suggests improvements for better results.
license: MIT
metadata:
  author: sdkwork-browser-agent
  version: '1.0.0'
  category: ai-optimization
  tags: prompt optimization system-prompt agent tuning llm
compatibility: Designed for agent system prompts and LLM instructions
---

# Prompt Optimizer Skill

Analyzes and optimizes system prompts for AI agents to improve clarity, effectiveness, and performance.

## When to Use

- Creating new agent system prompts
- Refining existing agent instructions
- Prompt is not producing desired results
- Need to add constraints or guidelines
- Optimizing for specific tasks or outputs
- Reducing ambiguity in instructions

## Parameters

- `prompt` (string, required): The system prompt to optimize
- `goal` (string, optional): What the agent should accomplish
  - Examples: "customer support", "code review", "data analysis"
- `constraints` (array, optional): Specific constraints to enforce
  - Examples: ["be concise", "ask clarifying questions", "cite sources"]
- `tone` (string, optional): Desired tone of responses
  - "professional", "friendly", "technical", "casual"
- `optimizeFor` (string, optional): Optimization focus
  - "clarity" - Clear instructions (default)
  - "performance" - Better task completion
  - "safety" - Add safety guardrails
  - "efficiency" - Reduce token usage

## Examples

### Basic Optimization

```yaml
skill: prompt-optimizer
parameters:
  prompt: 'You are a helpful assistant'
  goal: 'customer support'
```

**Output:**

```markdown
You are a professional customer support agent. Your role is to:

- Understand customer issues thoroughly
- Provide clear, accurate solutions
- Be empathetic and patient
- Escalate complex issues appropriately
- Always confirm understanding before proceeding

Guidelines:

- Ask clarifying questions if the issue is unclear
- Provide step-by-step instructions when applicable
- Use professional but friendly language
- Verify solutions work before suggesting them
```

### With Constraints

```yaml
skill: prompt-optimizer
parameters:
  prompt: 'Help users with coding questions'
  goal: 'code review and debugging'
  constraints:
    - 'always explain the reasoning'
    - 'provide working code examples'
    - 'mention potential edge cases'
  tone: 'technical'
```

**Output:**

```markdown
You are a senior software engineer specializing in code review and debugging.

Your responsibilities:

1. Analyze code thoroughly for bugs, inefficiencies, and best practices
2. Explain your reasoning clearly at each step
3. Provide working, tested code examples
4. Identify and discuss potential edge cases
5. Suggest optimizations when appropriate

Communication style:

- Technical and precise
- Use industry-standard terminology
- Include code comments for complex logic
- Format code blocks properly with language tags

Always:

- Test logic mentally before suggesting fixes
- Explain why changes improve the code
- Consider performance implications
- Address security concerns if present
```

### Safety-Focused Optimization

```yaml
skill: prompt-optimizer
parameters:
  prompt: 'Help users with general questions'
  optimizeFor: 'safety'
  constraints:
    - "don't provide harmful information"
    - 'fact-check claims'
    - 'acknowledge limitations'
```

**Output:**

```markdown
You are a helpful AI assistant with strong safety guidelines.

Core Principles:

1. Never provide instructions that could cause harm
2. Fact-check information before presenting it as true
3. Clearly distinguish between facts and opinions
4. Acknowledge when you don't know something
5. Avoid making assumptions about users

Safety Guidelines:

- Decline requests for dangerous or illegal activities
- Don't provide medical, legal, or financial advice without disclaimers
- Flag potentially sensitive topics
- Respect user privacy and confidentiality

Response Standards:

- Verify claims with reliable sources when possible
- Present multiple perspectives on controversial topics
- Include appropriate disclaimers for professional advice
- Be honest about your limitations and uncertainties
```

## Optimization Strategies

### Clarity Improvements

- Add specific action verbs
- Structure with numbered lists
- Define key terms
- Remove ambiguity

### Performance Enhancements

- Add examples (few-shot prompting)
- Include output format specifications
- Define decision criteria
- Add error handling guidance

### Safety Measures

- Add content policies
- Include ethical guidelines
- Define boundaries
- Add verification steps

### Efficiency Tips

- Remove redundant instructions
- Use concise language
- Structure for token efficiency
- Prioritize key instructions

## Output Format

Returns an optimized prompt with:

- Clear role definition
- Structured responsibilities
- Specific guidelines
- Examples where helpful
- Constraints and boundaries

## Notes

- Preserves original intent while improving clarity
- Adds structure and organization
- Includes best practices for agent behavior
- Customizable based on specific needs
- Iterative refinement recommended
