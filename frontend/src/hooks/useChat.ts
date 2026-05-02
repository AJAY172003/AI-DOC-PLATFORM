import { useCallback, useState } from 'react';
import type { ChatMessage } from '../types';
import { sendMessage } from '../services/api';

let msgCounter = 0;
const genId = () => `msg_${Date.now()}_${++msgCounter}`;

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (question: string, documentIds?: string[]) => {
    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const response = await sendMessage(question, documentIds);
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        tokens_used: response.tokens_used,
        latency_ms: response.latency_ms,
        guardrail: response.guardrail,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return response;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to get response';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: 'assistant', content: `Error: ${msg}`, timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, send, clear };
}
