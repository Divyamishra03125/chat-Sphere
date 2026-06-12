# 🌐 ChatSphere — AI Assistant

A modern, feature-rich AI chat application built with React. ChatSphere delivers a premium ChatGPT-like experience with a clean dark UI, markdown rendering, image generation, and conversation history.

---

## ✨ Features

- 💬 **Real AI Responses** — powered by Groq Cloud (Llama 3.3 70B) or OpenAI
- 🧠 **Conversation Memory** — full chat history sent with every request for contextual answers
- 🎨 **AI Image Generation** — type "image of..." and get a real AI-generated image via Pollinations AI
- 📝 **Markdown Rendering** — headings, bold, code blocks, tables, bullet points all rendered beautifully
- 🌗 **Dark Mode UI** — sleek dark navy theme with glassmorphism effects
- 💾 **Chat History** — multiple conversations saved in localStorage, switchable from sidebar
- 🔍 **Search Chats** — search through your conversation history
- 📋 **Copy / Like / Save** — message action buttons on hover
- 📤 **Export Chat** — download as `.txt` or print-ready `.html`
- ⌨️ **Auto-resize Input** — textarea grows as you type, just like ChatGPT
- ✨ **Typing Indicator** — animated dots while AI is thinking
- 📎 **Image Upload** — attach images to your messages

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A free [Groq API key](https://console.groq.com) (or OpenAI key)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/chatsphere.git
cd chatsphere

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your Groq API key inside .env

# Start the development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# Groq API Key (Free tier — recommended)
REACT_APP_GROQ_API_KEY=your_groq_api_key_here

# OpenAI API Key (Optional, paid)
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
```

Get your free Groq key at → [https://console.groq.com](https://console.groq.com)

---

## 🛠️ Tech Stack

| Tech | Purpose |
|---|---|
| React 19 | UI framework |
| Groq Cloud API | AI language model (Llama 3.3 70B) |
| Pollinations AI | Image generation |
| react-markdown | Markdown rendering |
| react-syntax-highlighter | Code block highlighting |
| lucide-react | Icons |
| CSS (Vanilla) | Styling — no Tailwind |

---

## 📁 Project Structure

```
src/
├── App.js          # Main app component
├── App.css         # All styles
├── openAi.js       # API handler (Groq / OpenAI)
├── assets/
│   ├── chatsphere_logo.png
│   └── user-icon.png
└── index.js
```

---

## 📸 Preview

> Dark mode chat UI with markdown, code blocks, image generation and sidebar history.

---

## 📄 License

MIT License — free to use and modify.

---

Made with ❤️ by Divya Mishra
