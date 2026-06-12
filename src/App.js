import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import chatSphereLogo from './assets/chatsphere_logo.png';
import userIcon from './assets/user-icon.png';
import { sendMsgToOpenAI } from './openAi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  MessageSquare, 
  Bookmark, 
  Settings, 
  Trash2, 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  Plus, 
  Search, 
  Home, 
  Download,
  Send,
  Sparkles,
  Paperclip,
  X
} from 'lucide-react';

// Copy Button Component for Code Blocks
const CopyCodeButton = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy}
      style={{ 
        background: 'transparent', 
        border: 'none', 
        color: 'inherit', 
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '4px',
        fontSize: '0.75rem'
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy code'}
    </button>
  );
};

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    isBot: true,
    text: "Hi! I'm **ChatSphere**, your intelligent AI assistant.\n\nI can help you with:\n\n- 💻 **Coding** — write, debug, and explain code\n- 📚 **Learning** — explain concepts clearly\n- 🎨 **Images** — generate AI images from text\n- 💬 **Conversations** — ask me anything!\n\nWhat would you like to explore today?",
    timestamp: new Date().toISOString()
  }
];

const formatMessageText = (text) => {
  if (!text) return '';
  return (
    <ReactMarkdown
      components={{
        img({ node, ...props }) {
          return (
            <img 
              {...props} 
              alt={props.alt || "AI Generated"} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '400px', 
                borderRadius: '12px', 
                margin: '12px 0', 
                border: '1px solid var(--border)', 
                display: 'block', 
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' 
              }} 
            />
          );
        },
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          const codeContent = String(children).replace(/\n$/, '');
          
          if (!match) {
            // Inline code
            return (
              <code 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  fontFamily: 'monospace', 
                  fontSize: '0.85em', 
                  color: '#a78bfa' 
                }} 
                {...props}
              >
                {children}
              </code>
            );
          }
          
          // Code block
          return (
            <div className="code-block-container" style={{ margin: '12px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div className="code-block-header" style={{ background: '#1e293b', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>{language}</span>
                <CopyCodeButton code={codeContent} />
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="pre"
                customStyle={{ margin: 0, padding: '16px', background: '#0b0f19', fontSize: '0.9rem' }}
                {...props}
              >
                {codeContent}
              </SyntaxHighlighter>
            </div>
          );
        }
      }}
    >
      {text}
    </ReactMarkdown>
  );
};

