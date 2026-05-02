import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, FileText, GitCompare, Download, Wrench } from 'lucide-react';
import clsx from 'clsx';
import type { ToolCall } from '../types';

const TOOL_META: Record<string, { label: string; icon: typeof Search; color: string; bg: string }> = {
  search_documents: { label: 'Search Docs', icon: Search, color: 'text-blue-600', bg: 'bg-blue-50' },
  summarize_document: { label: 'Summarize', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
  compare_documents: { label: 'Compare', icon: GitCompare, color: 'text-amber-600', bg: 'bg-amber-50' },
  export_report: { label: 'Export Report', icon: Download, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

interface ToolCallsTraceProps {
  toolCalls: ToolCall[];
}

export function ToolCallsTrace({ toolCalls }: ToolCallsTraceProps) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCalls.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-ink-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors w-full"
      >
        <Wrench className="w-3 h-3" />
        <span className="font-medium">Agent used {toolCalls.length} tool{toolCalls.length !== 1 ? 's' : ''}</span>
        <div className="flex gap-1 ml-1">
          {toolCalls.map((tc, i) => {
            const meta = TOOL_META[tc.tool];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <span key={i} className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium', meta.bg, meta.color)}>
                {meta.label}
              </span>
            );
          })}
        </div>
        <span className="ml-auto">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 animate-fade-in">
          {toolCalls.map((tc, i) => {
            const meta = TOOL_META[tc.tool] || {
              label: tc.tool, icon: Wrench, color: 'text-ink-500', bg: 'bg-ink-50',
            };
            const Icon = meta.icon;
            return (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-ink-50/70">
                <div className={clsx('w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5', meta.bg)}>
                  <Icon className={clsx('w-3 h-3', meta.color)} />
                </div>
                <div className="min-w-0">
                  <span className={clsx('text-[10px] font-semibold uppercase tracking-wide', meta.color)}>
                    {meta.label}
                  </span>
                  <p className="text-xs text-ink-500 mt-0.5 truncate">{tc.input}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
