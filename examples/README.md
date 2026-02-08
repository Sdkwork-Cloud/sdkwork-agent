# SDKWork Agent Examples

This directory contains examples demonstrating the capabilities of SDKWork Agent.

## Structure

- `chat-agent/` - A complete React-based chat application

## Running Examples

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Windows (PowerShell)
$env:OPENAI_API_KEY="your-api-key"

# macOS/Linux (bash)
export OPENAI_API_KEY="your-api-key"
```

### Chat Agent Application

A complete React-based chat application demonstrating real-world usage.

```bash
cd examples/chat-agent
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

## Documentation Examples

For comprehensive code examples, please refer to the documentation:

- [Basic Examples](../docs/examples/basic.md) - Hello World, Skill usage, Tool usage
- [Streaming Examples](../docs/examples/streaming.md) - Real-time streaming responses
- [Advanced Examples](../docs/examples/advanced.md) - RAG, multi-agent collaboration, workflows

## License

MIT License
