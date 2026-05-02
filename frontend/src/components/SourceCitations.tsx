import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import type { SourceChunk } from '../types';

interface SourceCitationsProps {
  sources: SourceChunk[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-600 transition-colors"
      >
        <BookOpen className="w-3 h-3" />
        <span>{sources.length} source{sources.length !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {sources.map((source, i) => (
            <div
              key={source.chunk_id}
              className="bg-ink-50/80 rounded-lg p-2.5 border border-ink-100/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  #{i + 1}
                </span>
                <span className="text-[10px] text-ink-500 font-medium truncate">
                  {source.filename}
                </span>
                {source.page_number && (
                  <span className="text-[10px] text-ink-300">p.{source.page_number}</span>
                )}
                <span
                  className={clsx(
                    'ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded',
                    source.similarity_score > 0.8
                      ? 'text-emerald-600 bg-emerald-50'
                      : source.similarity_score > 0.6
                      ? 'text-amber-600 bg-amber-50'
                      : 'text-ink-400 bg-ink-100'
                  )}
                >
                  {(source.similarity_score * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-xs text-ink-500 leading-relaxed line-clamp-3">{source.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
