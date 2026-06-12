/**
 * Helper to communicate with the Groq API with full conversation history support.
 * @param {string} message - The user's latest message
 * @param {string} apiKey - API key
 * @param {string} provider - 'groq' or 'openai'
 * @param {string} model - Model name override
 * @param {Array} history - Previous messages [{role:'user'|'assistant', content:'...'}]
 */
export async function sendMsgToOpenAI(message, apiKey = '', provider = 'openai', model = '', history = []) {
  // If user requests an image, generate a live image link
  const messageLower = message.toLowerCase().trim();
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
    let promptText = message
      .replace(/(generate image of|generate image|draw a|draw|paint a|paint|create an image of|create an image|make an image of|make an image|picture of|image of|photo of|show me an image of|show me a picture of|show me a photo of)/gi, '')
      .trim();
    
    // Also remove trailing trigger words
    promptText = promptText
      .replace(/(image|photo|picture|drawing|painting|pic)$/gi, '')
      .trim();
      
    if (!promptText) {
      promptText = "beautiful futuristic city";
    }
    
    const encodedPrompt = encodeURIComponent(promptText);
    const seed = Math.floor(Math.random() * 99999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=600&height=400&seed=${seed}&nologo=true`;
    return `Sure! Here is the AI-generated image of **"${promptText}"** 🎨

![Generated Image](${imageUrl})

Let me know if you'd like a different style or variation!`;
  }

  const activeProvider = provider || 'openai';
  let activeKey = apiKey ? apiKey.trim() : '';

  // Fallback to environment variables if no key is provided in arguments
  if (!activeKey || activeKey.includes('your_')) {
    if (activeProvider === 'groq') {
      activeKey = (process.env.REACT_APP_GROQ_API_KEY || '').trim();
    } else {
      activeKey = (process.env.REACT_APP_OPENAI_API_KEY || '').trim();
    }
  }

  // Treat placeholder strings as empty keys to prevent calling APIs with dummy values
  if (activeKey.includes('your_') || !activeKey) {
    activeKey = '';
  }

  // If a key exists, make the API call
  if (activeKey) {
    try {
      let url = 'https://api.openai.com/v1/chat/completions';
      let selectedModel = model || 'gpt-3.5-turbo';

      if (activeProvider === 'groq') {
        url = 'https://api.groq.com/openai/v1/chat/completions';
        selectedModel = model || 'llama-3.3-70b-versatile';
        if (selectedModel === 'llama3-8b-8192') {
          selectedModel = 'llama-3.1-8b-instant';
        }
      }

      const systemPrompt = {
        role: 'system',
        content: `You are ChatSphere, a highly accurate, intelligent, and helpful AI assistant.

## Identity
Your name is ChatSphere. Never say you are ChatGPT, GPT-4, or made by OpenAI. You are ChatSphere.

## Accuracy Rules (CRITICAL — always follow)
- Only state facts you are confident about.
- If you are unsure, say "I'm not certain, but..." or "You may want to verify this."
- Never fabricate statistics, names, dates, or URLs.
- For current events after 2024, say your knowledge may be outdated.
- For medical, legal, or financial questions, recommend consulting a professional.
- Use the conversation history provided to give contextual, relevant answers.

## Formatting Rules (always follow)
- Use Markdown: headings (##), bold (**text**), bullet points (- item), numbered lists.
- Short paragraphs only (2-4 lines max). No walls of text.
- Add a blank line between sections.
- Use triple-backtick code blocks with language tags for ALL code.
- Structure long answers as: Brief intro → Key Points → Example (if needed) → Summary.
- Only include code if the user asks for it or it is clearly a programming question.

## Tone
- Be friendly, clear, and concise.
- Avoid filler phrases like "Certainly!", "Of course!", "Great question!".
- Get straight to the answer.`
      };

      // Build messages: system + last 10 conversation turns + current user message
      const historyMessages = history.slice(-10).map(h => ({
        role: h.isBot ? 'assistant' : 'user',
        content: h.text || ''
      })).filter(h => h.content.trim());

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            systemPrompt,
            ...historyMessages,
            { role: 'user', content: message }
          ],
          temperature: 0.65,
          max_tokens: 2048
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `API error (Status ${response.status})`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error(`Request to ${activeProvider} failed:`, error);
      // Fallback to local ChatGPT Pro mock on API failures but display warning
      return `⚠️ **Connection Error:** ${error.message}\n\nCheck your API key or internet settings. Here is a fallback response:\n\n` + getMockResponse(message);
    }
  }

  // Fallback to smart local responses if no key is available
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getMockResponse(message));
    }, 800);
  });
}

