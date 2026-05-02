import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, Bot, User, Download, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import { useAgent } from '../hooks/useAgent';
import { useDocuments } from '../hooks/useDocuments';
import { FileUploader } from '../components/FileUploader';
import { DocList } from '../components/DocList';
import { ToolCallsTrace } from '../components/ToolCallsTrace';

const SUGGESTED_PROMPTS = [
  { label: '📋 Summarize', text: 'Summarize all uploaded documents' },
  { label: '🔍 Key Facts', text: 'What are the most important facts and figures in these documents?' },
  { label: '⚖️ Compare', text: 'Compare the main points across all documents' },
  { label: '📄 Report', text: 'Generate an executive report from all documents' },
];

export function AgentPage() {
  const { messages, loading, send, clear } = useAgent();
  const { documents, uploading, upload, remove } = useDocuments();
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (text?: string) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    send(q, selectedDocIds.length > 0 ? selectedDocIds : undefined);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const downloadReport = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docmind-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-ink-100 bg-ink-50/50 flex flex-col">
        <div className="p-4 border-b border-ink-100">
          <h2 className="font-display text-lg text-ink-800 mb-3">Documents</h2>
          <FileUploader onUpload={upload} uploading={uploading} />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {selectedDocIds.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-amber-600 font-medium">
                {selectedDocIds.length} selected
              </span>
              <button onClick={() => setSelectedDocIds([])} className="text-xs text-ink-400 hover:text-ink-600">
                Clear
              </button>
            </div>
          )}
          <DocList
            documents={documents}
            selectedIds={selectedDocIds}
            onToggleSelect={(id) =>
              setSelectedDocIds((prev) =>
                prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
              )
            }
            onDelete={remove}
          />
        </div>
      </div>

      {/* Main agent area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100 bg-white/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-800">DocMind Agent</p>
              <p className="text-[10px] text-ink-400">Uses tools: Search · Summarize · Compare · Export</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clear}
              className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center mb-4">
                <Bot className="w-7 h-7 text-purple-500" />
              </div>
              <h2 className="font-display text-2xl text-ink-800 mb-2">DocMind Agent</h2>
              <p className="text-sm text-ink-400 max-w-sm mb-6">
                I can search, summarize, compare, and generate reports from your documents — automatically choosing the right tools.
              </p>

              {/* Suggested prompts */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => handleSend(p.text)}
                    disabled={documents.filter(d => d.status === 'ready').length === 0}
                    className="p-3 text-left rounded-xl border border-ink-200 bg-white hover:border-purple-300 hover:bg-purple-50/30 transition-all text-xs text-ink-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="font-medium">{p.label}</span>
                    <p className="text-ink-400 mt-0.5 text-[10px] leading-relaxed">{p.text}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx('flex gap-3 animate-slide-up', msg.role === 'user' ? 'justify-end' : '')}
            >
              {msg.role === 'agent' && (
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}

              <div
                className={clsx(
                  'max-w-[78%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-ink-800 text-ink-50'
                    : 'bg-white border border-ink-100 shadow-sm'
                )}
              >
                {msg.role === 'agent' ? (
                  <>
                    <div className="prose prose-sm max-w-none prose-headings:font-display prose-p:text-ink-700 prose-strong:text-ink-800 prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1 prose-code:rounded prose-table:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {/* Report download button */}
                    {msg.is_report && (
                      <button
                        onClick={() => downloadReport(msg.content)}
                        className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <Download className="w-3 h-3" />
                        Download Report (.md)
                      </button>
                    )}

                    {/* Tool calls trace */}
                    {msg.tool_calls && msg.tool_calls.length > 0 && (
                      <ToolCallsTrace toolCalls={msg.tool_calls} />
                    )}

                    {/* Latency */}
                    {msg.latency_ms && (
                      <p className="text-[10px] text-ink-300 font-mono mt-2 pt-2 border-t border-ink-50">
                        {msg.latency_ms.toFixed(0)}ms
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
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
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white border border-ink-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse-soft" />
                    <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse-soft" style={{ animationDelay: '300ms' }} />
                    <span className="w-2 h-2 bg-purple-300 rounded-full animate-pulse-soft" style={{ animationDelay: '600ms' }} />
                  </div>
                  <span className="text-xs text-ink-400">Agent thinking & using tools...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-ink-100 bg-white/80 backdrop-blur-sm p-4">
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask the agent to search, summarize, compare, or generate a report..."
              rows={1}
              className="flex-1 resize-none bg-ink-50 border border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 placeholder:text-ink-300 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className={clsx(
                'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200',
                input.trim() && !loading
                  ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                  : 'bg-ink-100 text-ink-300 cursor-not-allowed'
              )}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
