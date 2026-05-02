import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import type { ChatMessage } from '../types';
import { SourceCitations } from './SourceCitations';
import { GuardrailBadge } from './GuardrailBadge';

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (message: string) => void;
}

export function ChatWindow({ messages, loading, onSend }: ChatWindowProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput('');
    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-amber-500" />
            </div>
            <h2 className="font-display text-2xl text-ink-800 mb-2">Ask your documents</h2>
            <p className="text-sm text-ink-400 max-w-sm">
              Upload documents on the left, then ask questions. I'll find answers with source citations.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={clsx('flex gap-3 animate-slide-up', msg.role === 'user' ? 'justify-end' : '')}
            style={{ animationDelay: `${(i % 3) * 80}ms` }}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}

            <div
              className={clsx(
                'max-w-[75%] rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-ink-800 text-ink-50'
                  : 'bg-white border border-ink-100 shadow-sm'
              )}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-headings:font-display prose-p:text-ink-700 prose-strong:text-ink-800 prose-code:text-amber-600 prose-code:bg-amber-50 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}

              {/* Source citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-ink-100">
                  <SourceCitations sources={msg.sources} />
                </div>
              )}

              {/* Guardrail badge */}
              {msg.guardrail && (
                <GuardrailBadge guardrail={msg.guardrail} />
              )}

              {/* Metadata footer */}
              {msg.role === 'assistant' && msg.tokens_used && (
                <div className="flex gap-3 mt-2 pt-2 border-t border-ink-50">
                  <span className="text-[10px] text-ink-300 font-mono">
                    {msg.tokens_used} tokens
                  </span>
                  <span className="text-[10px] text-ink-300 font-mono">
                    {msg.latency_ms?.toFixed(0)}ms
                  </span>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-ink-200 flex items-center justify-center mt-0.5">
                <User className="w-3.5 h-3.5 text-ink-500" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-ink-100 rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-ink-300 rounded-full animate-pulse-soft" />
                <span className="w-2 h-2 bg-ink-300 rounded-full animate-pulse-soft" style={{ animationDelay: '300ms' }} />
                <span className="w-2 h-2 bg-ink-300 rounded-full animate-pulse-soft" style={{ animationDelay: '600ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-ink-100 bg-white/80 backdrop-blur-sm p-4">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            rows={1}
            className="flex-1 resize-none bg-ink-50 border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 transition-all"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className={clsx(
              'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200',
              input.trim() && !loading
                ? 'bg-ink-800 text-white hover:bg-ink-700 active:scale-95'
                : 'bg-ink-100 text-ink-300 cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
