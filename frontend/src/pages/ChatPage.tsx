import { useState } from 'react';
import { ChatWindow } from '../components/ChatWindow';
import { FileUploader } from '../components/FileUploader';
import { DocList } from '../components/DocList';
import { useChat } from '../hooks/useChat';
import { useDocuments } from '../hooks/useDocuments';

export function ChatPage() {
  const { messages, loading, send } = useChat();
  const { documents, uploading, upload, remove } = useDocuments();
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSend = (question: string) => {
    send(question, selectedDocIds.length > 0 ? selectedDocIds : undefined);
  };

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar — documents */}
      <div className="w-80 flex-shrink-0 border-r border-ink-100 bg-ink-50/50 flex flex-col">
        <div className="p-4 border-b border-ink-100">
          <h2 className="font-display text-lg text-ink-800 mb-3">Documents</h2>
          <FileUploader onUpload={upload} uploading={uploading} />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedDocIds.length > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-amber-600 font-medium">
                {selectedDocIds.length} selected — searching only these
              </span>
              <button
                onClick={() => setSelectedDocIds([])}
                className="text-xs text-ink-400 hover:text-ink-600"
              >
                Clear
              </button>
            </div>
          )}
          <DocList
            documents={documents}
            selectedIds={selectedDocIds}
            onToggleSelect={toggleSelect}
            onDelete={remove}
          />
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatWindow messages={messages} loading={loading} onSend={handleSend} />
      </div>
    </div>
  );
}
