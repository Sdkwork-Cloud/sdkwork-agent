# Agent Chat

A beautiful, ChatGPT-inspired chat interface for the SDKWork Browser Agent with conversation management, streaming responses, and skill selection.

![Agent Chat Screenshot](screenshot.png)

## Features

### 💬 Chat Interface
- **ChatGPT-inspired design** - Clean, modern UI with smooth animations
- **Streaming responses** - Real-time token-by-token response display
- **Message actions** - Copy messages with one click
- **Auto-scroll** - Automatically scrolls to latest messages

### 🗂️ Conversation Management
- **Multiple conversations** - Create and manage multiple chat sessions
- **Persistent storage** - Conversations saved to localStorage
- **Auto-generated titles** - Conversations titled based on first message
- **Quick actions** - Start common tasks with one click

### 🛠️ Skills System
- **Skill selection** - Type `/` to open skill picker
- **Visual indicators** - See which skills are active
- **Category organization** - Skills grouped by category
- **Smart defaults** - Automatic skill detection

### 🤖 Agent Configuration
- **Multiple providers** - OpenAI, Anthropic, Google Gemini, Doubao (豆包)
- **Easy setup** - Simple API key configuration
- **Evaluation system** - Optional response quality evaluation
- **Status indicator** - Visual connection status

### 📱 Responsive Design
- **Desktop optimized** - Sidebar navigation on large screens
- **Mobile friendly** - Collapsible sidebar for mobile devices
- **Touch friendly** - Large tap targets for mobile users

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build

```bash
npm run build
```

## Usage

### Starting a Conversation

1. **New Chat** - Click "New chat" button or select existing conversation
2. **Configure Agent** - Click status indicator to setup API key
3. **Send Message** - Type your message and press Enter
4. **View Response** - Watch the streaming response in real-time

### Using Skills

1. **Open Skill Panel** - Type `/` in the input box
2. **Select Skills** - Click on desired skills
3. **Send Message** - Skills will be applied to your request
4. **Clear Skills** - Click "Clear all" to remove selected skills

### Managing Conversations

- **Create** - Click "New chat" button
- **Switch** - Click on conversation in sidebar
- **Delete** - Hover and click × on conversation
- **Auto-title** - Titles generated from first message

## Project Structure

```
src/
├── components/
│   ├── Sidebar.tsx          # Conversation sidebar
│   ├── Sidebar.css
│   ├── ChatMessage.tsx      # Message bubble component
│   ├── ChatMessage.css
│   ├── ChatInput.tsx        # Input with auto-resize
│   ├── ChatInput.css
│   ├── SkillPanel.tsx       # Skill selection modal
│   ├── SkillPanel.css
│   └── AgentConfig.tsx      # Configuration panel
│   └── AgentConfig.css
├── hooks/
│   ├── useAgent.ts          # Agent integration
│   └── useConversations.ts  # Conversation management
├── types.ts                 # TypeScript types
├── App.tsx                  # Main application
├── App.css
└── main.tsx
```

## Configuration

### Supported Providers

| Provider | Base URL | Default Model |
|----------|----------|---------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-3.5-turbo` |
| Anthropic | `https://api.anthropic.com` | `claude-3-sonnet` |
| Google Gemini | `https://generativelanguage.googleapis.com` | `gemini-pro` |
| Doubao (豆包) | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-seed-1-8-251228` |

### Environment Variables

Create a `.env` file for default configuration:

```env
VITE_DEFAULT_PROVIDER=openai
VITE_DEFAULT_MODEL=gpt-3.5-turbo
```

## Features in Detail

### Streaming Responses

The app simulates streaming responses for a more interactive experience:

```typescript
const response = await streamMessage(content, selectedSkills, (chunk) => {
  // Update UI with each chunk
  updateMessage(conversationId, messageId, { content: chunk })
})
```

### Conversation Persistence

Conversations are automatically saved to localStorage:

```typescript
// Auto-save on change
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    conversations,
    currentConversationId
  }))
}, [conversations, currentConversationId])
```

### Skill System

Skills enhance the agent's capabilities:

- **math** - Mathematical calculations 🧮
- **translate** - Language translation 🌐
- **code-assistant** - Coding help 💻
- **summarize** - Text summarization 📝
- **weather** - Weather information 🌤️

## Customization

### Adding New Skills

Edit `useAgent.ts` to add new skills:

```typescript
const builtInSkills: Skill[] = [
  {
    name: 'your-skill',
    description: 'What it does',
    metadata: { 
      category: 'category',
      tags: ['tag1', 'tag2'],
      icon: '🔧'
    },
  },
  // ...
]
```

### Theming

The app uses CSS variables for easy theming. Edit `App.css`:

```css
:root {
  --primary-color: #19c37d;
  --bg-color: #ffffff;
  --text-color: #333333;
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Credits

- Design inspired by ChatGPT
- Icons from [Lucide](https://lucide.dev/)
- Built with React + TypeScript + Vite
