'use client';
import { useState, useRef, useEffect } from 'react';
import styles from './AiAssistantPanel.module.css';

interface Message { role: 'user' | 'assistant'; text: string; }

const MOCK_REPLIES: Record<string, string> = {
  default: "I'm here to help with your financial insights! Try asking me about your largest expenses or spending trends.",
  largest: 'Your largest expense this month is **Groceries at LKR 18,500**, followed by Food & Dining at LKR 12,900.',
  trend: 'Your spending trend shows a 12% decrease compared to last week. You spent LKR 4,800 today.',
  saving: 'Based on your current pattern, you could save approximately LKR 8,000/month by reducing Food & Dining by 20%.',
};

function getReply(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('largest') || lower.includes('most') || lower.includes('biggest')) return MOCK_REPLIES.largest;
  if (lower.includes('trend') || lower.includes('week')) return MOCK_REPLIES.trend;
  if (lower.includes('save') || lower.includes('saving')) return MOCK_REPLIES.saving;
  return MOCK_REPLIES.default;
}

export default function AiAssistantPanel() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Show me my largest expenses this month.' },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, { role: 'assistant', text: getReply(text) }]);
    }, 1000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (!open) {
    return (
      <button
        id="btn-open-ai-assistant"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label="Open AI Assistant"
      >
        ✦
      </button>
    );
  }

  return (
    <div className={styles.panel} role="dialog" aria-label="AI Assistant">
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.headerTitle}>✦ AI Assistant</span>
        <div className={styles.headerActions}>
          <button id="btn-minimize-ai" className={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Minimize">–</button>
          <button id="btn-close-ai" className={styles.iconBtn} onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} className={`${styles.bubble} ${m.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
            {m.text}
          </div>
        ))}
        {typing && (
          <div className={`${styles.bubble} ${styles.aiBubble} ${styles.typingBubble}`}>
            <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputRow}>
        <input
          id="ai-assistant-input"
          className={styles.input}
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button id="btn-send-ai" className={styles.sendBtn} onClick={send} aria-label="Send">›</button>
      </div>
    </div>
  );
}
