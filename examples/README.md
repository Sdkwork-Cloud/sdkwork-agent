# SDKWork Browser Agent Examples

This directory contains comprehensive examples demonstrating the capabilities of SDKWork Browser Agent, showcasing both basic usage and advanced features.

## Quick Start Examples

### 1. Smart Agent Basic Usage
**File**: `smart-agent-example.ts`

Demonstrates the fundamental usage of SmartAgent with automatic skill selection, dynamic loading, and token optimization. This is the perfect starting point for understanding how the agent works.

```bash
npx ts-node examples/smart-agent-example.ts
```

**Features demonstrated**:
- Agent initialization with OpenAI provider
- Direct skill execution (echo skill)
- Auto-process with intelligent decision making
- Chat with LLM (Large Language Model)
- Custom skill registration and execution
- Execution history tracking and analysis
- Decision statistics collection

**Expected output**:
```
Agent initialized!
Available skills: ["echo", "calculator", ...]
Available tools: ["search", "code", ...]

--- Example 1: Direct skill execution ---
Echo result: { success: true, data: "Hello, World!" }

--- Example 2: Auto-process with decision ---
Decision: { skill: "calculator", confidence: 0.95 }
Result: 4
Execution time: 123 ms
```

### 2. MCTS Decision Engine
**File**: `mcts-decision-example.ts`

Demonstrates the power of Monte Carlo Tree Search (MCTS) for complex multi-step decision making scenarios, such as game AI or strategic planning.

```bash
npx ts-node examples/mcts-decision-example.ts
```

**Features demonstrated**:
- MCTS basic usage with balanced configuration
- Custom simulation policies for domain-specific scenarios
- Configuration comparison (Fast vs Balanced vs Thorough)
- Detailed decision statistics and tree analysis
- Game AI scenario simulation

**Expected output**:
```
=== MCTS Decision Example ===
Selected action: Place at (1,1)
Confidence: 87.5%
Estimated value: 0.6543
Visit count: 1250
Decision time: 234ms

=== Action Statistics ===
1. Place at (0,0) - Visits: 234, Mean Reward: 0.4567, UCB: 0.5678
2. Place at (1,1) - Visits: 567, Mean Reward: 0.6543, UCB: 0.6890
3. Place at (2,2) - Visits: 449, Mean Reward: 0.5432, UCB: 0.6123

=== Tree Statistics ===
Total nodes: 3750
Total visits: 5000
Max depth: 8
Average depth: 3.5
Leaf nodes: 1250
```

### 3. Secure Agent
**File**: `secure-agent-example.ts`

Demonstrates comprehensive security features including Secure Sandbox for code isolation and Prompt Injection Detection for protecting against malicious inputs.

```bash
npx ts-node examples/secure-agent-example.ts
```

**Features demonstrated**:
- Secure Sandbox (code isolation, resource limits, timeout protection)
- Prompt Injection Detection (8+ attack types)
- Security integration with SmartAgent
- Sandbox pool for high-throughput scenarios
- Security violation monitoring

**Expected output**:
```
=== Secure Sandbox Demo ===
Executing safe code...
Safe code result: 4
Executing math operations...
Factorial result: 120
Attempting to access blocked global (fetch)...
Blocked global access prevented (expected)
Testing timeout protection...
Timeout protection working (expected)

=== Prompt Injection Detection Demo ===
Testing: Normal input
Is injection: false
Risk score: 10.5%
✓ Detection working as expected
Testing: Instruction override attempt
Is injection: true
Risk score: 85.2%
Attack types: ["instruction_override"]
✓ Detection working as expected
```

### 4. Vector Memory System
**File**: `vector-memory-example.ts`

Demonstrates the advanced vector memory system for semantic search, retrieval, and knowledge management. This example showcases how the agent can store and retrieve information using vector embeddings.

```bash
npx ts-node examples/vector-memory-example.ts
```

**Features demonstrated**:
- Multiple Embedding Providers (TF-IDF, OpenAI, and custom)
- Vector Database operations (insert, search, delete)
- Hybrid search (vector + text) for enhanced results
- Database Manager for memory organization
- Semantic similarity calculation
- Memory indexing and retrieval

**Expected output**:
```
=== Vector Memory System Demo ===
Created vector database with 100 sample documents
Semantic search for "machine learning":
1. Document #42: "Introduction to Machine Learning Algorithms" - Similarity: 0.92
2. Document #76: "Deep Learning Techniques" - Similarity: 0.88
3. Document #23: "AI Ethics in Practice" - Similarity: 0.75

Hybrid search results:
1. Document #42: "Introduction to Machine Learning Algorithms" - Score: 0.95
2. Document #55: "Machine Learning for Beginners" - Score: 0.91
```

### 5. Prompt Optimizer Skill
**File**: `prompt-optimizer-example.ts`

Demonstrates the comprehensive capabilities of the Prompt Optimizer Skill, including video generation, image generation, system prompt, and general prompt optimization with both natural language and JSON structured output formats.

```bash
npx ts-node examples/prompt-optimizer-example.ts
```

**Features demonstrated**:
- Video generation prompt optimization (text-to-video, JSON structured)
- Image generation prompt optimization (text-to-image, API formats)
- System prompt optimization for AI agents
- General prompt optimization for better results
- Multiple output formats (natural language, JSON structured, API formats)
- Model-specific optimizations for various AI platforms
- Batch processing capabilities
- Error handling and edge cases