function getMockResponse(message) {
  const query = message.toLowerCase().trim();

  // Match "what is programming" or specific languages & common misspellings (e.g., javscript, js, python, java)
  if (
    query.includes('programming') || 
    query.includes('program') || 
    query.includes('code') || 
    query.includes('coding') ||
    query.includes('javascript') ||
    query.includes('javscript') ||
    query.includes('js') ||
    query.includes('python') ||
    query.includes('java') ||
    query.includes('html') ||
    query.includes('typescript') ||
    query.includes('cpp') ||
    query.includes('c++')
  ) {
    return `**Programming** is the process of design, construction, and execution of a set of logical instructions (code) that a computer can perform. Programming allows us to build websites, mobile applications, database systems, artificial intelligence models, and backend architectures.

Here is a practical example of a function in **JavaScript** that calculates recursive values:

\`\`\`javascript
// Calculate the factorial of a number using recursion
function calculateFactorial(num) {
  // Base case
  if (num === 0 || num === 1) {
    return 1;
  }
  // Recursive step
  return num * calculateFactorial(num - 1);
}

// Running the function
const result = calculateFactorial(5);
console.log(\`Factorial of 5 is: \${result}\`);
// Output: "Factorial of 5 is: 120"
\`\`\`

### Best Practices in Software Development:
* **Write Readability First:** Structure code cleanly using meaningful names for functions and variables.
* **Modular Architecture:** Keep functions small, testable, and focused on a single responsibility.
* **Continuous Testing:** Write unit and integration tests to verify edge cases and prevent regressions.`;
  }

  // Match "how to use an api" or similar
  if (query.includes('use an api') || query.includes('how to use api') || query.includes('api') || query.includes('endpoint')) {
    return `An **API (Application Programming Interface)** is a set of protocols that allows different software applications to communicate and exchange data. Most modern web applications expose REST or GraphQL APIs over HTTPS, accepting requests and returning data in JSON format.

Here is a clean implementation of invoking a public API using modern JavaScript's \`async/await\` structure:

\`\`\`javascript
// Fetch user metadata from GitHub
async function fetchUserProfile(username) {
  const url = \`https://api.github.com/users/\${username}\`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP request failed with status: \${response.status}\`);
    }
    const data = await response.json();
    return {
      username: data.login,
      name: data.name,
      repos: data.public_repos
    };
  } catch (error) {
    console.error('Failed to fetch profile:', error.message);
    return null;
  }
}

// Invoke the call
fetchUserProfile('octocat').then(profile => {
  if (profile) console.log('Successfully loaded profile:', profile);
});
\`\`\`

### Key Best Practices for API Integration:
* **Handle Exceptions:** Wrap network operations in \`try/catch\` blocks to catch connection dropouts and timeout anomalies.
* **Secure Authorization:** Pass sensitive secrets or tokens inside headers (\`Authorization: Bearer <token>\`), never inside search parameters.
* **Check Status Codes:** Confirm headers and response validity before processing content.`;
  }

  // Match React queries
  if (query.includes('react') || query.includes('component') || query.includes('hook') || query.includes('state')) {
    return `**React** is a declarative, component-based library for building user interfaces. React manages rendering processes efficiently by utilizing a virtual representation of the browser's Document Object Model (DOM).

Here is a functional React component demonstrating state management and side effects using \`useState\` and \`useEffect\`:

\`\`\`jsx
import React, { useState, useEffect } from 'react';

function UserProfileLoader({ userId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(\`https://api.github.com/users/\${userId}\`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setProfile(data);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) return <div>Loading profile data...</div>;

  return (
    <div className="profile-card">
      <img src={profile.avatar_url} alt={profile.name} style={{ width: '60px' }} />
      <h3>{profile.name}</h3>
      <p>{profile.bio}</p>
    </div>
  );
}
\`\`\`

### React Implementation Best Practices:
* **Memoize Handlers:** Use \`useCallback\` and \`useMemo\` to prevent redundant calculations and re-renders in optimized child modules.
* **Cleanup Effects:** Always return a cleanup handler from \`useEffect\` to invalidate subscriptions, intervals, or ongoing fetch operations.
* **State Structuring:** Avoid redundant state fields; compute values dynamically during render cycles where possible.`;
  }

  // Match CSS queries
  if (query.includes('css') || query.includes('style') || query.includes('flexbox') || query.includes('grid')) {
    return `**CSS (Cascading Style Sheets)** is used to style elements and manage document layout. Modern layout frameworks like **Flexbox** and **CSS Grid** allow developers to design highly responsive, dynamic grids.

Here is a clean CSS implementation establishing a responsive layout structure using CSS Grid:

\`\`\`css
/* Responsive CSS Grid Container */
.grid-container {
  display: grid;
  /* Automatically columns based on width constraints */
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  padding: 32px;
  background: var(--bg);
}

/* Premium Card Element */
.grid-card {
  background: var(--sidebar);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.grid-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}
\`\`\``;
  }

  // Match temperature, weather
  if (query.includes('temp') || query.includes('weather') || query.includes('forecast') || query.includes('hot') || query.includes('cold')) {
    return `While I don't have access to live meteorological feeds or physical thermometers in your local room, a standard comfortable ambient room temperature is typically around **20°C to 22°C (68°F to 72°F)**. 

If you are experiencing extreme heat or cold outdoors, make sure to adjust your thermostat accordingly and stay hydrated! Tell me, what is the weather like where you are right now?`;
  }

  // Match jokes
  if (query.includes('joke') || query.includes('jokes') || query.includes('funny') || query.includes('laugh')) {
    return `Here is a developer joke for you!

**Why do programmers wear glasses?**
*Because they can't C#!* 😄

Here's another one:
**Why did the HTML element break up with the React component?**
*Because it felt like they had no state in common!*`;
  }

  // Match time/date
  if (query.includes('time') || query.includes('date') || query.includes('clock') || query.includes('day')) {
    return `I don't have a direct connection to your local device's clock to query the current minutes or seconds. However, you can instantly find it in the bottom-right corner of your desktop taskbar, or at the top of your phone screen!

If you need help calculations with dates, converting time zones, or parsing timestamps in programming, I would be happy to write a script for you!`;
  }

  // Match greetings
  if (
    query === 'hello' || 
    query === 'hi' || 
    query === 'hii' || 
    query === 'hiii' || 
    query === 'hey' || 
    query === 'hola' || 
    query === 'greetings' || 
    query.includes('good morning') || 
    query.includes('good afternoon')
  ) {
    return `Hey! I'm **ChatSphere**, your AI assistant.

I can help you with coding, answering questions, generating images, and more.

What would you like to explore today?`;
  }

  // Match "how are you"
  if (query.includes('how are you') || query.includes('how is it going') || query.includes("how's it going")) {
    return `I'm doing great and ready to help!

What are you working on today?`;
  }

  // Match general info queries (who are you, help)
  if (query.includes('who are you') || query.includes('your name') || query.includes('introduce yourself') || query.includes('what are you')) {
    return `I'm **ChatSphere** — an intelligent AI assistant built to help you learn, code, and explore ideas.

## What I can do

- 💻 **Code** — write, explain, and debug in any language
- 📚 **Explain** — break down complex topics clearly
- 🎨 **Generate images** — describe what you want and I'll create it
- 💬 **Chat** — answer questions on almost any topic

Just type what you need and I'll get right to it!`;
  }

  // Default fallback for anything else
  return `That's an interesting question! To give you the most accurate answer, could you share a bit more detail?

I can help with coding, explanations, image generation, math, general knowledge, and more. Just ask!`;
}