function App() {
  // Chat History thread management
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('chatsphere_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return [{
      id: 'default_chat',
      title: 'New Chat',
      messages: INITIAL_MESSAGES
    }];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return localStorage.getItem('chatsphere_active_chat_id') || 'default_chat';
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // API provider configurations (Fixed settings for Groq)
  const [provider] = useState(() => {
    return localStorage.getItem('api_provider') || 'groq';
  });

  const [model] = useState(() => {
    return localStorage.getItem('api_model') || (localStorage.getItem('api_provider') === 'openai' ? 'gpt-3.5-turbo' : 'llama-3.3-70b-versatile');
  });

  const [apiKey] = useState(() => {
    const activeProvider = localStorage.getItem('api_provider') || 'groq';
    if (activeProvider === 'openai') {
      return localStorage.getItem('openai_api_key') || process.env.REACT_APP_OPENAI_API_KEY || '';
    }
    return localStorage.getItem('groq_api_key') || process.env.REACT_APP_GROQ_API_KEY || '';
  });
  
  const [showProModal, setShowProModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [feedbackState, setFeedbackState] = useState({}); // { [msgId]: 'up' | 'down' }
  const [savedMessages, setSavedMessages] = useState(() => {
    const saved = localStorage.getItem('chatsphere_saved_messages');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  useEffect(() => {
    localStorage.setItem('chatsphere_saved_messages', JSON.stringify(savedMessages));
  }, [savedMessages]);

  const handleToggleSave = (msgId) => {
    setSavedMessages(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const chatsEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync chats to localStorage
  useEffect(() => {
    localStorage.setItem('chatsphere_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('chatsphere_active_chat_id', activeChatId);
  }, [activeChatId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatId, loading]);

  // Auto-resize textarea height smoothly without layout thrash
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const raf = requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
    return () => cancelAnimationFrame(raf);
  }, [input]);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0] || { id: 'default_chat', title: 'Default Chat', messages: INITIAL_MESSAGES };
  const messages = activeChat.messages;

  const handleSend = async (textToSend) => {
    const trimmed = textToSend.trim();
    if (!trimmed && !selectedImage) return;

    // Add user message
    const userMsg = {
      id: Date.now().toString(),
      isBot: false,
      text: trimmed,
      image: selectedImage,
      timestamp: new Date().toISOString()
    };

    setChats(prevChats => prevChats.map(c => {
      if (c.id === activeChatId) {
        const isInitial = c.messages.length === 1 && c.messages[0].id === 'welcome';
        let newTitle = c.title;
        if (isInitial) {
          const clean = trimmed.trim();
          const firstLine = clean.split('\n')[0].trim();
          newTitle = firstLine.length > 30 ? firstLine.substring(0, 30) + '...' : firstLine;
          newTitle = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
        }
        return {
          ...c,
          title: newTitle,
          messages: [...c.messages, userMsg]
        };
      }
      return c;
    }));

    setInput('');
    setSelectedImage(null);
    setLoading(true);

    // Check if it is a request for image generation
    const messageLower = trimmed.toLowerCase();
    const isImageRequest = 
      messageLower.startsWith('generate image') ||
      messageLower.startsWith('draw') ||
      messageLower.startsWith('paint') ||
      messageLower.startsWith('create an image') ||
      messageLower.startsWith('make an image') ||
      messageLower.startsWith('picture of') ||
      messageLower.startsWith('image of') ||
      messageLower.startsWith('photo of') ||
      messageLower.endsWith('image') ||
      messageLower.endsWith('photo') ||
      messageLower.endsWith('picture') ||
      messageLower.endsWith('drawing') ||
      messageLower.endsWith('painting') ||
      messageLower.endsWith('pic') ||
      messageLower.includes('show me a picture of') ||
      messageLower.includes('show me an image of') ||
      messageLower.includes('show me a photo of');

    if (isImageRequest) {
      let promptText = trimmed
        .replace(/(generate image of|generate image|draw a|draw|paint a|paint|create an image of|create an image|make an image of|make an image|picture of|image of|photo of|show me an image of|show me a picture of|show me a photo of)/gi, '')
        .trim();
      
      promptText = promptText
        .replace(/(image|photo|picture|drawing|painting|pic)$/gi, '')
        .trim();
        
      if (!promptText) {
        promptText = "beautiful futuristic city";
      }
      
      const encodedPrompt = encodeURIComponent(promptText);
      const seed = Math.floor(Math.random() * 99999);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=400&seed=${seed}&nologo=true`;
      
      // Simulate API call delay for image generation (no typing-stream for images)
      setTimeout(() => {
        const botMsg = {
          id: (Date.now() + 1).toString(),
          isBot: true,
          isImage: true,
          text: imageUrl,
          promptText: promptText,
          timestamp: new Date().toISOString()
        };
        
        setChats(prevChats => prevChats.map(c => {
          if (c.id === activeChatId) {
            return {
              ...c,
              messages: [...c.messages, botMsg]
            };
          }
          return c;
        }));
        
        setLoading(false);
      }, 1500);
      
      return;
    }

    try {
      // Pass conversation history (exclude welcome msg) for contextual answers
      const historyForAI = messages.filter(m => m.id !== 'welcome' && !m.isImage);
      const reply = await sendMsgToOpenAI(trimmed, apiKey, provider, model, historyForAI);
      
      const botMsgId = (Date.now() + 1).toString();
      const botMsg = {
        id: botMsgId,
        isBot: true,
        text: '', // Start empty to simulate streaming
        timestamp: new Date().toISOString()
      };
      
      setChats(prevChats => prevChats.map(c => {
        if (c.id === activeChatId) {
          return {
            ...c,
            messages: [...c.messages, botMsg]
          };
        }
        return c;
      }));

      // Typewriter/streaming logic
      let currentText = '';
      let index = 0;
      const words = reply.split(' ');
      
      const interval = setInterval(() => {
        if (index < words.length) {
          currentText += (index === 0 ? '' : ' ') + words[index];
          setChats(prevChats => prevChats.map(c => {
            if (c.id === activeChatId) {
              return {
                ...c,
                messages: c.messages.map(m => m.id === botMsgId ? { ...m, text: currentText } : m)
              };
            }
            return c;
          }));
          index++;
        } else {
          clearInterval(interval);
          setLoading(false); // Only stop loading when text is fully streamed
        }
      }, 25); // 25ms per word is highly fluid
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  const handleNewChat = () => {
    const newId = 'chat_' + Date.now();
    const newChatObj = {
      id: newId,
      title: 'New Chat',
      messages: INITIAL_MESSAGES
    };
    setChats(prev => [newChatObj, ...prev]);
    setActiveChatId(newId);
  };

  const handleDeleteChat = (e, chatIdToDelete) => {
    e.stopPropagation();
    
    if (chats.length <= 1) {
      alert("You must keep at least one active chat session.");
      return;
    }

    const filtered = chats.filter(c => c.id !== chatIdToDelete);
    setChats(filtered);

    if (activeChatId === chatIdToDelete) {
      setActiveChatId(filtered[0].id);
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  const handleFeedback = (id, type) => {
    setFeedbackState(prev => ({
      ...prev,
      [id]: prev[id] === type ? null : type
    }));
  };

  const handleExportChat = (format) => {
    if (!activeChat || activeChat.messages.length <= 1) {
      alert("There are no messages in this conversation to export.");
      return;
    }

    if (format === 'txt') {
      let exportText = `CHAT CONVERSATION HISTORY: ${activeChat.title}\n`;
      exportText += `Exported on: ${new Date().toLocaleString()}\n`;
      exportText += `==========================================\n\n`;

      activeChat.messages.forEach((msg, idx) => {
        if (idx === 0 && msg.id === 'welcome') return;
        const role = msg.isBot ? 'ChatSphere' : 'You';
        exportText += `[${role}]:\n${msg.text}\n\n`;
        exportText += `------------------------------------------\n\n`;
      });

      const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_conversation.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'html') {
      let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conversation: ${activeChat.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
    }
    h1 {
      border-bottom: 2px solid #334155;
      padding-bottom: 12px;
      font-size: 1.8rem;
      color: #8b5cf6;
    }
    .meta {
      color: #94a3b8;
      font-size: 0.85rem;
      margin-bottom: 30px;
    }
    .message {
      margin-bottom: 24px;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .message.user {
      background: #1e1b4b;
      border-color: #4338ca;
    }
    .message.bot {
      background: #1e293b;
      border-color: #334155;
    }
    .role {
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .role.user { color: #a5b4fc; }
    .role.bot { color: #d8b4fe; }
    .content {
      font-size: 0.95rem;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      margin-top: 60px;
      font-size: 0.8rem;
      color: #64748b;
      border-top: 1px solid #334155;
      padding-top: 20px;
    }
    @media print {
      body { background: white; color: black; margin: 20px; }
      .message { border-color: #ccc; page-break-inside: avoid; }
      .message.user { background: #f3f4f6; }
      .message.bot { background: #ffffff; }
      .role.user { color: #1e40af; }
      .role.bot { color: #6b21a8; }
      h1 { border-color: #ccc; }
    }
  </style>
</head>
<body>
  <h1>${activeChat.title}</h1>
  <div class="meta">Exported on: ${new Date().toLocaleString()}</div>
  
  <div class="messages-list">`;

      activeChat.messages.forEach((msg, idx) => {
        if (idx === 0 && msg.id === 'welcome') return;
        const role = msg.isBot ? 'ChatSphere' : 'You';
        const roleClass = msg.isBot ? 'bot' : 'user';
        htmlContent += `
    <div class="message ${roleClass}">
      <div class="role ${roleClass}">${role}</div>
      <div class="content">${msg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>`;
      });

      htmlContent += `
  </div>
  <div class="footer">Generated by ChatSphere. Press Ctrl+P to save as PDF or Print.</div>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_conversation.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    setShowExportModal(false);
  };

  // Filter chats by search query
  const filteredChats = chats.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="App">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="upperSidebar">
          <div className="uppersidetop">
            <img src={chatSphereLogo} alt="ChatSphere logo" className="logo" style={{ borderRadius: '50%' }} />
            <span className="brand">ChatSphere</span>
          </div>
          
          <button className="midbtn" onClick={handleNewChat}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            New Chat
          </button>
          
          {/* Chat Search Box */}
          <div className="search-container">
            <Search className="search-icon" size={14} />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Previous Chats History List */}
          <div className="uppersidebottom">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '8px' }}>
              Chat History
            </div>
            
            {filteredChats.map(c => (
              <div 
                key={c.id} 
                className={`query ${c.id === activeChatId ? 'active-chat' : ''}`}
                onClick={() => setActiveChatId(c.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  background: c.id === activeChatId ? 'var(--card)' : 'transparent',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  position: 'relative',
                  width: '100%',
                  minHeight: '44px',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '85%', textAlign: 'left' }}>
                  <MessageSquare size={16} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </span>
                </div>
                
                {chats.length > 1 && (
                  <button 
                    onClick={(e) => handleDeleteChat(e, c.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.4,
                      padding: '4px'
                    }}
                    title="Delete Chat"
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.4}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lowerSidebar">
          <div 
            className="listitem active"
            onClick={() => setActiveChatId(chats[0]?.id || 'default_chat')}
          >
            <Home size={18} />
            Home
          </div>

          <div 
            className="listitem" 
            onClick={() => setShowExportModal(true)}
          >
            <Download size={18} />
            Export Chat
          </div>

          <div 
            className="listitem" 
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings size={18} />
            Settings
          </div>

          <div className="listitem" onClick={() => setShowProModal(true)}>
            <Sparkles size={18} />
            Upgrade to Pro
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main">
        {/* Chat / Messages view */}
        <div className="chats-container" style={{ overflowAnchor: 'none' }}>
          <div className="chat-container">
            {messages.length === 1 && messages[0].id === 'welcome' && (
              <div className="welcome-container">
                <div className="welcome-header">
                  <span className="welcome-icon">🌐</span>
                  <h2 className="welcome-title">Welcome to ChatSphere</h2>
                  <p className="welcome-subtitle">Your intelligent AI assistant — ask anything.</p>
                </div>
                <div className="features-grid">
                  <button className="feature-card" onClick={() => handleSend("Explain React component state")}>
                    Explain React
                  </button>
                  <button className="feature-card" onClick={() => handleSend("What is Java collections framework")}>
                    What is Java
                  </button>
                  <button className="feature-card" onClick={() => handleSend("Provide a DSA roadmap for beginners")}>
                    DSA Roadmap
                  </button>
                </div>
              </div>
            )}

            {/* Render the chat messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`chats ${msg.isBot ? 'bot' : 'user'}`}>
                <img src={msg.isBot ? chatSphereLogo : userIcon} alt={msg.isBot ? "ChatSphere" : "You"} style={msg.isBot ? { borderRadius: '50%' } : {}} />
                <div className="text-content">
                  {msg.image && (
                    <img src={msg.image} alt="attached content" className="message-image" />
                  )}
                  {msg.isImage ? (
                    <div className="text" style={{ padding: '4px 0' }}>
                      <p style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        🎨 Generated image for: <strong>"{msg.promptText}"</strong>
                      </p>
                      <img 
                        src={msg.text} 
                        alt={msg.promptText || "Generated content"} 
                        className="chat-image" 
                      />
                    </div>
                  ) : (
                    msg.text && <div className="text">{formatMessageText(msg.text)}</div>
                  )}
                  
                  {/* Message Action Utilities */}
                  {msg.isBot && (
                    <div className="message-actions">
                      <button 
                        className="msg-action-btn"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>

                      <button
                        className={`msg-action-btn ${feedbackState[msg.id] === 'up' ? 'active' : ''}`}
                        onClick={() => handleFeedback(msg.id, 'up')}
                        title="Thumbs up"
                        style={{ color: feedbackState[msg.id] === 'up' ? '#10B981' : '' }}
                      >
                        <ThumbsUp size={14} />
                      </button>

                      <button
                        className={`msg-action-btn ${feedbackState[msg.id] === 'down' ? 'active' : ''}`}
                        onClick={() => handleFeedback(msg.id, 'down')}
                        title="Thumbs down"
                        style={{ color: feedbackState[msg.id] === 'down' ? '#EF4444' : '' }}
                      >
                        <ThumbsDown size={14} />
                      </button>

                      <button
                        className={`msg-action-btn ${savedMessages[msg.id] ? 'active' : ''}`}
                        onClick={() => handleToggleSave(msg.id)}
                        title={savedMessages[msg.id] ? "Saved" : "Save message"}
                        style={{ color: savedMessages[msg.id] ? '#FBBF24' : '' }}
                      >
                        <Bookmark size={14} fill={savedMessages[msg.id] ? '#FBBF24' : 'none'} />
                        {savedMessages[msg.id] ? 'Saved' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="typing-indicator-container">
                <div className="typing-label">ChatSphere is thinking...</div>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}

            <div ref={chatsEndRef} />
          </div>
        </div>

        {/* Footer Chat Input Area */}
        <div className="chatfooter">
          <form className="input-container" onSubmit={handleSubmit} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
            {selectedImage && (
              <div className="image-preview-container" style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '4px', padding: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', width: 'fit-content', border: '1px solid var(--border)' }}>
                <img src={selectedImage} alt="preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                <button 
                  type="button" 
                  onClick={() => setSelectedImage(null)}
                  style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', width: '100%', gap: '10px' }}>
              <button 
                type="button" 
                className="action-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', marginBottom: '2px' }}
                title="Attach Image"
              >
                <Paperclip size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleImageSelect} 
                style={{ display: 'none' }} 
              />
              <textarea 
                ref={textareaRef}
                className="message-input" 
                placeholder="Send a message..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
                rows={1}
                disabled={loading}
              />
              <div className="input-actions" style={{ marginBottom: '2px' }}>
                <button 
                  type="submit" 
                  className="send" 
                  disabled={(!input.trim() && !selectedImage) || loading}
                >
                  <Send size={16} color="white" />
                </button>
              </div>
            </div>
          </form>
          <p className="disclaimer">
            ChatSphere may occasionally produce inaccurate information. Verify important facts independently.
          </p>
        </div>
      </div>

      {/* Upgrade to Pro Modal */}
      {showProModal && (
        <div className="modal-overlay" onClick={() => setShowProModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Upgrade to ChatSphere Pro</h3>
              <button className="modal-close" onClick={() => setShowProModal(false)}>&times;</button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
                $20<span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/month</span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Get access to GPT-4 level models and zero limits.</p>
            </div>

            <ul className="pro-features">
              <li>Access to GPT-4o, GPT-4, and advanced reasoning models</li>
              <li>Up to 5x more message capacity</li>
              <li>High-speed generation during peak hours</li>
              <li>Early access to new features and capabilities</li>
            </ul>

            <div className="modal-actions" style={{ justifyContent: 'stretch' }}>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px' }}
                onClick={() => {
                  alert('Thank you for choosing ChatSphere Pro! This is a demo.');
                  setShowProModal(false);
                }}
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Chat Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📄 Export Chat History</h3>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Choose a format to download the complete active conversation logs.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '12px', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}
                onClick={() => handleExportChat('txt')}
              >
                Download Plain Text (.txt)
              </button>

              <button 
                className="btn-primary" 
                style={{ padding: '12px', background: '#8B5CF6' }}
                onClick={() => handleExportChat('html')}
              >
                Download Print-Ready HTML (.html)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Read-Only) */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">System Settings</h3>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>API Configuration Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981', fontSize: '0.85rem', fontWeight: 500 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                  Connected to Groq Cloud API
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Active Model</label>
                <input 
                  type="text" 
                  className="search-input" 
                  value="llama-3.1-8b-instant" 
                  readOnly 
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.4)', color: 'var(--text)', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>API Endpoint</label>
                <input 
                  type="text" 
                  className="search-input" 
                  value="https://api.groq.com/openai/v1/chat/completions" 
                  readOnly 
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.4)', color: 'var(--text)', cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', marginTop: '4px' }}>
                <span style={{ color: '#FBBF24' }}>⚠️</span>
                <span>Settings are locked by the system administrator to maintain performance.</span>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '10px' }}
                onClick={() => setShowSettingsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
