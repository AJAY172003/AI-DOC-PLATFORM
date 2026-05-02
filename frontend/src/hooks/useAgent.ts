import { useCallback, useState } from 'react';
import type { AgentMessage } from '../types';
import { sendAgentMessage } from '../services/api';

let counter = 0;
const genId = () => `agent_${Date.now()}_${++counter}`;

export function useAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (question: string, documentIds?: string[]) => {
    const userMsg: AgentMessage = {
      id: genId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const response = await sendAgentMessage(question, documentIds);
      const agentMsg: AgentMessage = {
        id: genId(),
        role: 'agent',
        content: response.answer,
        tool_calls: response.tool_calls,
        is_report: response.is_report,
        latency_ms: response.latency_ms,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMsg]);
      return response;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Agent failed to respond';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: 'agent', content: `Error: ${msg}`, timestamp: new Date() },
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