**Expected output**:
```
╔════════════════════════════════════════════════════════════╗
║     Prompt Optimizer Skill - Comprehensive Examples         ║
╚════════════════════════════════════════════════════════════╝

========================================
Example 1: Video Generation - Text to Video
========================================

✓ Video generation prompt optimized successfully

--- Natural Language Output ---
English: A golden retriever running joyfully on a sandy beach at sunset...
Chinese: 一只金毛寻回犬在日落时分的沙滩上欢快奔跑...

--- JSON Structured Output ---
Version: 1.0
Scene Setting: outdoor
Camera Type: drone
Lighting Type: golden-hour
Motion Speed: 1.0
Output Resolution: 1024x576

--- API Formats ---
Available API formats: openai, runway, pika

--- Technical Specs ---
Technical specifications: { duration: 5, fps: 24, ... }

--- Tips ---
1. 电影级风格适合使用16:9或21:9比例
2. 添加浅景深效果增强电影感
3. 动态运动需要5秒以上时长才能充分展示
```

## Full Application Example

### Chat Agent Application
**Directory**: `chat-agent/`

A complete React-based chat application demonstrating real-world usage of SDKWork Browser Agent with a modern, interactive interface.

```bash
# Install dependencies
cd examples/chat-agent
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

**Features demonstrated**:
- React integration with TypeScript
- Real-time chat interface with typing indicators
- Skill loading UI with progress feedback
- MCP (Model Context Protocol) integration
- Execution monitoring and tracing
- Export functionality for conversations
- Theme switching (light/dark modes)
- Responsive design
- Advanced skill management

**Key components**:
- `PerfectChat` - Advanced chat interface with rich features
- `SmartChat` - Streamlined chat experience
- `SkillLoader` - Interactive skill loading and management
- `ExecutionMonitor` - Real-time execution tracking
- `MCPPanel` - Model Context Protocol integration

**Accessing the application**:
After starting the development server, open your browser to `http://localhost:5173` to access the chat application.

## Running Examples

### Prerequisites

1. **Install dependencies**:
```bash
# Root project dependencies
npm install

# For Chat Agent application (additional dependencies)
cd examples/chat-agent
npm install
```

2. **Set up environment variables** (for examples requiring API keys):

#### Windows (PowerShell):
```powershell
$env:OPENAI_API_KEY="your-api-key"
$env:ANTHROPIC_API_KEY="your-api-key"
$env:GEMINI_API_KEY="your-api-key"
```

#### macOS/Linux (bash):
```bash
export OPENAI_API_KEY="your-api-key"
export ANTHROPIC_API_KEY="your-api-key"
export GEMINI_API_KEY="your-api-key"
```

### Running Examples

#### Using ts-node

```bash
# Run specific example
npx ts-node examples/smart-agent-example.ts

# Run with custom tsconfig
npx ts-node --project tsconfig.json examples/mcts-decision-example.ts
```

#### Using tsx (faster)

```bash
# Install tsx globally (recommended for faster execution)
npm install -g tsx

# Run example
tsx examples/secure-agent-example.ts
```

#### Using Node.js directly (with compiled code)

```bash
# First compile TypeScript
npm run build

# Run compiled JavaScript
node dist/examples/smart-agent-example.js
```

## Example Structure

Each example follows a consistent structure to ensure readability and maintainability:

```typescript
/**
 * Example: [Name]
 *
 * Description of what this example demonstrates.
 * 
 * Key features demonstrated:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */

import { ... } from '../src';
import { Logger } from '../src/utils/logger';

const logger = new Logger({ level: 'info' }, 'ExampleName');

class ExampleClass {
  private resource: ResourceType | null = null;

  async initialize() {
    // Setup code and resource initialization
    logger.info('Initializing example...');
    // ...
  }

  async demonstrateFeature1() {
    // Feature demonstration with detailed logging
    logger.info('Demonstrating Feature 1...');
    // ...
  }

  async demonstrateFeature2() {
    // Feature demonstration with detailed logging
    logger.info('Demonstrating Feature 2...');
    // ...
  }

  async cleanup() {
    // Cleanup resources to avoid memory leaks
    logger.info('Cleaning up resources...');
    // ...
  }
}

// Run the example
async function main() {
  const example = new ExampleClass();
  try {
    await example.initialize();
    await example.demonstrateFeature1();
    await example.demonstrateFeature2();
    logger.info('Example completed successfully!');
  } catch (error) {
    logger.error('Example failed:', {}, error as Error);
  } finally {
    await example.cleanup();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing and reuse
export { ExampleClass };
```

## Creating Your Own Example

1. Create a new file in `examples/` directory
2. Import required modules from `../src`
3. Use the `Logger` for consistent output
4. Wrap in a class with `initialize()`, `demonstrate*()`, and `cleanup()` methods
5. Export the class and provide a `main()` function
6. Add documentation at the top of the file

## Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `OPENAI_API_KEY` | OpenAI API key | OpenAI examples |
| `ANTHROPIC_API_KEY` | Anthropic API key | Claude examples |
| `GEMINI_API_KEY` | Google Gemini API key | Gemini examples |

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors, ensure:
1. All dependencies are installed: `npm install`
2. TypeScript config is correct: `tsconfig.json`
3. Using correct import paths: `../src` not `sdkwork-browser-agent`

### API Key Errors

Examples requiring API keys will fail gracefully with a warning. To run these examples:
1. Obtain API keys from respective providers
2. Set them as environment variables
3. Or modify the example to use hardcoded keys (not recommended for production)

### Memory Issues

Some examples (like Vector Memory) may use significant memory. If you encounter issues:
- Reduce batch sizes
- Lower cache sizes
- Use smaller dimensions (e.g., 384 instead of 1536)

## Contributing

When adding new examples:
1. Follow the existing code structure
2. Add comprehensive comments
3. Include error handling
4. Add to this README
5. Test on both Node.js and browser environments (if applicable)

## License

MIT License - see LICENSE file for details
