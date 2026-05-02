import { FileText, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { DocumentItem } from '../types';

interface DocListProps {
  documents: DocumentItem[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusConfig = {
  ready: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Ready' },
  processing: { icon: Loader2, color: 'text-amber-500', label: 'Processing' },
  failed: { icon: AlertCircle, color: 'text-red-400', label: 'Failed' },
};

export function DocList({ documents, selectedIds, onToggleSelect, onDelete }: DocListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-ink-400">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No documents yet. Upload one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc, i) => {
        const status = statusConfig[doc.status];
        const StatusIcon = status.icon;
        const isSelected = selectedIds.includes(doc.id);

        return (
          <div
            key={doc.id}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer animate-slide-up',
              isSelected
                ? 'bg-amber-400/10 border border-amber-400/30'
                : 'bg-white/60 border border-transparent hover:bg-white hover:border-ink-100'
            )}
            style={{ animationDelay: `${i * 50}ms` }}
            onClick={() => doc.status === 'ready' && onToggleSelect(doc.id)}
          >
            <div className="flex-shrink-0">
              <FileText className="w-5 h-5 text-ink-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-800 truncate">{doc.filename}</p>
              <p className="text-xs text-ink-400 mt-0.5">
                {formatSize(doc.file_size)} · {doc.total_chunks} chunks · {formatDate(doc.created_at)}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusIcon
                className={clsx(
                  'w-4 h-4',
                  status.color,
                  doc.status === 'processing' && 'animate-spin'
                )}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(doc.id);
                }}
                className="p-1.5 rounded-lg text-ink-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
